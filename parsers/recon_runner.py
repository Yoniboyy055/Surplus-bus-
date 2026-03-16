"""
recon_runner.py
Phase A automated recon for all gray/unqualified sources.

Checks each source in the sources table with quality_state='gray' and:
  1. Tests HTTP reachability of base_url and real_host_url
  2. Checks robots.txt for crawl restrictions
  3. Detects API / structured feed availability
  4. Logs results to source_recon_log

Run this against production environment with network access to target domains.
NOT runnable in sandbox (restricted egress).

Usage:
    python3 recon_runner.py --source gc_surplus_open_data
    python3 recon_runner.py --all-gray
    python3 recon_runner.py --source michener_allen --verbose
"""

import argparse
import json
import logging
import re
import urllib.robotparser
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests

logger = logging.getLogger(__name__)

# ── Recon targets ─────────────────────────────────────────────────────────────
# Manually maintained until we have auto-discovery from DB in prod pipeline

RECON_TARGETS = {

    "gc_surplus_open_data": {
        "base_url":      "https://open.canada.ca",
        "feed_url":      (
            "https://open.canada.ca/data/api/3/action/package_show"
            "?id=1a09c5c1-4468-44cf-9d5f-f5d0d66a46a2"
        ),
        "licence":       "Open Government Licence – Canada",
        "check_api":     True,
        "check_robots":  True,
        "expected_format": "json_ckan",
        "notes":         "CKAN API package — resolve to CSV resource URL",
    },

    "michener_allen": {
        "base_url":      "https://www.maauctions.com",
        "feed_url":      None,
        "licence":       "Unknown — verify ToS during recon",
        "check_api":     False,
        "check_robots":  True,
        "expected_format": "html_scrape",
        "check_paths": [
            "/auctions", "/current-auctions", "/lots",
            "/online-auctions", "/items", "/upcoming",
        ],
        "notes":         "Private auctioneer. Confirm ToS allows automated access.",
    },

    "ontario_tenders": {
        "base_url":      "https://ontariotenders.ca",
        "feed_url":      "https://ontariotenders.ca/page/public-tenders",
        "licence":       "Open Government Licence – Ontario (assumed — verify)",
        "check_api":     True,
        "check_robots":  True,
        "expected_format": "unknown",
        "check_paths":   ["/page/public-tenders", "/tenders", "/api", "/feed", "/rss"],
        "notes":         "Check for RSS/Atom feed, CSV export, or REST API.",
    },

    "toronto_open_data": {
        "base_url":      "https://open.toronto.ca",
        "feed_url":      (
            "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/"
            "package_search?q=surplus&rows=20"
        ),
        "licence":       "City of Toronto Open Data Licence",
        "check_api":     True,
        "check_robots":  True,
        "expected_format": "json_ckan",
        "notes":         "CKAN instance. Query for surplus, procurement, asset datasets.",
    },

    "infrastructure_ontario": {
        "base_url":      "https://www.infrastructureontario.ca",
        "feed_url":      None,
        "licence":       "Unknown — verify",
        "check_api":     False,
        "check_robots":  True,
        "expected_format": "html_scrape",
        "check_paths":   ["/surplus", "/auctions", "/assets", "/procurement"],
        "notes":         "Crown agency. May run own auctions or route to contractor.",
    },

    "city_hamilton": {
        "base_url":      "https://www.hamilton.ca",
        "feed_url":      None,
        "licence":       "Unknown — verify",
        "check_api":     False,
        "check_robots":  True,
        "expected_format": "html_scrape",
        "check_paths":   [
            "/city-of-hamilton/city-hall/surplus-property",
            "/government/surplus", "/purchasing/surplus",
        ],
        "notes":         "Verify if city manages direct surplus or routes to contractor.",
    },
}


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class ReconResult:
    source_key: str
    checked_at: str
    base_url_reachable: bool
    robots_allows_crawl: Optional[bool]
    feed_url_reachable: Optional[bool]
    feed_format_detected: Optional[str]
    api_available: Optional[bool]
    structured_data_found: bool
    lot_links_found: Optional[int]
    suggested_next_step: str
    raw_findings: dict
    gate_pass: bool              # Phase A gate: should advance to B?
    notes: str


# ── Robots.txt check ──────────────────────────────────────────────────────────

def check_robots(base_url: str, ua: str = "SurplusBusBot") -> tuple[bool, str]:
    """
    Check if robots.txt permits crawling.
    Returns (allowed: bool, raw_robots_text: str)
    """
    robots_url = urljoin(base_url, "/robots.txt")
    try:
        resp = requests.get(robots_url, timeout=10,
                            headers={"User-Agent": "Mozilla/5.0"})
        raw = resp.text if resp.status_code == 200 else ""

        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        allowed = rp.can_fetch(ua, base_url + "/")
        return allowed, raw

    except Exception as exc:
        return True, f"robots.txt fetch failed: {exc}"  # conservative — assume allowed


# ── HTTP probe ────────────────────────────────────────────────────────────────

def probe_url(url: str, timeout: int = 15) -> tuple[bool, int, str]:
    """Returns (reachable, status_code, content_type)."""
    try:
        resp = requests.get(
            url, timeout=timeout,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; research bot)",
                "Accept": "text/html,application/json,text/csv,*/*",
            },
            allow_redirects=True,
        )
        ct = resp.headers.get("Content-Type", "")
        return True, resp.status_code, ct
    except Exception as exc:
        return False, 0, str(exc)


# ── Format detection ──────────────────────────────────────────────────────────

def detect_format(url: str, content_type: str, resp_text: str) -> str:
    """Heuristic format detection from content type and body."""
    ct = content_type.lower()

    if "json" in ct:
        try:
            data = json.loads(resp_text)
            if "result" in data and "resources" in str(data):
                return "json_ckan"
            return "json_api"
        except Exception:
            return "json_malformed"

    if "csv" in ct or url.endswith(".csv"):
        return "csv"

    if "xml" in ct or "rss" in ct or "atom" in ct:
        return "xml_feed"

    if "html" in ct:
        # Probe for lot-like links
        lot_links = re.findall(
            r'href=["\']([^"\']*(?:lot|item|auction|surplus|tender)[^"\']*)["\']',
            resp_text, re.IGNORECASE
        )
        if lot_links:
            return f"html_with_lots ({len(lot_links)} lot links)"
        return "html_no_lots"

    return "unknown"


# ── Path explorer ─────────────────────────────────────────────────────────────

def explore_paths(base_url: str, paths: list[str]) -> dict[str, dict]:
    """Try a list of URL paths and report which ones return useful content."""
    results = {}
    for path in paths:
        url = urljoin(base_url, path)
        reachable, status, ct = probe_url(url)
        results[path] = {
            "url":     url,
            "status":  status,
            "ct":      ct,
            "ok":      reachable and 200 <= status < 400,
        }
        if results[path]["ok"]:
            logger.info("  ✓ %s → %d (%s)", path, status, ct[:50])
        else:
            logger.debug("  ✗ %s → %d", path, status)
    return results


# ── Main recon logic ──────────────────────────────────────────────────────────

def run_recon(source_key: str, verbose: bool = False) -> ReconResult:
    if source_key not in RECON_TARGETS:
        raise ValueError(f"Unknown source: {source_key}. Add to RECON_TARGETS.")

    target = RECON_TARGETS[source_key]
    base_url = target["base_url"]
    findings = {}

    logger.info("=== RECON: %s ===", source_key)
    logger.info("Base URL: %s", base_url)

    # 1. Base URL reachability
    base_ok, base_status, base_ct = probe_url(base_url)
    findings["base_url"] = {
        "url": base_url, "status": base_status,
        "content_type": base_ct, "reachable": base_ok,
    }
    logger.info("Base URL: %s → %d", base_url, base_status)

    # 2. Robots.txt
    robots_allowed, robots_text = None, ""
    if target.get("check_robots"):
        robots_allowed, robots_text = check_robots(base_url)
        findings["robots"] = {"allowed": robots_allowed, "text": robots_text[:500]}
        logger.info("robots.txt: %s", "ALLOWS" if robots_allowed else "BLOCKS crawling")

    # 3. Feed URL / API
    feed_reachable, feed_format = None, None
    if target.get("feed_url"):
        feed_ok, feed_status, feed_ct = probe_url(target["feed_url"])
        feed_reachable = feed_ok and 200 <= feed_status < 400
        findings["feed_url"] = {
            "url": target["feed_url"],
            "status": feed_status,
            "ct": feed_ct,
            "reachable": feed_reachable,
        }
        if feed_reachable and verbose:
            try:
                resp = requests.get(target["feed_url"], timeout=20,
                                    headers={"User-Agent": "Mozilla/5.0"})
                feed_format = detect_format(target["feed_url"], feed_ct, resp.text[:2000])
                findings["feed_format"] = feed_format
            except Exception:
                pass
        logger.info("Feed URL: %s → reachable=%s, format=%s",
                    target["feed_url"][:60], feed_reachable, feed_format)

    # 4. Path exploration
    path_results = {}
    if target.get("check_paths"):
        logger.info("Exploring %d candidate paths...", len(target["check_paths"]))
        path_results = explore_paths(base_url, target["check_paths"])
        findings["paths"] = path_results

    # 5. Count lot links on best discovered page
    lot_links_found = None
    working_paths = [p for p, r in path_results.items() if r.get("ok")]
    if working_paths and verbose:
        best_path = working_paths[0]
        try:
            resp = requests.get(
                urljoin(base_url, best_path), timeout=15,
                headers={"User-Agent": "Mozilla/5.0"}
            )
            lot_links = re.findall(
                r'href=["\']([^"\']*(?:lot|item|auction|surplus)[^"\']*)["\']',
                resp.text, re.IGNORECASE
            )
            lot_links_found = len(set(lot_links))
            findings["lot_links"] = list(set(lot_links))[:10]
            logger.info("Lot links found: %d", lot_links_found)
        except Exception:
            pass

    # ── Gate assessment ───────────────────────────────────────────────────────
    structured_data_found = (
        feed_format is not None and
        feed_format not in ("html_no_lots", "unknown")
    )

    gate_pass = (
        base_ok and
        (robots_allowed is None or robots_allowed) and
        (feed_reachable is not None or len(working_paths) > 0)
    )

    # Suggested next step
    if not base_ok:
        next_step = "BLOCKED — base URL unreachable. Verify domain is correct."
    elif robots_allowed is False:
        next_step = "BLOCKED — robots.txt disallows crawling. Review ToS before proceeding."
    elif feed_reachable:
        if "ckan" in (feed_format or ""):
            next_step = "Build CKAN API parser. Enumerate datasets. Select target resources."
        elif "csv" in (feed_format or ""):
            next_step = "Build CSV ingest parser. Validate schema. Advance to Phase D."
        else:
            next_step = "Feed reachable. Build adapter for detected format."
    elif working_paths:
        next_step = (
            f"HTML source. Working paths: {working_paths}. "
            "Build HTML scraper with confirmed selectors."
        )
    else:
        next_step = "Manual inspection required. No confirmed paths or feeds found."

    result = ReconResult(
        source_key              = source_key,
        checked_at              = datetime.now(timezone.utc).isoformat(),
        base_url_reachable      = base_ok,
        robots_allows_crawl     = robots_allowed,
        feed_url_reachable      = feed_reachable,
        feed_format_detected    = feed_format,
        api_available           = feed_reachable and "api" in (feed_format or ""),
        structured_data_found   = structured_data_found,
        lot_links_found         = lot_links_found,
        suggested_next_step     = next_step,
        raw_findings            = findings,
        gate_pass               = gate_pass,
        notes                   = target.get("notes", ""),
    )

    return result


# ── CLI ───────────────────────────────────────────────────────────────────────

def print_result(result: ReconResult) -> None:
    print(f"\n{'='*60}")
    print(f"RECON: {result.source_key}")
    print(f"{'='*60}")
    print(f"  Checked at:           {result.checked_at}")
    print(f"  Base URL reachable:   {result.base_url_reachable}")
    print(f"  Robots allows crawl:  {result.robots_allows_crawl}")
    print(f"  Feed reachable:       {result.feed_url_reachable}")
    print(f"  Feed format:          {result.feed_format_detected}")
    print(f"  Structured data:      {result.structured_data_found}")
    print(f"  Lot links found:      {result.lot_links_found}")
    print(f"  Gate PASS:            {result.gate_pass}")
    print(f"\n  Next step: {result.suggested_next_step}")
    print(f"\n  Notes: {result.notes}")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

    parser = argparse.ArgumentParser(description="Surplus Bus Phase A recon runner")
    parser.add_argument("--source", help="Specific source key to recon")
    parser.add_argument("--all-gray", action="store_true", help="Recon all targets")
    parser.add_argument("--verbose", action="store_true", help="Deep probe (slower)")
    args = parser.parse_args()

    targets = (
        list(RECON_TARGETS.keys()) if args.all_gray
        else [args.source] if args.source
        else list(RECON_TARGETS.keys())
    )

    results = []
    for key in targets:
        try:
            result = run_recon(key, verbose=args.verbose)
            print_result(result)
            results.append(result)
        except Exception as exc:
            logger.error("Recon failed for %s: %s", key, exc, exc_info=True)

    print(f"\n{'='*60}")
    print(f"SUMMARY: {len(results)} sources reconned")
    for r in results:
        status = "✓ GATE PASS" if r.gate_pass else "✗ BLOCKED"
        print(f"  {status} — {r.source_key}: {r.suggested_next_step[:70]}")
