"""
Parser: gc_surplus_open_data
Source: GCSurplus Sold Comps — open.canada.ca
Dataset: 1a09c5c1-4468-44cf-9d5f-f5d0d66a46a2
Licence: Open Government Licence – Canada (commercial reuse with attribution)
Role: price_reference (historical sold comps — NOT a live listing feed)
Update cadence: semi-annual (twice per year)

What this produces:
  - canonical_lots with status='sold', outcome='sold'
  - final_price populated from sold data
  - No canonical_auctions linkage (standalone sold records)
  - Feeds the asset valuation / price calibration layer

Attribution required in UI:
  "Contains information licensed under the Open Government Licence – Canada"
  https://open.canada.ca/en/open-government-licence-canada
"""

import csv
import hashlib
import io
import logging
import re
import uuid
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

DATASET_PACKAGE_URL = (
    "https://open.canada.ca/data/api/3/action/package_show"
    "?id=1a09c5c1-3554-4b70-9e53-6322a72ec7d4"
)

# Fallback direct ZIP URL (latest known English data segment)
FALLBACK_CSV_URL = (
    "https://donnees-data.tpsgc-pwgsc.gc.ca/bi1/gcsurplus/gcsurplus-2025-01-01--2025-06-30-eng.zip"
)

SOURCE_PARSER_KEY = "gc_surplus_open_data"
JURISDICTION = "CA-FED"
CURRENCY = "CAD"

# Actual column names from the GCSurplus open data CSV (ALL CAPS with underscores)
FIELD_MAP = {
    # canonical_lots field   → CSV column (case-insensitive match)
    "external_lot_id":       ["SALE_CNTRCT_REG_ID"],
    "title":                 ["LOT_DESC"],
    "category":              ["LOT_ITEMS"],
    "location_text":         ["ASSET_LOC_CITY"],
    "final_price":           ["SOLD_AMT"],
    "sold_at":               ["CLOSING_DT"],
    "condition_text":        [],              # no matching column — will be None
    "seller_name":           ["CUSTODIAN_PERSON_NM", "SALES_PERSON_NM"],
    "quantity":              [],              # extract from LOT_ITEMS text if needed
}


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class RawSoldRecord:
    """Intermediate representation from CSV row before normalization."""
    external_lot_id: Optional[str]
    title: str
    category: Optional[str]
    location_text: Optional[str]
    final_price: Optional[float]
    sold_at: Optional[datetime]
    condition_text: Optional[str]
    seller_name: Optional[str]
    quantity: Optional[float]
    raw_row: dict = field(default_factory=dict)


@dataclass
class CanonicalLotRecord:
    """
    Maps to canonical_lots table.
    status is always 'sold' for this source.
    outcome is always 'sold'.
    """
    canonical_key: str
    external_lot_id: Optional[str]
    source_id: str           # UUID from sources table — inject at runtime
    title: str
    description: Optional[str]
    category: Optional[str]
    location_text: Optional[str]
    condition_text: Optional[str]
    quantity: Optional[float]
    currency: str
    final_price: Optional[float]
    final_price_source: str  # "gc_surplus_open_data_csv"
    outcome: str             # "sold"
    status: str              # "sold"
    sold_at: Optional[datetime]
    finalized_at: Optional[datetime]
    seller_name: Optional[str]
    jurisdiction: str
    listing_url: Optional[str]  # None for this source — no live URL
    source_first_seen_at: datetime
    source_last_seen_at: datetime


# ── Column resolution ─────────────────────────────────────────────────────────

def _resolve_columns(header_row: list[str]) -> dict[str, str]:
    """
    Build a mapping of canonical field name → actual CSV column name.
    Handles bilingual headers and variation across dataset releases.
    """
    normalized_headers = {h.strip().lower(): h for h in header_row}
    resolved = {}

    for canonical_field, candidates in FIELD_MAP.items():
        for candidate in candidates:
            if candidate.lower() in normalized_headers:
                resolved[canonical_field] = normalized_headers[candidate.lower()]
                break

    missing = [f for f in ["title", "final_price"] if f not in resolved]
    if missing:
        logger.warning("Could not resolve required fields: %s. Headers: %s",
                       missing, list(normalized_headers.keys()))

    return resolved


# ── Parsing ───────────────────────────────────────────────────────────────────

def _parse_price(raw: Optional[str]) -> Optional[float]:
    """Clean price strings like '$1,234.56' or '1234.56' or '1 234,56'."""
    if not raw or not raw.strip():
        return None
    cleaned = re.sub(r"[^\d.,]", "", raw.strip())
    # Handle European-style comma decimals
    if cleaned.count(",") == 1 and cleaned.count(".") == 0:
        cleaned = cleaned.replace(",", ".")
    elif cleaned.count(",") >= 1 and cleaned.count(".") == 1:
        cleaned = cleaned.replace(",", "")
    else:
        cleaned = cleaned.replace(",", "")
    try:
        val = float(cleaned)
        return val if val > 0 else None
    except ValueError:
        return None


def _parse_date(raw: Optional[str]) -> Optional[datetime]:
    """Attempt multiple date formats from PSPC datasets."""
    if not raw or not raw.strip():
        return None
    formats = [
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
        "%Y-%m-%dT%H:%M:%S", "%d-%m-%Y", "%B %d, %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(raw.strip(), fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    logger.debug("Could not parse date: %r", raw)
    return None


def _parse_quantity(raw: Optional[str]) -> Optional[float]:
    if not raw or not raw.strip():
        return None
    try:
        return float(re.sub(r"[^\d.]", "", raw.strip()))
    except ValueError:
        return None


def _make_canonical_key(external_lot_id: Optional[str], title: str,
                        sold_at: Optional[datetime]) -> str:
    """
    Deterministic canonical key for dedup.
    Format: gc_surplus_open:{external_id} if ID available,
    else hash of (title + sold_date).
    """
    if external_lot_id:
        return f"gc_surplus_open:{external_lot_id.strip()}"
    seed = f"{title.strip().lower()}:{sold_at.date() if sold_at else 'unknown'}"
    return f"gc_surplus_open:hash:{hashlib.sha256(seed.encode()).hexdigest()[:16]}"


def parse_csv_stream(
    csv_content: str,
    source_id: str,
    run_id: str,
) -> tuple[list[CanonicalLotRecord], list[dict]]:
    """
    Parse the full GCSurplus sold comps CSV.

    Returns:
        (records, failures)
        records  — list of CanonicalLotRecord ready for upsert
        failures — list of {row_index, reason, raw_row} for ingestion_failures
    """
    now = datetime.now(timezone.utc)
    records: list[CanonicalLotRecord] = []
    failures: list[dict] = []

    reader = csv.DictReader(io.StringIO(csv_content))
    if not reader.fieldnames:
        raise ValueError("CSV has no headers — cannot parse")

    col_map = _resolve_columns(list(reader.fieldnames))
    logger.info("Column resolution: %s", col_map)

    def _get(row: dict, field_name: str) -> Optional[str]:
        col = col_map.get(field_name)
        return row.get(col, "").strip() if col else None

    for i, row in enumerate(reader):
        try:
            raw_title = _get(row, "title")
            if not raw_title:
                failures.append({
                    "row_index": i,
                    "reason": "missing_title",
                    "raw_row": dict(row),
                    "source_run_id": run_id,
                })
                continue

            raw_lot_id   = _get(row, "external_lot_id")
            raw_price    = _get(row, "final_price")
            raw_date     = _get(row, "sold_at")
            raw_category = _get(row, "category")
            raw_location = _get(row, "location_text")
            raw_cond     = _get(row, "condition_text")
            raw_seller   = _get(row, "seller_name")
            raw_qty      = _get(row, "quantity")

            final_price = _parse_price(raw_price)
            sold_at     = _parse_date(raw_date)
            quantity    = _parse_quantity(raw_qty)

            canonical_key = _make_canonical_key(raw_lot_id, raw_title, sold_at)

            record = CanonicalLotRecord(
                canonical_key       = canonical_key,
                external_lot_id     = raw_lot_id or None,
                source_id           = source_id,
                title               = raw_title,
                description         = None,   # not in sold comps CSV
                category            = raw_category or None,
                location_text       = raw_location or None,
                condition_text      = raw_cond or None,
                quantity            = quantity,
                currency            = CURRENCY,
                final_price         = final_price,
                final_price_source  = "gc_surplus_open_data_csv",
                outcome             = "sold",
                status              = "sold",
                sold_at             = sold_at,
                finalized_at        = sold_at,
                seller_name         = raw_seller or None,
                jurisdiction        = JURISDICTION,
                listing_url         = None,
                source_first_seen_at = now,
                source_last_seen_at  = now,
            )
            records.append(record)

        except Exception as exc:  # pylint: disable=broad-except
            logger.error("Row %d parse error: %s", i, exc, exc_info=True)
            failures.append({
                "row_index": i,
                "reason": str(exc),
                "raw_row": dict(row),
                "source_run_id": run_id,
            })

    logger.info(
        "gc_surplus_open_data parse complete: %d records, %d failures",
        len(records), len(failures)
    )
    return records, failures


# ── Fetch ─────────────────────────────────────────────────────────────────────

def discover_csv_url(timeout: int = 15) -> str:
    """
    Resolve the latest English data URL from the CKAN package metadata.
    The dataset now delivers semi-annual date-versioned ZIP files.
    Falls back to FALLBACK_CSV_URL if the API is unreachable.
    """
    try:
        resp = requests.get(DATASET_PACKAGE_URL, timeout=timeout,
                            headers={"User-Agent": "SurplusBus-DataPipeline/1.0"})
        resp.raise_for_status()
        data = resp.json()

        if not data.get("success"):
            raise ValueError(f"CKAN API error: {data.get('error')}")

        resources = data["result"].get("resources", [])
        # Filter for ZIP or CSV resources with English name
        data_resources = [
            r for r in resources
            if r.get("format", "").upper() in ("ZIP", "CSV", "TEXT/CSV")
            and "eng" in r.get("name", "").lower()
        ]

        if not data_resources:
            # Broader fallback: any ZIP or CSV
            data_resources = [
                r for r in resources
                if r.get("format", "").upper() in ("ZIP", "CSV", "TEXT/CSV")
            ]

        if not data_resources:
            logger.warning("No ZIP/CSV resources found in package. Falling back.")
            return FALLBACK_CSV_URL

        # Sort by last_modified descending to get the latest segment
        data_resources.sort(
            key=lambda r: r.get("last_modified") or "0000", reverse=True
        )
        url = data_resources[0]["url"]
        logger.info("Discovered data URL: %s", url)
        return url

    except Exception as exc:  # pylint: disable=broad-except
        logger.warning("discover_csv_url failed (%s). Using fallback.", exc)
        return FALLBACK_CSV_URL


def fetch_csv(url: str, timeout: int = 60) -> str:
    """Download the CSV (or ZIP containing a CSV). Returns raw text content."""
    logger.info("Fetching GCSurplus sold comps: %s", url)
    resp = requests.get(
        url, timeout=timeout, verify=False,
        headers={
            "User-Agent": "SurplusBus-DataPipeline/1.0 (open-data research)",
            "Accept": "*/*",
        }
    )
    resp.raise_for_status()

    if url.lower().endswith(".zip"):
        buf = io.BytesIO(resp.content)
        with zipfile.ZipFile(buf) as zf:
            csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            if not csv_names:
                raise ValueError(f"No .csv file found inside ZIP from {url}")
            csv_name = csv_names[0]
            logger.info("Extracting %s from ZIP", csv_name)
            content = zf.read(csv_name).decode("utf-8-sig")
    else:
        content = resp.content.decode("utf-8-sig")

    return content


# ── Entry point ───────────────────────────────────────────────────────────────

def run(source_id: str, run_id: Optional[str] = None) -> dict:
    """
    Full pipeline run for gc_surplus_open_data.

    Returns summary dict for ingestion_runs log:
    {
        "records_parsed": int,
        "records_inserted": int,  # populated by caller after DB upsert
        "failures": int,
        "csv_url": str,
        "run_id": str,
    }
    """
    run_id = run_id or str(uuid.uuid4())
    csv_url = discover_csv_url()
    csv_content = fetch_csv(csv_url)
    records, failures = parse_csv_stream(csv_content, source_id, run_id)

    return {
        "run_id": run_id,
        "csv_url": csv_url,
        "records_parsed": len(records),
        "failures": len(failures),
        "records": records,
        "failure_details": failures,
    }


# ── Schema recon utility ──────────────────────────────────────────────────────

def recon_headers(url: Optional[str] = None) -> dict:
    """
    Utility: print first 3 rows + headers to validate schema.
    Run this manually during Phase A recon before enabling parser.

    Usage:
        python3 -c "from gc_surplus_open_data import recon_headers; recon_headers()"
    """
    url = url or discover_csv_url()
    content = fetch_csv(url)
    reader = csv.DictReader(io.StringIO(content))
    headers = reader.fieldnames or []

    print("=== HEADER RECON: gc_surplus_open_data ===")
    print(f"CSV URL: {url}")
    print(f"Total columns: {len(headers)}")
    print("\nColumns:")
    for h in headers:
        print(f"  {h!r}")

    print("\nFirst 3 rows:")
    for i, row in enumerate(reader):
        if i >= 3:
            break
        print(f"\nRow {i+1}:")
        for k, v in row.items():
            print(f"  {k!r}: {v!r}")

    col_map = _resolve_columns(list(headers))
    print("\nField resolution:")
    for canonical, actual in col_map.items():
        print(f"  {canonical} → {actual!r}")

    unresolved = [f for f in FIELD_MAP if f not in col_map]
    if unresolved:
        print(f"\nWARNING — Unresolved fields: {unresolved}")

    return {"headers": headers, "col_map": col_map}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    recon_headers()
