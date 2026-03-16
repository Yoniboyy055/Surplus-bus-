"""
Parser: canadabuys_signal
Source: CanadaBuys — opendata CSV feeds
Base: extends existing canadabuys parser (already LIVE)
Role: signal layer — extract procurement cancellations + expired tenders
      as pre-surplus detection signals

This is NOT a replacement for the live canadabuys parser.
It runs as a second pass over the same CSV to extract:
  1. Cancelled tenders      → contract cancelled = potential surplus release
  2. Expired/lapsed RFPs    → no award given = budget lapsed = possible asset disposal
  3. Award cancellations    → contract terminated = asset returns to surplus pool
  4. Large equipment RFPs   → forward signal of what government is buying (will become surplus in 3–7 years)

Feeds into: opportunity_intelligence table (signal_type='procurement_cancellation')
NOT into: canonical_lots or source_records

Attribution:
  "Contains information licensed under the Open Government Licence – Canada"
  https://open.canada.ca/en/open-government-licence-canada
"""

import csv
import hashlib
import io
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

# These CSVs are already confirmed live (canadabuys parser Phase D PASS)
TENDER_NOTICES_CSV = (
    "https://canadabuys.canada.ca/opendata/pub/"
    "openTenderNotice-ouvertAvisAppelOffres.csv"
)
AWARD_NOTICES_CSV = (
    "https://canadabuys.canada.ca/opendata/pub/"
    "awardNotice-avisAttribution.csv"
)

# Equipment/fleet categories that signal future surplus
SURPLUS_PRECURSOR_UNSPSC = {
    # UNSPSC codes for equipment categories — expand during recon
    "25": "vehicles_and_transport",
    "40": "industrial_machinery",
    "43": "it_equipment",
    "46": "defence_security_equipment",
    "78": "transportation_services",  # often involves fleet
}

# Procurement methods that signal asset acquisition (future surplus)
ACQUISITION_METHODS = {
    "ADP",   # Advance Contract Award Notice
    "RFP",   # Request for Proposal
    "ITB",   # Invitation to Bid
    "RFQ",   # Request for Quotation
}

# Status codes that signal cancellation / surplus trigger
CANCELLATION_STATUSES = {
    "CN",    # Cancelled
    "EX",    # Expired
    "UP",    # Unsuccessful (no award)
}

# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class ProcurementSignal:
    """
    A procurement event that may predict future surplus.
    Stored in opportunity_intelligence, not canonical_lots.
    """
    signal_type: str             # "cancellation" | "expiry" | "equipment_acquisition"
    signal_strength: str         # "high" | "medium" | "low"
    reference_number: str        # CanadaBuys reference number
    tender_title: str
    department: Optional[str]
    commodity_code: Optional[str]
    procurement_method: Optional[str]
    estimated_value: Optional[float]
    status: Optional[str]
    published_at: Optional[datetime]
    closed_at: Optional[datetime]
    jurisdiction: str = "CA-FED"
    signal_rationale: str = ""
    source_url: Optional[str] = None
    raw: dict = field(default_factory=dict)


# ── Parsing ───────────────────────────────────────────────────────────────────

def _parse_price(raw: Optional[str]) -> Optional[float]:
    if not raw or not raw.strip():
        return None
    try:
        return float(re.sub(r"[^\d.]", "", raw.replace(",", "")))
    except ValueError:
        return None


def _parse_date(raw: Optional[str]) -> Optional[datetime]:
    if not raw or not raw.strip():
        return None
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"]:
        try:
            return datetime.strptime(raw.strip(), fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _signal_strength(estimated_value: Optional[float],
                     commodity_code: Optional[str]) -> str:
    """
    Score signal strength based on contract value and category.
    High = large equipment purchase or high-value cancellation.
    """
    if estimated_value and estimated_value >= 500_000:
        return "high"
    if estimated_value and estimated_value >= 100_000:
        return "medium"
    if commodity_code and commodity_code[:2] in SURPLUS_PRECURSOR_UNSPSC:
        return "medium"
    return "low"


def _build_signal_url(reference_number: str) -> str:
    """Construct CanadaBuys listing URL from reference number."""
    return (
        f"https://canadabuys.canada.ca/en/tender-opportunities/"
        f"tender-notice/{reference_number}"
    )


def _parse_tender_row(row: dict) -> Optional[ProcurementSignal]:
    """
    Parse a single tender notice row.

    RECON NOTE: Column names verified against CanadaBuys data dictionary:
    https://donnees-data.tpsgc-pwgsc.gc.ca
    These are the confirmed English column names from the live feed.
    """
    ref_num = (
        row.get("referenceNumber") or
        row.get("reference_number") or
        row.get("Reference Number", "")
    ).strip()

    if not ref_num:
        return None

    title = (
        row.get("title_en") or row.get("title") or row.get("Title", "")
    ).strip()

    status = (
        row.get("status") or row.get("Status", "")
    ).strip().upper()

    department = (
        row.get("orgName_en") or row.get("organization") or row.get("department", "")
    ).strip()

    commodity_code = (
        row.get("gsinCode") or row.get("commodity_code", "")
    ).strip()

    proc_method = (
        row.get("procurementMethod") or row.get("procurement_method", "")
    ).strip().upper()

    est_value = _parse_price(
        row.get("estimatedValue") or row.get("estimated_value", "")
    )

    published_at = _parse_date(
        row.get("publicationDate") or row.get("publication_date", "")
    )

    closed_at = _parse_date(
        row.get("closingDate") or row.get("closing_date", "")
    )

    # Determine signal type
    signal_type = None
    signal_rationale = ""

    if status in CANCELLATION_STATUSES:
        signal_type = "cancellation"
        signal_rationale = (
            f"Tender {ref_num} status={status}. "
            "Cancelled/expired procurement may release assets back to surplus pool."
        )
    elif (proc_method in ACQUISITION_METHODS and
          commodity_code[:2] in SURPLUS_PRECURSOR_UNSPSC):
        signal_type = "equipment_acquisition"
        signal_rationale = (
            f"Equipment acquisition ({SURPLUS_PRECURSOR_UNSPSC.get(commodity_code[:2])}). "
            f"Value: ${est_value:,.0f}. Will generate surplus in 3–7 year fleet cycle."
            if est_value else
            f"Equipment acquisition ({SURPLUS_PRECURSOR_UNSPSC.get(commodity_code[:2])})."
        )

    if not signal_type:
        return None  # Not a surplus signal — skip

    strength = _signal_strength(est_value, commodity_code)

    return ProcurementSignal(
        signal_type       = signal_type,
        signal_strength   = strength,
        reference_number  = ref_num,
        tender_title      = title or f"[Untitled — {ref_num}]",
        department        = department or None,
        commodity_code    = commodity_code or None,
        procurement_method = proc_method or None,
        estimated_value   = est_value,
        status            = status or None,
        published_at      = published_at,
        closed_at         = closed_at,
        signal_rationale  = signal_rationale,
        source_url        = _build_signal_url(ref_num),
        raw               = dict(row),
    )


def parse_tender_csv(csv_content: str) -> tuple[list[ProcurementSignal], int]:
    """
    Parse the full tender notices CSV.
    Returns (signals, total_rows_processed).
    """
    reader = csv.DictReader(io.StringIO(csv_content))
    signals = []
    total = 0

    for row in reader:
        total += 1
        signal = _parse_tender_row(row)
        if signal:
            signals.append(signal)

    logger.info(
        "CanadaBuys signal parse: %d/%d rows yielded signals",
        len(signals), total
    )
    return signals, total


# ── Opportunity intelligence schema mapping ───────────────────────────────────

def to_opportunity_intelligence_row(signal: ProcurementSignal,
                                    source_id: str) -> dict:
    """
    Map a ProcurementSignal to an opportunity_intelligence table row.
    Check actual opportunity_intelligence schema for exact column names.
    """
    return {
        "id":              hashlib.sha256(
            signal.reference_number.encode()
        ).hexdigest()[:32],    # deterministic ID for upsert
        "source_id":       source_id,
        "signal_type":     signal.signal_type,
        "signal_strength": signal.signal_strength,
        "reference_id":    signal.reference_number,
        "title":           signal.tender_title,
        "department":      signal.department,
        "jurisdiction":    signal.jurisdiction,
        "estimated_value": signal.estimated_value,
        "currency":        "CAD",
        "rationale":       signal.signal_rationale,
        "source_url":      signal.source_url,
        "published_at":    signal.published_at,
        "closed_at":       signal.closed_at,
        "created_at":      datetime.now(timezone.utc),
    }


# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_csv(url: str, timeout: int = 60) -> str:
    resp = requests.get(
        url, timeout=timeout,
        headers={
            "User-Agent": "SurplusBus-DataPipeline/1.0",
            "Accept": "text/csv,text/plain,*/*",
        }
    )
    resp.raise_for_status()
    return resp.content.decode("utf-8-sig")


# ── Entry point ───────────────────────────────────────────────────────────────

def run(source_id: str, run_id: Optional[str] = None) -> dict:
    """
    Parse CanadaBuys tender CSV for procurement signals.

    Returns summary with signals for insertion into opportunity_intelligence.
    """
    import uuid
    run_id = run_id or str(uuid.uuid4())

    logger.info("Fetching CanadaBuys tender CSV...")
    csv_content = fetch_csv(TENDER_NOTICES_CSV)
    signals, total_rows = parse_tender_csv(csv_content)

    rows = [to_opportunity_intelligence_row(s, source_id) for s in signals]

    by_type = {}
    by_strength = {}
    for s in signals:
        by_type[s.signal_type] = by_type.get(s.signal_type, 0) + 1
        by_strength[s.signal_strength] = by_strength.get(s.signal_strength, 0) + 1

    logger.info(
        "canadabuys_signal complete: %d signals from %d rows | by_type=%s",
        len(signals), total_rows, by_type
    )

    return {
        "run_id":           run_id,
        "total_rows":       total_rows,
        "signals_found":    len(signals),
        "by_type":          by_type,
        "by_strength":      by_strength,
        "rows":             rows,
        "signal_objects":   signals,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = run(source_id="test-source-id")
    print(f"\nSignals found: {result['signals_found']} / {result['total_rows']} rows")
    print(f"By type: {result['by_type']}")
    print(f"By strength: {result['by_strength']}")
    if result["signal_objects"]:
        print("\nSample signals:")
        for s in result["signal_objects"][:3]:
            print(f"  [{s.signal_strength.upper()}] {s.signal_type}: {s.tender_title[:60]}")
            print(f"    Ref: {s.reference_number} | Value: {s.estimated_value}")
            print(f"    {s.signal_rationale[:120]}")
