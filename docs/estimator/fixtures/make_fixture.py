#!/usr/bin/env python3
"""Build docs/estimator/fixtures/price_history_sample.json from the local copy of the
Nov 9, 2026 live open-data load (ingest batch SQL). Deterministic: same input -> same file.

  python3 docs/estimator/fixtures/make_fixture.py <dir with batch_*.sql>

Anonymised: external_id replaced by fx-NNNN, description/raw_hash/timestamps dropped,
category reduced to its GCSurplus "Quantity: n(unit)" prefix (needed by the bulk-lot rule),
and the build aborts if any email, phone number or contact label is present.
"""
import glob, json, re, sys, hashlib
src = sys.argv[1] if len(sys.argv) > 1 else "/workspace/yk-team/surplus-bus/docs_local/ingest_live_2026-11-09"
rows = []
for f in sorted(glob.glob(f"{src}/batch_*.sql")):
    s = open(f, encoding="utf8").read()
    if "price_history_lots" not in s[:300]:
        continue
    for m in re.finditer(r"\$j\$(.*?)\$j\$", s, re.S):
        rows += json.loads(m.group(1))
rows.sort(key=lambda r: r["external_id"])
def key(r):  # stable pseudo-random order independent of file layout
    return hashlib.sha256(r["external_id"].encode()).hexdigest()
T = lambda r: (r.get("title") or "")
groups = [  # (label, predicate, how many)
    ("ford_f150", lambda r: re.match(r"^(19|20)\d\d ford f-?150", T(r), re.I) and not re.search(r"part|bumper|console|tailgate|cover|cap|canopy", T(r), re.I), 70),
    ("chevrolet_silverado", lambda r: re.match(r"^(19|20)\d\d (chevrolet|chevy) silverado", T(r), re.I) and not re.search(r"part|bumper|console|tailgate|cover", T(r), re.I), 50),
    ("dodge_grand_caravan", lambda r: re.match(r"^(19|20)\d\d dodge grand caravan", T(r), re.I), 30),
    ("thin_model_toyota_tacoma", lambda r: re.match(r"^(19|20)\d\d toyota tacoma", T(r), re.I), 6),
    ("vehicle_for_parts", lambda r: re.match(r"^(19|20)\d\d ", T(r)) and re.search(r"for parts|accident|damaged|not running|does not run", T(r), re.I), 15),
    ("vehicle_part", lambda r: re.match(r"^(19|20)\d\d (ford|ram|chevrolet)", T(r), re.I) and re.search(r"bumper|console|tailgate|tonneau|mirror", T(r), re.I), 12),
    ("generator_power", lambda r: re.search(r"generator", T(r), re.I) and not re.search(r"signal|function|pulse|waveform|test|parts", T(r), re.I), 40),
    ("generator_lab", lambda r: re.search(r"(signal|function|pulse|waveform) generator", T(r), re.I), 12),
    ("laptop", lambda r: re.search(r"laptop", T(r), re.I) and not re.search(r"bag|case|charger|adapter|dock|lot of|\d+ laptops", T(r), re.I), 35),
    ("laptop_accessory_or_bulk", lambda r: re.search(r"laptop", T(r), re.I) and re.search(r"bag|case|charger|adapter|dock|lot of|\d+ laptops", T(r), re.I), 15),
    ("snowmobile_atv", lambda r: re.match(r"^(19|20)\d\d (polaris|ski-doo|skidoo|yamaha|arctic cat|can-am|honda trx)", T(r), re.I), 20),
    ("nominal_price", lambda r: (r.get("sold_amount") or 0) <= 1, 10),
    ("bulk_quantity", lambda r: re.match(r"^Quantity:\s*([2-9]|\d{2,})", r.get("category") or ""), 15),
    ("ns_rows", lambda r: r["feed_key"] == "ns_surplus", 12),
    ("other_misc", lambda r: True, 30),
]
used, out = set(), []
for label, pred, n in groups:
    picks = sorted((r for r in rows if r["external_id"] not in used and pred(r)), key=key)[:n]
    for r in picks:
        used.add(r["external_id"])
        cat = r.get("category") or ""
        m = re.match(r"^Quantity:\s*[\d.,]+\s*\(\(?[a-z][a-z \-]*\)*\)?(\s*:\s*-\s*Quantity\s*:\s*[\d.,]+)?", cat, re.I)
        out.append({
            "group": label,
            "feed_key": r["feed_key"],
            "kind": r.get("kind"),
            "title": r["title"],
            "sold_amount": r.get("sold_amount"),
            "closing_date": r.get("closing_date"),
            "province": r.get("province"),
            "city": r.get("city"),
            "category": m.group(0) if m else None,
            "licence_id": r["licence_id"],
            "source_url": r["source_url"],
        })
out.sort(key=lambda x: (x["group"], x["closing_date"] or "", x["title"]))
for i, x in enumerate(out, 1):
    x["external_id"] = f"fx-{i:04d}"
PII = re.compile(r"[^\s@]+@[^\s@]+\.[a-z]{2,}|\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}|custodian|sales person|contact:", re.I)
TEXT = ("title", "city", "category")  # free-text fields; scanned one by one
bad = [x for x in out if any(PII.search(x[k] or "") for k in TEXT)]
assert not bad, f"PII-like content found: {bad[:3]}"
doc = {
    "_source": "Subset of GCSurplus 'What has sold' open data (Government of Canada) and Nova Scotia surplus open data, from the Nov 9, 2026 load. Contains information licensed under the Open Government Licence – Canada and the Open Government Licence – Nova Scotia. Real titles, prices, dates and locations; lot ids replaced, descriptions dropped, no personal information.",
    "_licences": {"ogl-canada": "https://open.canada.ca/en/open-government-licence-canada", "ogl-nova-scotia": "https://novascotia.ca/opendata/licence.asp"},
    "_built_by": "docs/estimator/fixtures/make_fixture.py",
    "_groups": {g: sum(1 for x in out if x["group"] == g) for g, _, _ in groups},
    "rows": out,
}
json.dump(doc, open("price_history_sample.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(len(out), doc["_groups"])
