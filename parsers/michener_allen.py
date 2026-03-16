"""
Parser: michener_allen
Platform: maauctions.com (Michener Allen Auctioneering Ltd.)
Covers sources:
  - city_edmonton_surplus  (CA-AB)
  - city_calgary_surplus   (CA-AB)
Role: transaction (live auction listings + terminal capture)
Login required to bid: YES. To browse: NO.

Legal note:
  maauctions.com is a private Canadian auctioneer — NOT a US commercial
  marketplace. ToS must be verified during Phase A recon before this parser
  is enabled. Check robots.txt at https://www.maauctions.com/robots.txt.
  If no automated access restriction exists, proceed to Phase D.

Recon checklist (Phase A — must complete before enabling):
  [ ] Confirm robots.txt allows crawling of listing pages
  [ ] Confirm no ToS clause prohibiting automated data collection
  [ ] Map actual URL structure for active auction listings
  [ ] Identify stable lot ID pattern (e.g. lot-NNNN or item/NNNN)
  [ ] Confirm which fields are visible without login
  [ ] Identify Edmonton vs Calgary seller tagging in listings
  [ ] Confirm category taxonomy
  [ ] Identify terminal signals (sold/closed status, removal, price update)

Phase D qualification gates:
  [1] real_listings_found
  [2] stable_external_id
  [3] core_fields_present
  [4] dedup_verified
  [5] terminal_state_plan

Architecture note:
  A single Michener Allen parser activates BOTH Edmonton and Calgary sources.
  Seller tagging in listings (or URL path) should identify which city.
  Both city source_ids should be mapped in SOURCE_ID_MAP below.
"""

import hashlib
import logging
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_URL = "https://www.maauctions.com"

# TO BE CONFIRMED DURING RECON — placeholder structure
# Real URL paths must be verified against live site during Phase A
LISTINGS_PATH_CANDIDATES = [
    "/auctions",
    "/current-auctions",
    "/lots",
    "/online-auctions",
]

# Seller → source mapping
# These names must be confirmed against actual listing text during recon
SELLER_SOURCE_MAP = {
    # seller name fragment → parser_key
    "city of edmonton":  "city_edmonton_surplus",
    "edmonton":          "city_edmonton_surplus",
    "city of calgary":   "city_calgary_surplus",
    "calgary":           "city_calgary_surplus",
}

# Categories relevant to surplus intelligence
# Expand during recon based on actual Michener Allen category taxonomy
GOVERNMENT_CATEGORIES = {
    "vehicles", "trucks", "fleet", "equipment", "heavy equipment",
    "tools", "furniture", "office", "electronics", "computers",
    "police", "seized", "forfeiture", "lost and found", "unclaimed",
    "industrial", "machinery",
}

CURRENCY = "CAD"

# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class MichenerListing:
    """Raw listing as scraped from maauctions.com."""
    external_lot_id: str
    title: str
    description: Optional[str]
    category: Optional[str]
    location_text: Optional[str]        # city/province
    condition_text: Optional[str]
    current_price: Optional[float]
    buy_now_price: Optional[float]
    bid_count: Optional[int]
    closes_at: Optional[datetime]
    status: str                         # "active" | "closed" | "sold"
    listing_url: str
    seller_name: Optional[str]
    raw_html_fragment: str = field(default="", repr=False)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean_price(raw: Optional[str]) -> Optional[float]:
    if not raw:
        return None
    cleaned = re.sub(r"[^\d.]", "", raw.replace(",", ""))
    try:
        val = float(cleaned)
        return val if val > 0 else None
    except ValueError:
        return None


def _clean_int(raw: Optional[str]) -> Optional[int]:
    if not raw:
        return None
    try:
        return int(re.sub(r"[^\d]", "", raw))
    except ValueError:
        return None


def _parse_closes_at(raw: Optional[str]) -> Optional[datetime]:
    if not raw:
        return None
    formats = [
        "%B %d, %Y %I:%M %p",
        "%b %d, %Y %I:%M %p",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %I:%M %p",
        "%d/%m/%Y",
        "%Y-%m-%d",
    ]
    cleaned = raw.strip()
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    logger.debug("Could not parse closes_at: %r", raw)
    return None


def _identify_source(seller_name: Optional[str], listing_url: str) -> str:
    """
    Map a listing to its city source (Edmonton or Calgary).
    Defaults to city_edmonton_surplus if ambiguous.
    """
    if not seller_name:
        return "city_edmonton_surplus"
    seller_lower = seller_name.lower()
    for fragment, parser_key in SELLER_SOURCE_MAP.items():
        if fragment in seller_lower:
            return parser_key
    return "city_edmonton_surplus"  # default — revisit during recon


def _make_canonical_key(external_lot_id: str) -> str:
    return f"michener_allen:{external_lot_id.strip()}"


# ── HTTP layer ────────────────────────────────────────────────────────────────

def _get(url: str, session: requests.Session, timeout: int = 20) -> requests.Response:
    """
    Fetch a page with browser-like headers.
    Michener Allen may check UA — use realistic headers.
    """
    resp = session.get(
        url,
        timeout=timeout,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
            "Accept-Language": "en-CA,en;q=0.9",
        }
    )
    resp.raise_for_status()
    return resp


# ── Discovery ─────────────────────────────────────────────────────────────────

def discover_listings_url(session: requests.Session) -> str:
    """
    Phase A recon step: find the real active listings URL.
    Try candidate paths until one returns auction listings HTML.

    RECON TODO: Replace this with the confirmed URL after manual inspection.
    """
    for path in LISTINGS_PATH_CANDIDATES:
        url = urljoin(BASE_URL, path)
        try:
            resp = _get(url, session)
            # Heuristic: if we get listing cards / lot links, this is correct
            if re.search(r"lot|auction|bid", resp.text, re.IGNORECASE):
                logger.info("Listings URL confirmed: %s", url)
                return url
        except Exception as exc:  # pylint: disable=broad-except
            logger.debug("Candidate %s failed: %s", url, exc)
            continue

    raise RuntimeError(
        "Could not discover active listings URL. "
        "Phase A recon required — inspect maauctions.com manually."
    )


# ── Parsing ───────────────────────────────────────────────────────────────────

def parse_listing_card(card_el, base_url: str) -> Optional[MichenerListing]:
    """
    Parse a single lot/listing card element from the listings page.

    RECON TODO: These selectors are PLACEHOLDERS.
    After manual inspection of maauctions.com HTML structure,
    replace with correct CSS selectors or XPath patterns.

    Common patterns for Canadian auction sites:
      - Lot ID in URL: /lot/12345 or /item/12345
      - Title in <h3> or <h2> with class 'lot-title'
      - Price in .current-bid or .price
      - Closes at in .close-date or [data-closes]
    """
    try:
        # ── PLACEHOLDER SELECTORS — must be verified during recon ──
        # Lot ID from URL
        link = card_el.select_one("a[href*='lot'], a[href*='item'], a[href*='auction']")
        if not link:
            return None

        lot_url = urljoin(base_url, link.get("href", ""))
        lot_id_match = re.search(r"/(lot|item|auction)[s]?[/-]?(\d+)", lot_url, re.IGNORECASE)
        if not lot_id_match:
            return None
        external_lot_id = lot_id_match.group(2)

        # Title
        title_el = (
            card_el.select_one(".lot-title") or
            card_el.select_one("h3") or
            card_el.select_one("h2") or
            link
        )
        title = title_el.get_text(strip=True) if title_el else ""
        if not title:
            return None

        # Price
        price_el = card_el.select_one(".current-bid, .bid-amount, .price, [class*='price']")
        current_price = _clean_price(price_el.get_text() if price_el else None)

        # Bid count
        bid_el = card_el.select_one(".bid-count, [class*='bids']")
        bid_count = _clean_int(bid_el.get_text() if bid_el else None)

        # Close date
        date_el = card_el.select_one(".close-date, [data-closes], [class*='close']")
        closes_at = _parse_closes_at(
            date_el.get("data-closes") or
            (date_el.get_text() if date_el else None)
        )

        # Seller / location
        seller_el = card_el.select_one(".seller, .location, [class*='seller']")
        seller_name = seller_el.get_text(strip=True) if seller_el else None

        # Status — infer from UI state
        status = "active"
        status_el = card_el.select_one(".status, .lot-status, [class*='status']")
        if status_el:
            status_text = status_el.get_text(strip=True).lower()
            if "sold" in status_text or "closed" in status_text:
                status = "sold"
            elif "ended" in status_text:
                status = "closed"

        return MichenerListing(
            external_lot_id = external_lot_id,
            title           = title,
            description     = None,    # fetch from detail page if needed
            category        = None,    # may be on detail page
            location_text   = seller_name,
            condition_text  = None,
            current_price   = current_price,
            buy_now_price   = None,
            bid_count       = bid_count,
            closes_at       = closes_at,
            status          = status,
            listing_url     = lot_url,
            seller_name     = seller_name,
            raw_html_fragment = str(card_el)[:500],
        )

    except Exception as exc:  # pylint: disable=broad-except
        logger.debug("parse_listing_card error: %s", exc)
        return None


def scrape_listings_page(url: str, session: requests.Session) -> list[MichenerListing]:
    """
    Scrape the main listings index page.
    Returns all parseable lot cards found.

    RECON TODO: The container selector ('.lot-card', '.auction-item', etc.)
    must be confirmed during Phase A manual inspection.
    """
    resp = _get(url, session)
    soup = BeautifulSoup(resp.text, "html.parser")

    # PLACEHOLDER container selectors — verify during recon
    card_selectors = [
        ".lot-card", ".auction-item", ".listing-item",
        "[class*='lot']", "[class*='auction-item']",
        "article", ".item-card",
    ]

    cards = []
    for selector in card_selectors:
        cards = soup.select(selector)
        if cards:
            logger.info("Found %d lot cards with selector %r", len(cards), selector)
            break

    if not cards:
        logger.warning(
            "No lot cards found at %s. "
            "HTML structure may have changed — recon required.", url
        )
        return []

    listings = []
    for card in cards:
        listing = parse_listing_card(card, BASE_URL)
        if listing:
            listings.append(listing)

    logger.info("Parsed %d listings from %s", len(listings), url)
    return listings


# ── Pagination ────────────────────────────────────────────────────────────────

def scrape_all_pages(base_listings_url: str, session: requests.Session,
                     max_pages: int = 50) -> list[MichenerListing]:
    """
    Paginate through all listings pages.

    RECON TODO: Confirm pagination pattern.
    Common patterns: ?page=2, /page/2, ?p=2
    """
    all_listings: list[MichenerListing] = []
    seen_ids: set[str] = set()
    page = 1

    while page <= max_pages:
        # Try query param pagination first — verify during recon
        url = f"{base_listings_url}?page={page}" if page > 1 else base_listings_url

        listings = scrape_listings_page(url, session)
        if not listings:
            logger.info("No listings on page %d — pagination complete.", page)
            break

        new = 0
        for listing in listings:
            if listing.external_lot_id not in seen_ids:
                seen_ids.add(listing.external_lot_id)
                all_listings.append(listing)
                new += 1

        logger.info("Page %d: %d new, %d total", page, new, len(all_listings))

        if new == 0:  # all duplicates = we've looped
            break
        page += 1

    return all_listings


# ── Normalization ─────────────────────────────────────────────────────────────

def to_source_record_payload(listing: MichenerListing, source_id: str) -> dict:
    """
    Convert a MichenerListing to a source_records row payload.
    The source record stores the raw_payload and produces a normalized lot.
    """
    return {
        "source_id":             source_id,
        "external_id":           listing.external_lot_id,
        "source_url":            listing.listing_url,
        "source_url_normalized": listing.listing_url.lower().rstrip("/"),
        "source_url_hash":       hashlib.sha256(
            listing.listing_url.lower().encode()
        ).hexdigest(),
        "raw_payload": {
            "external_lot_id": listing.external_lot_id,
            "title":           listing.title,
            "description":     listing.description,
            "category":        listing.category,
            "location":        listing.location_text,
            "condition":       listing.condition_text,
            "current_price":   listing.current_price,
            "buy_now_price":   listing.buy_now_price,
            "bid_count":       listing.bid_count,
            "closes_at":       listing.closes_at.isoformat() if listing.closes_at else None,
            "status":          listing.status,
            "seller":          listing.seller_name,
            "listing_url":     listing.listing_url,
        },
        "payload_hash": hashlib.sha256(
            f"{listing.external_lot_id}:{listing.current_price}:{listing.status}".encode()
        ).hexdigest(),
    }


def to_canonical_lot(listing: MichenerListing, source_id: str) -> dict:
    """Map MichenerListing → canonical_lots row."""
    return {
        "canonical_key":        _make_canonical_key(listing.external_lot_id),
        "external_lot_id":      listing.external_lot_id,
        "source_id":            source_id,
        "title":                listing.title,
        "description":          listing.description,
        "category":             listing.category,
        "location_text":        listing.location_text,
        "condition_text":       listing.condition_text,
        "current_price":        listing.current_price,
        "buy_now_price":        listing.buy_now_price,
        "currency":             CURRENCY,
        "bid_count":            listing.bid_count,
        "status":               listing.status,
        "closes_at":            listing.closes_at,
        "listing_url":          listing.listing_url,
        "seller_name":          listing.seller_name,
        "jurisdiction":         "CA-AB",
        "source_first_seen_at": datetime.now(timezone.utc),
        "source_last_seen_at":  datetime.now(timezone.utc),
    }


# ── Entry point ───────────────────────────────────────────────────────────────

def run(source_ids: dict, run_id: Optional[str] = None) -> dict:
    """
    Full pipeline run for Michener Allen.

    Args:
        source_ids: {"city_edmonton_surplus": UUID, "city_calgary_surplus": UUID}
        run_id: optional UUID for this ingestion run

    Returns:
        {
            "run_id": str,
            "listings_found": int,
            "failures": int,
            "by_city": {"edmonton": int, "calgary": int},
            "records": [...]
        }
    """
    run_id = run_id or str(uuid.uuid4())
    session = requests.Session()

    try:
        listings_url = discover_listings_url(session)
    except RuntimeError as exc:
        return {
            "run_id": run_id,
            "error": str(exc),
            "listings_found": 0,
            "failures": 0,
        }

    listings = scrape_all_pages(listings_url, session)
    failures = 0
    by_city = {"edmonton": 0, "calgary": 0}
    records = []

    for listing in listings:
        parser_key = _identify_source(listing.seller_name, listing.listing_url)
        source_id = source_ids.get(parser_key)
        if not source_id:
            logger.warning("No source_id for parser_key=%s", parser_key)
            failures += 1
            continue

        records.append({
            "source_record": to_source_record_payload(listing, source_id),
            "canonical_lot":  to_canonical_lot(listing, source_id),
            "parser_key":     parser_key,
        })

        if "edmonton" in parser_key:
            by_city["edmonton"] += 1
        else:
            by_city["calgary"] += 1

    logger.info(
        "michener_allen run complete: %d listings, %d failures, by_city=%s",
        len(listings), failures, by_city
    )

    return {
        "run_id":        run_id,
        "listings_url":  listings_url,
        "listings_found": len(listings),
        "failures":      failures,
        "by_city":       by_city,
        "records":       records,
    }


# ── Recon utility ─────────────────────────────────────────────────────────────

def recon(max_cards: int = 5) -> None:
    """
    Phase A recon utility. Run this manually against live site.
    Prints URL structure, HTML shape, and selector candidates.

    Usage:
        python3 -c "from michener_allen import recon; recon()"
    """
    session = requests.Session()
    print("=== RECON: michener_allen (maauctions.com) ===")
    print(f"Base URL: {BASE_URL}")

    # Check robots.txt
    try:
        robots = session.get(f"{BASE_URL}/robots.txt", timeout=10).text
        print(f"\nrobots.txt:\n{robots[:500]}")
    except Exception as e:
        print(f"\nrobots.txt fetch failed: {e}")

    # Try listing pages
    for path in LISTINGS_PATH_CANDIDATES:
        url = urljoin(BASE_URL, path)
        try:
            resp = _get(url, session)
            print(f"\nTrying {url} → HTTP {resp.status_code}")
            soup = BeautifulSoup(resp.text, "html.parser")
            # Print unique classes in body to identify card selectors
            classes = set()
            for el in soup.find_all(class_=True)[:200]:
                for cls in el.get("class", []):
                    classes.add(cls)
            print(f"  Classes found: {sorted(classes)[:30]}")

            # Try to find lot links
            lot_links = soup.find_all("a", href=re.compile(r"lot|item|auction", re.I))[:5]
            print(f"  Lot-like links: {[l.get('href') for l in lot_links]}")
        except Exception as e:
            print(f"\n{url} → ERROR: {e}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    recon()
