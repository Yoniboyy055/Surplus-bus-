# Estimator fixtures

`price_history_sample.json` — 372 real sold lots from the Nov 9, 2026 open-data load (GCSurplus "What has sold",
OGL–Canada; Nova Scotia surplus, OGL–Nova Scotia), selected to exercise the estimator: common pickups and vans,
a thin model, for-parts vehicles, vehicle parts, power vs. lab generators, laptops vs. accessories, powersports,
C$0–1 lots, multi-quantity lots, NS rows (incl. contract awards) and misc items.

Anonymised: lot ids replaced (`fx-NNNN`); description, hash and timestamps dropped; `category` cut to its
"Quantity: n(unit)" prefix. The build script aborts on any email, phone number or contact label. Source rows
already had staff contact fields removed by the ingest (`lib/opendata/redact.ts`).

Rebuild (deterministic): `python3 docs/estimator/fixtures/make_fixture.py <dir with batch_*.sql>`.
The `group` field is a test label only; the engine must never read it.

Contains information licensed under the Open Government Licence – Canada and the Open Government Licence – Nova Scotia.
