#!/usr/bin/env python3
"""
recon_runner.py — Phase A recon checker for Surplus Bus sources.

Verifies that a source is reachable, crawlable, and has parseable structure
before any parser is built.

Usage:
  python3 recon_runner.py --all-gray
  python3 recon_runner.py --all-gray --verbose
  python3 recon_runner.py --source gc_surplus_open_data
  python3 recon_runner.py --source gc_surplus_open_data --verbose

Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars.
Deps:     pip install requests beautifulsoup4 supabase
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Hard-coded source overrides for gray sources not yet fully seeded in DB.
# These provide real_host_url, feed_url, candidate_paths, and expected_format
# that may not be on the sources row yet.
# keyed by parser_key.
# ---------------------------------------------------------------------------
SOURCE_OVERRIDES: dict[str, dict[str, Any]] = {
    "gc_surplus_open_data": {
        "real_host_url": "https://open.canada.ca",
        "feed_url": "https://open.canada.ca/data/api/3/action/package_show?id=1a09c5c1-3554-4b70-9e53-6322a72ec7d4",
        "expected_format": "JSON CKAN API",
        "candidate_paths": [],
    },
    "city_calgary_surplus": {
        "real_host_url": "https://www.maauctions.com",
        "expected_format": "HTML scrape",
        "candidate_paths": [
            "/auctions",
            "/current-auctions",
            "/lots",
            "/online-auctions",
            "/upcoming",
        ],
    },
    "city_edmonton_surplus": {
        "real_host_url": "https://www.maauctions.com",
        "expected_format": "HTML scrape",
        "candidate_paths": [
            "/auctions",
            "/current-auctions",
            "/lots",
            "/online-auctions",
            "/upcoming",
        ],
    },
    "ontario_tenders": {
        "real_host_url": "https://ontariotenders.ca",
        "feed_url": "https://ontariotenders.ca/page/public-tenders",
        "expected_format": "unknown",
        "candidate_paths": [],
    },
    "toronto_open_data": {
        "real_host_url": "https://open.toronto.ca",
        "feed_url": "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_search?q=surplus&rows=20",
        "expected_format": "JSON CKAN API",
        "candidate_paths": [],
    },
    "infrastructure_ontario_surplus": {
        "real_host_url": "https://www.infrastructureontario.ca",
        "expected_format": "HTML",
        "candidate_paths": ["/surplus", "/auctions", "/assets", "/procurement"],
    },
    "city_hamilton_surplus": {
        "real_host_url": "https://www.hamilton.ca",
        "expected_format": "HTML",
        "candidate_paths": [
            "/city-of-hamilton/city-hall/surplus-property",
        ],
    },
}

USER_AGENT = "SurplusBusReconBot/1.0 (+https://surplusbus.ca)"

# Default candidate paths tried for HTML sources with no specific overrides
DEFAULT_CANDIDATE_PATHS = [
    "/auctions",
    "/lots",
    "/surplus",
    "/tenders",
    "/procurement",
]

REQUEST_TIMEOUT = 15  # seconds


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

def get_supabase_client():
    """Return an authenticated Supabase client using env vars."""
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.", file=sys.stderr)
        sys.exit(1)
    return create_client(url, key)


def fetch_gray_sources(supabase) -> list[dict]:
    """Fetch all sources where quality_state = 'gray'."""
    resp = (
        supabase.table("sources")
        .select("id, name, parser_key, base_url, feed_url, real_host_url, quality_state")
        .eq("quality_state", "gray")
        .execute()
    )
    return resp.data or []


def fetch_source_by_key(supabase, parser_key: str) -> dict | None:
    """Fetch a single source by parser_key."""
    resp = (
        supabase.table("sources")
        .select("id, name, parser_key, base_url, feed_url, real_host_url, quality_state")
        .eq("parser_key", parser_key)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return rows[0] if rows else None


def write_recon_log(supabase, entry: dict):
    """Insert a row into source_recon_log."""
    supabase.table("source_recon_log").insert(entry).execute()


# ---------------------------------------------------------------------------
# Probe helpers
# ---------------------------------------------------------------------------

def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT})
    return s


def probe_http(url: str, session: requests.Session) -> dict:
    """HEAD-then-GET probe. Returns {reachable, status_code, final_url, error}."""
    result: dict[str, Any] = {
        "reachable": False,
        "status_code": None,
        "final_url": None,
        "error": None,
    }
    try:
        r = session.head(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        result["status_code"] = r.status_code
        result["final_url"] = r.url
        result["reachable"] = r.status_code < 500
    except requests.RequestException as exc:
        # Fallback to GET (some servers reject HEAD)
        try:
            r = session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            result["status_code"] = r.status_code
            result["final_url"] = r.url
            result["reachable"] = r.status_code < 500
        except requests.RequestException as exc2:
            result["error"] = str(exc2)
    return result


def fetch_robots_txt(base_url: str, session: requests.Session) -> dict:
    """Fetch robots.txt and check whether our user agent is allowed to crawl."""
    parsed = urlparse(base_url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    result: dict[str, Any] = {
        "robots_url": robots_url,
        "found": False,
        "crawl_allowed": True,  # default: allowed unless explicitly blocked
        "raw_snippet": None,
    }
    try:
        r = session.get(robots_url, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            result["found"] = True
            text = r.text[:4000]
            result["raw_snippet"] = text[:500]
            lower = text.lower()
            # Simple robots.txt parse: look for Disallow: / under our UA or *
            blocked = False
            in_relevant_block = False
            for line in lower.splitlines():
                line = line.strip()
                if line.startswith("user-agent:"):
                    ua_value = line.split(":", 1)[1].strip()
                    in_relevant_block = ua_value == "*" or "surplusbus" in ua_value
                elif in_relevant_block and line.startswith("disallow:"):
                    path = line.split(":", 1)[1].strip()
                    if path == "/":
                        blocked = True
                        break
            result["crawl_allowed"] = not blocked
    except requests.RequestException:
        pass
    return result


def detect_feed_format(url: str, session: requests.Session, verbose: bool = False) -> dict:
    """Probe a feed_url and detect its format."""
    result: dict[str, Any] = {
        "url": url,
        "reachable": False,
        "format": "unknown",
        "status_code": None,
        "error": None,
        "sample": None,
    }
    try:
        r = session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        result["status_code"] = r.status_code
        result["reachable"] = r.status_code < 400
        if not result["reachable"]:
            return result

        content_type = r.headers.get("Content-Type", "").lower()
        body = r.text[:8000]

        # JSON / CKAN API
        if "json" in content_type or body.lstrip().startswith("{") or body.lstrip().startswith("["):
            try:
                data = r.json()
                if isinstance(data, dict) and ("result" in data or "results" in data):
                    result["format"] = "JSON CKAN API"
                else:
                    result["format"] = "JSON"
                if verbose:
                    result["sample"] = json.dumps(data, indent=2)[:2000]
            except (json.JSONDecodeError, ValueError):
                result["format"] = "JSON (malformed)"

        # CSV
        elif "csv" in content_type or url.endswith(".csv"):
            result["format"] = "CSV direct download"
            if verbose:
                result["sample"] = body[:1000]

        # XML / RSS / Atom
        elif "xml" in content_type or body.lstrip().startswith("<?xml") or "<rss" in body[:500].lower() or "<feed" in body[:500].lower():
            if "<rss" in body[:1000].lower():
                result["format"] = "RSS feed"
            elif "<feed" in body[:1000].lower():
                result["format"] = "Atom feed"
            else:
                result["format"] = "XML"
            if verbose:
                result["sample"] = body[:1000]

        # HTML
        elif "html" in content_type or "<html" in body[:500].lower():
            result["format"] = _classify_html(body, verbose)
            if verbose:
                result["sample"] = body[:1500]

        else:
            result["format"] = f"unknown (content-type: {content_type})"

    except requests.RequestException as exc:
        result["error"] = str(exc)
    return result


def _classify_html(html: str, verbose: bool = False) -> str:
    """Classify HTML as having lot-like links or not."""
    soup = BeautifulSoup(html, "html.parser")
    links = soup.find_all("a", href=True)
    lot_keywords = re.compile(r"lot|item|auction|surplus|asset|bid|sale|tender|listing", re.I)
    lot_links = [a for a in links if lot_keywords.search(a.get_text()) or lot_keywords.search(a["href"])]
    if len(lot_links) >= 3:
        return f"HTML with lot-like links ({len(lot_links)} found)"
    return "HTML without useful structure"


def probe_candidate_paths(
    base_url: str,
    paths: list[str],
    session: requests.Session,
    verbose: bool = False,
) -> list[dict]:
    """Try candidate paths against base_url, report which return 200."""
    results = []
    for path in paths:
        full = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
        entry: dict[str, Any] = {"path": path, "url": full, "status": None, "ok": False, "detail": None}
        try:
            r = session.get(full, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            entry["status"] = r.status_code
            entry["ok"] = r.status_code == 200
            if verbose and r.status_code == 200:
                entry["detail"] = _classify_html(r.text[:8000], verbose)
        except requests.RequestException as exc:
            entry["detail"] = str(exc)
        results.append(entry)
    return results


def count_lot_links(html: str) -> int:
    """Count <a> tags whose text or href matches lot-like keywords."""
    soup = BeautifulSoup(html, "html.parser")
    links = soup.find_all("a", href=True)
    lot_keywords = re.compile(r"lot|item|auction|surplus|asset|bid|sale|tender|listing", re.I)
    return sum(1 for a in links if lot_keywords.search(a.get_text()) or lot_keywords.search(a["href"]))


# ---------------------------------------------------------------------------
# Main recon logic per source
# ---------------------------------------------------------------------------

def recon_source(source: dict, session: requests.Session, verbose: bool = False) -> dict:
    """Run full Phase A recon on a single source row. Returns a result dict."""
    pk = source["parser_key"]
    overrides = SOURCE_OVERRIDES.get(pk, {})

    real_host = overrides.get("real_host_url") or source.get("real_host_url") or source.get("base_url", "")
    feed_url = overrides.get("feed_url") or source.get("feed_url")
    candidate_paths = overrides.get("candidate_paths", DEFAULT_CANDIDATE_PATHS)
    expected_format = overrides.get("expected_format", "unknown")

    print(f"\n{'='*70}")
    print(f"  SOURCE: {source.get('name', pk)}  [{pk}]")
    print(f"  Host:   {real_host}")
    if feed_url:
        print(f"  Feed:   {feed_url}")
    print(f"{'='*70}")

    notes_parts: list[str] = []
    real_host_discovered: str | None = None

    # --- 1. HTTP probe ---
    print("\n  [1] HTTP Probe ...")
    host_probe = probe_http(real_host, session)
    status_icon = "OK" if host_probe["reachable"] else "FAIL"
    print(f"      Reachable: {host_probe['reachable']}  (HTTP {host_probe['status_code']})  [{status_icon}]")
    if host_probe["final_url"] and host_probe["final_url"] != real_host:
        real_host_discovered = host_probe["final_url"]
        print(f"      Redirected to: {real_host_discovered}")
        notes_parts.append(f"Redirect → {real_host_discovered}")

    # --- 2. robots.txt ---
    print("\n  [2] robots.txt ...")
    robots = fetch_robots_txt(real_host, session)
    if robots["found"]:
        crawl_icon = "ALLOWED" if robots["crawl_allowed"] else "BLOCKED"
        print(f"      Found: yes | Crawl allowed: {robots['crawl_allowed']}  [{crawl_icon}]")
        if verbose and robots["raw_snippet"]:
            for line in robots["raw_snippet"].splitlines()[:8]:
                print(f"        | {line}")
        if not robots["crawl_allowed"]:
            notes_parts.append("robots.txt blocks crawling")
    else:
        print("      Not found (crawling assumed allowed)")

    # --- 3. Feed probe ---
    feed_result: dict[str, Any] | None = None
    if feed_url:
        print(f"\n  [3] Feed probe: {feed_url}")
        feed_result = detect_feed_format(feed_url, session, verbose)
        fmt_icon = "OK" if feed_result["reachable"] else "FAIL"
        print(f"      Reachable: {feed_result['reachable']}  (HTTP {feed_result['status_code']})  [{fmt_icon}]")
        print(f"      Detected format: {feed_result['format']}")
        if verbose and feed_result.get("sample"):
            for line in feed_result["sample"].splitlines()[:10]:
                print(f"        | {line}")
        notes_parts.append(f"Feed format: {feed_result['format']}")
    else:
        print("\n  [3] No feed_url — skipping feed probe")

    # --- 4. Candidate paths ---
    path_hits: list[dict] = []
    if candidate_paths:
        print(f"\n  [4] Candidate paths on {real_host} ...")
        path_hits = probe_candidate_paths(real_host, candidate_paths, session, verbose)
        for p in path_hits:
            icon = "200" if p["ok"] else str(p["status"] or "ERR")
            detail_str = f"  → {p['detail']}" if p.get("detail") else ""
            print(f"      {p['path']:40s}  [{icon}]{detail_str}")
        ok_paths = [p["path"] for p in path_hits if p["ok"]]
        if ok_paths:
            notes_parts.append(f"Paths OK: {', '.join(ok_paths)}")
        else:
            notes_parts.append("No candidate paths returned 200")
    else:
        print("\n  [4] No candidate paths to probe")

    # --- 5. Verbose deep probe ---
    lot_count = 0
    if verbose and host_probe["reachable"]:
        print("\n  [5] Verbose deep probe ...")
        try:
            r = session.get(real_host, timeout=REQUEST_TIMEOUT)
            lot_count = count_lot_links(r.text)
            print(f"      Lot-like <a> tags on homepage: {lot_count}")
            if lot_count > 0:
                soup = BeautifulSoup(r.text[:16000], "html.parser")
                lot_kw = re.compile(r"lot|item|auction|surplus|asset|bid|sale|tender|listing", re.I)
                samples = [
                    a.get_text(strip=True)[:80]
                    for a in soup.find_all("a", href=True)
                    if lot_kw.search(a.get_text()) or lot_kw.search(a["href"])
                ][:5]
                for s in samples:
                    print(f"        • {s}")
        except requests.RequestException as exc:
            print(f"      Deep probe error: {exc}")

    # --- Determine gate pass ---
    reachable = host_probe["reachable"]
    crawl_ok = robots["crawl_allowed"]
    feed_ok = feed_result["reachable"] if feed_result else True  # no feed = not blocking
    has_structure = False
    if feed_result and feed_result["format"] not in ("unknown", "HTML without useful structure"):
        has_structure = True
    if any(p["ok"] for p in path_hits):
        has_structure = True
    if lot_count >= 3:
        has_structure = True

    gate_passed = reachable and crawl_ok and (has_structure or feed_ok)

    gate_icon = "PASS" if gate_passed else "FAIL"
    print(f"\n  ── Gate verdict: [{gate_icon}] ──")
    if not reachable:
        print("     Reason: host unreachable")
    if not crawl_ok:
        print("     Reason: robots.txt blocks crawling")
    if not has_structure and not feed_ok:
        print("     Reason: no parseable structure detected")

    notes = "; ".join(notes_parts) if notes_parts else "No findings"

    return {
        "source_id": source["id"],
        "parser_key": pk,
        "name": source.get("name", pk),
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "checked_by": "recon_runner.py",
        "real_listings_found": has_structure,
        "stable_external_id": False,   # cannot determine in recon phase
        "core_fields_present": False,   # cannot determine in recon phase
        "dedup_verified": False,        # cannot determine in recon phase
        "terminal_state_plan": False,   # cannot determine in recon phase
        "consecutive_runs_ok": 0,
        "gate_passed": gate_passed,
        "notes": notes,
        "real_host_discovered": real_host_discovered,
        # Extra data kept for the summary table
        "_reachable": reachable,
        "_crawl_allowed": crawl_ok,
        "_feed_format": feed_result["format"] if feed_result else None,
        "_http_status": host_probe["status_code"],
        "_ok_paths": [p["path"] for p in path_hits if p["ok"]],
    }


# ---------------------------------------------------------------------------
# Summary printer
# ---------------------------------------------------------------------------

def print_summary(results: list[dict]):
    """Print a final pass/fail summary table."""
    print("\n")
    print("=" * 90)
    print("  RECON SUMMARY")
    print("=" * 90)
    hdr = f"  {'Source':<35s} {'Reach':>5s} {'Robot':>5s} {'Feed':>18s} {'Struct':>6s} {'Gate':>6s}  Next Step"
    print(hdr)
    print("  " + "-" * 86)
    for r in results:
        reach = "yes" if r["_reachable"] else "NO"
        robot = "ok" if r["_crawl_allowed"] else "BLOCK"
        feed = (r["_feed_format"] or "—")[:18]
        struct = "yes" if r["real_listings_found"] else "no"
        gate = "PASS" if r["gate_passed"] else "FAIL"
        if r["gate_passed"]:
            next_step = "Build parser"
        elif not r["_reachable"]:
            next_step = "Verify URL / retry later"
        elif not r["_crawl_allowed"]:
            next_step = "Review ToS / manual audit"
        else:
            next_step = "Deep manual inspection"
        print(f"  {r['name']:<35s} {reach:>5s} {robot:>5s} {feed:>18s} {struct:>6s} {gate:>6s}  {next_step}")
    print("=" * 90)
    passed = sum(1 for r in results if r["gate_passed"])
    print(f"  Total: {len(results)}  |  Passed: {passed}  |  Failed: {len(results) - passed}")
    print()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Phase A recon checker for Surplus Bus sources.",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all-gray", action="store_true", help="Recon all sources where quality_state='gray'")
    group.add_argument("--source", type=str, help="Recon a single source by parser_key")
    parser.add_argument("--verbose", action="store_true", help="Deeper probe: follow links, count lot-like hrefs, print sample HTML")
    parser.add_argument("--dry-run", action="store_true", help="Skip writing results to Supabase")
    args = parser.parse_args()

    supabase = get_supabase_client()
    session = _session()

    # Resolve source list
    sources: list[dict] = []
    if args.all_gray:
        sources = fetch_gray_sources(supabase)
        if not sources:
            print("No sources with quality_state='gray' found.")
            sys.exit(0)
        print(f"Found {len(sources)} gray source(s) to recon.\n")
    else:
        src = fetch_source_by_key(supabase, args.source)
        if not src:
            print(f"Source with parser_key='{args.source}' not found.", file=sys.stderr)
            sys.exit(1)
        sources = [src]

    # Run recon
    results: list[dict] = []
    for source in sources:
        result = recon_source(source, session, verbose=args.verbose)
        results.append(result)

        # Write to Supabase
        if not args.dry_run:
            log_entry = {
                "source_id": result["source_id"],
                "phase": "A_recon",
                "sandbox_mode": True,
                "checked_at": result["checked_at"],
                "checked_by": result["checked_by"],
                "real_listings_found": result["real_listings_found"],
                "stable_external_id": result["stable_external_id"],
                "core_fields_present": result["core_fields_present"],
                "dedup_verified": result["dedup_verified"],
                "terminal_state_plan": result["terminal_state_plan"],
                "consecutive_runs_ok": result["consecutive_runs_ok"],
                "gate_passed": result["gate_passed"],
                "notes": result["notes"],
                "real_host_discovered": result["real_host_discovered"],
            }
            try:
                write_recon_log(supabase, log_entry)
                print(f"  → Logged to source_recon_log")
            except Exception as exc:
                print(f"  ⚠ Failed to write recon log: {exc}", file=sys.stderr)
        else:
            print(f"  → Dry run — skipped DB write")

    # Final summary
    print_summary(results)


if __name__ == "__main__":
    main()
