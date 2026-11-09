# Surplus Bus — Price Estimator: build brief

**Status:** approved design, not built. Branch `feature/price-estimator`, based on
`titi/next15-upgrade` @ `aefb535` (Next.js 15, the search fixes; this is what is live).
**Owner / approver:** Yonatan Kahsay. **Builder:** you (an outside coding agent), working only on this branch.
**Written:** Nov 9, 2026 (America/Toronto).

> **Hard rule.** Do not `git push`, open or merge a PR, deploy (Vercel or anything else), run
> migrations, or write to any live Supabase project. Do not call any paid or AI service. Commit
> locally on `feature/price-estimator` only. When you are done, stop and hand back the summary in
> §15 for Yonatan to approve. Anything that leaves this machine needs Yonatan's explicit yes.

---

## 0. Read this first (context you do not have)

Surplus Bus (Next.js 15 App Router + Supabase + Tailwind) is a public information service about
Canadian government surplus sales. It is **not** a broker and **not** an auction site. Its core data
is official **open data** loaded by our own ingest code:

| Table | What | Rows (live, Nov 9 2026) |
|---|---|---|
| `price_history_lots` | GCSurplus "What has sold" (feed `gcsurplus_sold`, Jan 2 2023 – Dec 30 2025) + Nova Scotia surplus (`ns_surplus`) | 85,217 (84,992 GCSurplus + 225 NS) |
| `tender_notices` | CanadaBuys tenders | not used by this feature |

Schema: `supabase/migrations/20261109150100_052_open_data_feeds.sql` (also 051, 053–055).
Relevant columns of `price_history_lots`: `external_id, feed_key, title, description, sold_amount,
min_bid_amount, closing_date (date), province (2-letter), city, category, kind, fiscal_year,
source_url (dataset URL, not a per-lot URL), licence_id ('ogl-canada' | 'ogl-nova-scotia'), status`.
There are **no** personal columns (staff contacts are stripped at ingest, `lib/opendata/redact.ts`).
`description` equals `title` in 99.7% of rows. `category` holds GCSurplus's quantity line, e.g.
`Quantity: 6(each)` or `Quantity: 2((per lot)) : - Quantity: 1`. `kind` is the feed's own column:
`gcsurplus_sold` for every GCSurplus row; NS rows are `real_property` (188, land/buildings) or
`public_tender` (37, contract awards, **not** item prices).

What exists and must be reused (read these files before writing code):

- `lib/opendata/queries.ts` — the only data path for public pages: a server-only service-role
  `reader()` with **explicit column lists**, `applyLotFilters()`, `fetchMatchSample()`
  (cap `MATCH_SAMPLE_CAP = 5000`), honest `DataState` (`ok | not_configured | not_migrated | error`).
- `lib/opendata/search.ts` — title → kind rules (`classifyTitle`, `kindFilters`, `RE_SRC`,
  `ROAD_MAKES`, `POWERSPORT_MAKES`, `EQUIPMENT_MAKES`, `TRAILER_MAKES`, `PICKUP_MODELS`,
  `PART_WORDS`), `planSearch()` (spelling variants f150/f-150/f 150, synonyms), `plannedOrFilter()`,
  `titleMatches()`, `assessHomogeneity()` (`RANGE_MIN_N = 20`, `RANGE_MIN_SHARE = 0.8`, `RANGE_MAX_SPREAD = 25`).
  Regexes are written to behave identically in JS and Postgres `~*` (no `\b`, no lookbehind). Keep that property.
- `lib/opendata/comps.ts` — `computeCompStats()` (p25/median/p75, `BAND_MIN_N = 20`), `formatCad()`, `toIlikePattern()`.
- `lib/opendata/lotParams.ts` — URL params ⇄ filters, `kindFacets()`.
- `lib/opendata/attribution.ts` — `OGL_CANADA`, `OGL_NOVA_SCOTIA`, `FEED_LICENCES`; UI component `components/LicenceAttribution.tsx`.
- `lib/opendata/freshness.ts` + `fetchFeedStatus()` + `components/DataStateNotice.tsx` (`DataStateNotice`, `FeedFreshnessChip`).
- `app/comps/page.tsx` — the closest existing page: server component, GET form, guidance band, comps table, attribution. **Copy its structure and tone.**
- `lib/security/rateLimit.ts` — `checkRateLimit(request, key, limit, windowMs)` returns a 429 `NextResponse` or null.
- `lib/analytics/track.ts` + `catalog.ts` — optional server events, off unless `ANALYTICS_EVENTS_ENABLED=1`; props are allow-listed and sanitised.
- Flag convention: `process.env.X === "1"` (see `analyticsEnabled()`).
- Design system **"Surplus Bus v4.1 — 3D Soft Realism, Clay & Honey"**: `app/design-tokens.json`,
  `app/sb-tokens.css` (`--sb-*` variables), `app/globals.css` classes `.card`, `.chip`, `.chip-link`,
  `.btn .btn-primary .btn-outline .btn-ghost .btn-sm`, `.banner`, `.guidance-band` /
  `.guidance-band-fill` / `.guidance-band-tick` / `.motion-band`, `.sb-title`, `.sb-mono`,
  `shadow-raised`. Fonts: Bricolage Grotesque (display), Schibsted Grotesk (text), JetBrains Mono (numbers).
  Signature element: the tactile price-tag **guidance band**. Rejected styles: dark glass, glowing blue,
  bento tiles, gradient hero. Respect reduced motion. 44px minimum tap targets.
- Tests: `scripts/test-*.ts` run with `npx tsx` (plain `assert` helper, no Jest); `npm test` chains them.
  Playwright in `e2e/` runs the production build against `e2e/mock-supabase.ts` (PGlite with the real
  schema + RLS, seeded through the real ingest code). Projects: `desktop` and `mobile` (Pixel 7).
  Helpers in `e2e/tests/helpers.ts`: `trackConsole`, `noHorizontalOverflow`, `axeSeriousOrCritical`,
  `assertNoStaffPii`, `shot`.

### 0.1 Work landing in parallel: odd-items cleanup

Another worker is finishing an "odd items" change on `titi/next15-upgrade` (not committed at `aefb535`).
It adds `lib/opendata/kinds.ts` (more kinds: `vehicle, heavy_truck, powersport, equipment, trailer,
electronics, property, part, bulk, other`, a `forParts` signal, `classifyLot(row)`, a manual
override list) and `lib/opendata/outliers.ts`:

```ts
export type ExcludeReason = "nominal" | "contract" | "bulk" | "manual" | "extreme";
export function excludeOutliers<T extends CompRow>(rows: T[]): {
  kept: T[]; excluded: Record<ExcludeReason, number>; excludedTotal: number;
  fences: { low: number; high: number } | null };
// nominal: sold_amount <= 1; contract: kind === "public_tender"; bulk: classifyLot = "bulk" or
// quantityLot(category) (quantity > 1, or pallet/skid/kg/lb); manual: override hide_from_comps;
// extreme: Tukey fences on ln(price): [exp(Q1 - 1.5·IQR), exp(Q3 + 1.5·IQR)], only when n >= 8.
```

**What to do:** before starting, run `git log --oneline -5 titi/next15-upgrade` and check whether
`lib/opendata/outliers.ts` exists there. If it does, rebase this branch onto it
(`git rebase titi/next15-upgrade`) and import it. If it does not, create
`lib/estimator/outliers.ts` implementing **exactly** the contract above using `classifyTitle` from
`search.ts` (bulk = title matches `^(lot of|assorted|mixed)|^[0-9]+ ` or `quantityLot(category)`),
with a header comment `// TEMPORARY: replace with lib/opendata/outliers.ts when the odd-items work lands`.
Either way, the estimator imports outlier logic from a single place (`lib/estimator/outliers.ts`
re-exports or implements it), so swapping is a one-line change. Never fork the kind rules: if you
need a rule the shared module lacks, add it to the shared module with a test.

### 0.2 What the data supports (measured on the Nov 9 load — use these, re-measure in the back-test)

- Road-vehicle titles (year + make at the start): ~5,960. Clean (not parts/for-parts) ≈ 5,255.
- **Mileage** appears in only ~534 titles, always as `(144,292 km)`. **Hours** appear in 7 titles total.
  There is no structured mileage, hours, condition or category column.
- **Condition** is only signalled by words like "for parts", "accident", "damaged", "not running".
- Baseline measured with a simple rule (same make + model, age within ±2 years, ≥5 comps, train on
  sales before 2025-07-01, test on Jul–Dec 2025, 1,320 test vehicles): coverage 84.5%,
  MAE ≈ C$4,500, median absolute % error ≈ 33.7%, actual price inside p25–p75 ≈ 47%.
  A log-linear age adjustment improved MAE by only ~1%. **Your engine must at least match this
  baseline** and must not add adjustments the back-test does not justify.

---

## 1. Goal

While a bidder is looking at a surplus lot, give them — in seconds, for free, from our own engine on
open data — a **fair price range**, a **suggested maximum bid**, **how many comparable sales** it is
based on, **when** those sales happened, and **how confident** we are. Be honest when the data is thin.
No AI, no paid services, no fetching from auction sites.

## 2. User stories

1. *As a bidder on a GCSurplus truck*, I paste the lot title ("2016 Ford F-150 XLT SuperCrew 4WD (144,292 km)")
   and see a typical range, a suggested max bid and the sales it came from, so I don't overpay.
2. *As a bidder without a title handy*, I pick "Cars & trucks", type make/model/year/km and province and get the same.
3. *As a reseller*, I choose "I plan to resell" and enter my fees/transport so the max bid leaves margin.
4. *As a bidder on something rare*, I'm told plainly "Not enough comparable sales (found 3, need 8)" and shown the 3 sales, rather than a made-up number.
5. *As a sceptical user*, I can see which sales were left out (C$1 transfers, bulk lots, extreme prices) and tap "Show all" to include them.
6. *As a bidder who pasted the lot link*, I get a plain "Back to the listing" link; nothing is fetched from it.
7. *As Yonatan*, I can keep the feature invisible in production (`ESTIMATOR_ENABLED` unset) until I approve it.

## 3. UX flow

Route: **`/estimate`** (public, like `/comps`). Works without JavaScript (GET form, server-rendered
result), enhanced with a small client component for the guided form's conditional fields.

1. **Entry**: header "Estimate a lot" (`.sb-title`), one-line explainer: *"What similar government surplus
   actually sold for, and what we'd bid up to. Our estimate from open data — not a guarantee."*
   Two tabs (`role="tablist"`, keyboard accessible): **Paste lot title** (default) | **Describe it**.
2. **Paste lot title**: textarea `title` (max 160 chars), optional `lot_url` input ("Lot link (optional,
   we only link back to it)"), province select, condition radios, "Estimate" button (`.btn-primary`).
3. **Describe it**: `kind` select (labels from `KIND_LABEL`). Fields shown per kind:
   - vehicle / heavy_truck / powersport / trailer: make, model, year, **km** (vehicles/heavy trucks only)
   - equipment: make, model, year, **hours**
   - others: make/brand (optional), model (optional), "what is it" (required, free text ≤ 60)
   plus province, condition, and a collapsed **"Bid settings"** disclosure: purpose (own use / resale),
   taxes & fees % (pre-filled from province, editable), extra costs C$ (transport, repairs; default 0).
4. **"We read it as"** chips (title mode): `2016 · Ford · F-150 · Cars & trucks · 144,292 km` with an
   "Edit" link that switches to *Describe it* pre-filled. The user can always correct the parse.
5. **Result card** (`.card`, `data-testid="estimate-result"`, `data-status`, `data-confidence`, `data-n`):
   - Eyebrow: "Typical sold range · not a guarantee".
   - Guidance band with p25 / median / p75 ticks (reuse the `/comps` markup and classes).
   - **Suggested max bid** callout: large `.sb-mono` amount, caption "Our estimate, not a guarantee.
     Based on the median, after 13% taxes & fees." (wording follows the inputs actually used).
   - Chips: `n = 42 comparable sales`, `Jan 2024 – Dec 2025`, `Ontario` or `All provinces`, confidence pill
     (High / Medium / Low) with a "Why?" disclosure listing `confidence.reasons`.
   - Adjustments line(s), honest: "Adjusted for age (2016 vs. comps 2014–2018)" / "Mileage not used: only
     4 of 42 sales list mileage" / "Condition: comps that sold for parts are left out".
   - Outliers line: "5 sales left out: 2 sold for C$1 or less, 2 bulk lots, 1 extreme price · **Show all**"
     (link toggles `show_all=1`; when on: "Showing all sales, including 5 usually left out · Hide them").
   - Comparable sales table (≤ 12, newest first): title, sold, closed, where (same markup as `/comps`),
     plus "See all matching sales" → `/search` with the equivalent query.
   - "Back to the listing on gcsurplus.ca" (only for allow-listed hosts, §9) and the data-freshness chips.
   - Attribution block: `<LicenceAttribution licence={OGL_CANADA} />` and, if any NS row was used, `OGL_NOVA_SCOTIA`.
   - Footer note: "Prices are from sales up to Dec 2025 (latest open data). Auction results vary; this is
     not an appraisal, an offer, or financial advice."
6. **Thin data** (`status: "insufficient"`): EmptyState-style card "Not enough comparable sales" with the
   count found vs. needed, the individual sales (if any), and one-tap broadening links (drop the year
   window → all years; province → all provinces; model → make only). **No range, no max bid.**
7. **Mixed results** (`status: "mixed"`, homogeneity fails): "These matches mix different kinds of items"
   + kind facet links, like `/comps`. No range, no max bid.
8. **Data unavailable**: `DataStateNotice` for `not_configured | not_migrated | error`.

Mobile: single column, no horizontal overflow (table scrolls in its own region like `/comps`), header unchanged.
Entry points (only when the flag is on): a "Estimate a lot" `.chip-link` on `/comps` results and a
footer/menu link. Do **not** add `/estimate` to `lib/seo/publicRoutes.ts` (sitemap) in this branch.

## 4. Files and routes to add / change

Add:

| Path | Purpose |
|---|---|
| `lib/estimator/flag.ts` | `export function estimatorEnabled(): boolean { return process.env.ESTIMATOR_ENABLED === "1"; }` |
| `lib/estimator/schema.ts` | zod v4 schemas `estimateInput`, types `EstimateInput`, `Estimate` (response, §7) |
| `lib/estimator/parseTitle.ts` | `parseLotTitle(title): ParsedLot` → `{ kind, year, make, model, km, hours, forParts, tokens }` using `search.ts`/`kinds.ts` rules and make lists; pure |
| `lib/estimator/normalize.ts` | make aliases (chevy→chevrolet, mercedes-benz→mercedes), model normalisation via `tokenVariants` (f150 ≡ f-150 ≡ f 150), km/hours parsing (`/\(([\d,]+)\s?km\)/i`) |
| `lib/estimator/outliers.ts` | re-export of or temporary stand-in for `lib/opendata/outliers.ts` (§0.1) |
| `lib/estimator/stats.ts` | weighted quantiles, effective n, spread; pure |
| `lib/estimator/adjust.ts` | age / mileage adjustment (gated, §6.4–6.5); pure |
| `lib/estimator/coefficients.generated.ts` | per-kind β coefficients + enable switches written by the back-test script, with provenance header (data load date, n, holdout result) |
| `lib/estimator/maxBid.ts` | suggested max bid (§6.7) + `PROVINCE_TAX_PCT` table; pure |
| `lib/estimator/confidence.ts` | confidence score and reasons (§6.8); pure |
| `lib/estimator/match.ts` | tier plan (§6.2) → `LotFilters` per tier + JS predicate mirror; pure |
| `lib/estimator/estimate.ts` | `estimateFromRows(input, rows, now)` pure core + `runEstimate(input)` that fetches per tier via queries.ts |
| `lib/estimator/linkBack.ts` | `linkBack(url)` → `{ url, host } \| null` for allow-listed hosts only; never fetches |
| `app/estimate/page.tsx` | server component; `notFound()` when flag off; parses GET params with the zod schema; calls `runEstimate` directly (no HTTP hop) |
| `app/estimate/EstimateForm.tsx` | `"use client"` tabs + conditional fields; plain `<form method="get" action="/estimate">` so it works without JS |
| `app/estimate/EstimateResult.tsx` | presentational result / insufficient / mixed states |
| `app/api/estimate/route.ts` | `POST` JSON API (§7); 404 when flag off; `checkRateLimit(request, "estimate", 30, 60_000)`; `Cache-Control: no-store` |
| `scripts/test-estimator.ts` | unit tests (§10.1) |
| `scripts/backtest-estimator.ts` | accuracy back-test (§10.3) → `docs/estimator/BACKTEST_REPORT.md` + coefficients file |
| `e2e/tests/estimator.spec.ts` | Playwright (§10.2) |

Change (minimal):

- `lib/opendata/queries.ts`: add `fetchEstimatorComps(filters: LotFilters): Promise<DataState<EstimatorCompRow>>`
  next to `fetchMatchSample`, same `reader()`, explicit columns
  `"external_id,feed_key,title,sold_amount,closing_date,province,city,category,kind,licence_id"`,
  `.gt("sold_amount", 0)` **not** applied (nominal rows must be counted as excluded), ordered
  `closing_date desc`, limit `MATCH_SAMPLE_CAP`, `count: "exact"`.
- `middleware.ts`: add `"/estimate"` to `PUBLIC_ROUTES`.
- `package.json`: add `"test:estimator": "npx tsx scripts/test-estimator.ts"`, append it to `"test"`,
  add `"backtest:estimator": "npx tsx scripts/backtest-estimator.ts"`.
- `lib/analytics/catalog.ts` (optional): event `estimate_viewed` with props
  `kind, status, confidence, tier, scope, n_bucket` only (no title, make, model, URL, or amounts).
- `app/comps/page.tsx` + nav: flag-gated "Estimate a lot" link.
- `e2e/mock-supabase.ts`: `ESTIMATOR_ENABLED: "1"` in `E2E_ENV`; seed `docs/estimator/fixtures/price_history_sample.json`
  (prefix `external_id` with `est-`, `on conflict do nothing`). If that changes counts asserted by the
  existing suites, gate the seed behind `E2E_ESTIMATOR_SEED=1` and run the estimator spec separately (§11).
- `docs/ENV_REQUIRED.md`: document `ESTIMATOR_ENABLED` (optional, default off).

No database migrations. No new dependencies (zod, Next, React, lucide are already there). If you
believe one is needed, stop and write the reason in the hand-back instead of adding it.

## 5. Data access (RLS-safe)

- `price_history_lots` has RLS on; `anon` has no grants; `authenticated` has `SELECT`; writes are service-role only.
  Public pages read it **server-side only** through `lib/opendata/queries.ts`'s service-role `reader()`
  with explicit column lists. The estimator uses exactly that path (`fetchEstimatorComps`). It never
  creates a browser Supabase client for this table, never selects `*`, and never writes.
- `import "server-only"`-style discipline: `lib/estimator/estimate.ts#runEstimate` and the queries are only imported from
  server components / route handlers. `scripts/check_no_service_role_in_client.ps1` and the existing
  "no secrets in client bundle" checks must still pass.
- All user text goes through `cleanTerm()` / `planSearch()` / `plannedOrFilter()` before reaching
  PostgREST (they strip `,()%_*"'` etc.). Make/model are additionally limited to `[a-z0-9 .-]`.
  Kind filters come only from `kindFilters()`; province only from `cleanProvince()`.
- Per request at most **4 tier queries**, each capped at 5,000 rows; stop at the first tier that qualifies.

## 6. Algorithm

Notation: for comparable sale *i*: price `pᵢ = sold_amount`, closing date `dᵢ`, model year `yᵢ`
(parsed from title, may be null), age at sale `aᵢ = year(dᵢ) − yᵢ`. Target: model year `y*`,
target age `a* = year(D_ref) − y*` where `D_ref` = the latest `closing_date` in the corpus
(currently 2025-12-30; prices are in 2023–2025 money, and the UI says so). Constants live in
`lib/estimator/*.ts` with comments; values below are starting points, tune only via the back-test.

### 6.1 Input → target
- **Title mode:** `parseLotTitle(title)`: kind via the shared rules (`classifyLot`/`classifyTitle`); year =
  leading `^(19|20)\d{2}`; make = the make list entry right after the year (longest match first:
  "western star", "john deere", "arctic cat"…); model = next token, normalised (e.g. `f-150`, `silverado`,
  `grand caravan` as a 2-token model when the second token is in a small `TWO_WORD_MODELS` list such as
  `grand caravan, grand cherokee, transit connect, express 2500/3500`); km from `(N km)`; hours from `N hours|hrs`;
  `forParts` from the shared `SIGNALS.forParts` in `lib/opendata/kinds.ts` (if that module has not landed yet, define the same portable regex in `lib/estimator/normalize.ts`: `(^|[^a-z0-9])(for|4)[ ]+(parts|scrap|recycling|destruction|salvage)([^a-z0-9]|$)|(^|[^a-z0-9])parts[ ]+only([^a-z0-9]|$)|(^|[^a-z0-9])for[ ]+repairs?[ ]+or[ ]+parts([^a-z0-9]|$)`, plus `accident|damaged|not running|does not run|non-running`, and mark it TEMPORARY). For non-year titles: `tokens = planSearch(title)` minus stop-words
  (`lot, of, the, and, with, used, assorted, new, qty, each`) keeping at most the first 4 meaningful tokens.
- **Form mode:** the same struct, from fields. Form values win over parsed values.

### 6.2 Matching tiers (first one with `n_kept ≥ N_MIN` wins)
`N_MIN = 8` (range shown, max 'low' confidence below 20), `N_GOOD = 20`.

For dated kinds (vehicle, heavy_truck, powersport, equipment, trailer) with make + model:
- **T1** kind = target kind AND title matches make AND model (all variants) AND `|aᵢ − a*| ≤ 2`
- **T2** same make + model, any age, with the age adjustment of §6.4 (only if enabled for that kind)
- **T3** same kind + make, `|aᵢ − a*| ≤ 2` (confidence capped at Low)

For everything else:
- **T1** kind = target kind AND all meaningful tokens match (`planSearch` groups, AND of ORs)
- **T2** kind = target kind AND the head noun only (last meaningful token, e.g. "generator")

Scope: try the target **province** first; if no tier reaches `N_MIN` in-province, repeat nationally and
say "All provinces" in the result. The DB query uses `applyLotFilters` (q = make + model tokens or the
tokens, `kind` via `kindFilters`); the age window and model-year parse are applied in JS on the returned
rows (`pure` and unit-tested). NS `real_property` rows only match kind `property`.

**Condition pools:** `condition ∈ {for_parts, needs_repair}` → keep only rows with the `forParts`
signal; any other condition → drop rows with the `forParts` signal. There is **no** numeric condition
multiplier (the data has no condition grades). Say so in `adjustments.condition.note`.

### 6.3 Outliers
Run `excludeOutliers(pool)` (§0.1) on the chosen tier's rows. `kept` feed the statistics; `excluded`
counts by reason are returned. With `show_all = true`, statistics use every row with a numeric price
(`kept ∪ excluded`, still excluding rows with no price), and the response says so.

### 6.4 Age adjustment (gated)
Log-linear depreciation per kind (and per make+model when that pool has ≥ 30 kept rows and ≥ 4 distinct ages):

  `ln pᵢ = α + β·aᵢ + εᵢ`, OLS: `β = Σ(aᵢ − ā)(ln pᵢ − ln p̄) / Σ(aᵢ − ā)²`, clamped to `β ∈ [−0.35, 0]`.

Adjusted comparable price: `p′ᵢ = pᵢ · exp(β · (a* − aᵢ))`.
Applied in **T2 always** (when enabled) and in T1 only if the back-test shows it helps T1.
`coefficients.generated.ts` stores per-kind `β_kind` and `ageAdjustT1: boolean` as decided by §10.3
(enable only if holdout MAE improves by ≥ 2% **and** the p25–p75 hit-rate does not drop by more than 2 points).

### 6.5 Mileage / hours adjustment (gated, likely off)
Only when the pool has **≥ 30 kept rows with parsed km** and the target has km. Fit
`ln pᵢ = α + β·aᵢ + γ·(kmᵢ / 10,000)`; apply `p′ᵢ = pᵢ · exp(γ · (km* − kmᵢ)/10,000)` only if the 95% CI of γ
(`γ ± 1.96·SE`) is entirely below 0 and γ ≥ −0.08; otherwise do not adjust and return the note
"Mileage not used: only X of N comparable sales list mileage." Hours: same rule; with today's data (7 titles)
it will never apply, and the note must say so. Never invent a depreciation rate.

### 6.6 Statistics
Recency weight `wᵢ = 2^(−mᵢ / H)`, `mᵢ` = months between `dᵢ` and `D_ref`, `H = 18`. Enable recency weighting
only if the back-test shows it helps (switch in the coefficients file); otherwise `wᵢ = 1`.

Weighted quantile `Q(q)`: sort `p′` ascending; `Sₖ = (Σ_{j≤k} wⱼ − wₖ/2) / Σ wⱼ`; linear interpolation of `p′`
over `Sₖ` at `q` (clamp to the ends). With equal weights this reduces to the `computeCompStats` definition —
unit-test that equivalence. Output `p25 = Q(.25)`, `median = Q(.5)`, `p75 = Q(.75)`, plus `min`, `max`,
`n` (kept), `n_eff = (Σw)² / Σw²`, `spread = p75 / max(p25, 1)`, `date_from = min dᵢ`, `date_to = max dᵢ`.
Round displayed money with `formatCad` (whole dollars). Also run `assessHomogeneity` on the kept rows;
if `reason === "mixed_kinds"` → `status: "mixed"`.

### 6.7 Suggested max bid
Inputs: `purpose ∈ {own_use, resale}` (default own_use), `fees_pct` (default `PROVINCE_TAX_PCT[province]`, else 13),
`extra_costs` C$ (default 0).

  `target = median` (own_use) or `p25` (resale); if confidence is Low → `target = p25` for both.
  `raw = (target − extra_costs) / (1 + fees_pct/100)`
  `step = 50 if raw < 5,000; 100 if raw < 50,000; else 500`
  `max_bid = min(floor(raw / step) · step, floor(p75))`; if `max_bid ≤ 0` → `null` with reason.

`PROVINCE_TAX_PCT` (combined sales tax, as a labelled default the user can edit; **verify each value before
launch** and cite the source in a code comment): ON 13, NS 14, NB 15, NL 15, PE 15, QC 14.975, BC 12, MB 12,
SK 11, AB 5, NT 5, NU 5, YT 5. Do not claim to know any auction's buyer's premium or fees; the UI says
"Check the sale's terms for fees and taxes."
No max bid when `status !== "ok"`.

### 6.8 Confidence
`C = base_tier · f_size · f_spread · f_recency`, with
- `base_tier`: T1 1.0, T2 0.8, T3 0.55, token T1 0.75, token T2 0.5; national scope × 0.9
- `f_size = min(1, ln(n_eff) / ln(40))`
- `f_spread`: 1 if spread ≤ 1.6; 0.7 if ≤ 2.5; 0.4 if ≤ 4; 0.2 otherwise
- `f_recency`: median months since sale ≤ 12 → 1; ≤ 24 → 0.85; else 0.7

Levels: **high** if `C ≥ 0.6` and `n ≥ 20`; **medium** if `C ≥ 0.35` and `n ≥ 8`; **low** if `n ≥ 8`;
otherwise `status: "insufficient"`. T3 is capped at low. `reasons[]` are short human sentences
("42 comparable sales", "Same make and model, within 2 model years", "Prices vary 2.3× between the lower and
upper quarter", "Most sales are over a year old"). The back-test must show hit-rate is non-decreasing from
low → medium → high; adjust thresholds (not the formula shape) if it isn't, and record the final values.

## 7. API contract

`POST /api/estimate` — `Content-Type: application/json`. Also used by tests; the page calls the library directly.

Request (zod, unknown keys rejected):
```jsonc
{
  "mode": "title" | "form",
  "title": "2016 Ford F-150 XLT SuperCrew 4WD (144,292 km)", // required when mode=title, 3..160 chars
  "kind": "vehicle",            // LotKind; required when mode=form
  "make": "Ford",               // ≤ 40, [A-Za-z0-9 .-]
  "model": "F-150",             // ≤ 60
  "what": "generator",          // ≤ 60, non-dated kinds only
  "year": 2016,                 // int 1950..(current year + 1)
  "km": 144292,                 // int 0..2,000,000
  "hours": null,                // int 0..200,000
  "condition": "runs" | "unknown" | "needs_repair" | "for_parts",   // default "unknown"
  "province": "ON",             // cleanProvince; null = national
  "purpose": "own_use" | "resale",                                  // default "own_use"
  "fees_pct": 13,               // 0..30
  "extra_costs": 0,             // 0..1,000,000
  "show_all": false,
  "lot_url": "https://www.gcsurplus.ca/..."   // optional, ≤ 500, https only; never fetched
}
```

Response `200`:
```jsonc
{
  "status": "ok" | "insufficient" | "mixed",
  "parsed": { "kind": "vehicle", "year": 2016, "make": "ford", "model": "f-150", "km": 144292, "hours": null, "for_parts": false },
  "match": { "tier": "T1", "scope": "province" | "national", "province": "ON", "search_href": "/search?q=ford+f-150&kind=vehicle" },
  "stats": { "n": 42, "n_eff": 37.9, "p25": 7400, "median": 9800, "p75": 13100, "min": 2100, "max": 24500,
             "spread": 1.77, "date_from": "2024-01-11", "date_to": "2025-12-03" } | null,
  "adjustments": {
    "age":       { "applied": true,  "beta": -0.11, "note": "Adjusted for age (2016 vs. comps 2014–2018)" },
    "mileage":   { "applied": false, "note": "Mileage not used: only 4 of 42 sales list mileage" },
    "hours":     { "applied": false, "note": null },
    "condition": { "pool": "running" | "for_parts", "note": "Comps that sold for parts are left out" },
    "recency":   { "applied": false, "half_life_months": 18 }
  },
  "outliers": { "excluded": { "nominal": 2, "contract": 0, "bulk": 2, "manual": 0, "extreme": 1 },
                "excluded_total": 5, "fences": { "low": 1200, "high": 41000 }, "show_all": false },
  "max_bid": { "amount": 8650, "target": "median", "purpose": "own_use", "fees_pct": 13, "extra_costs": 0, "step": 50 } | null,
  "confidence": { "level": "high" | "medium" | "low" | null, "score": 0.71, "reasons": ["…"] },
  "comps": [ { "title": "…", "sold_amount": 9900, "closing_date": "2025-11-20", "province": "ON", "city": "Ottawa", "feed_key": "gcsurplus_sold" } ],
  "needed": { "n_min": 8, "found": 42 },
  "attribution": [ { "id": "ogl-canada", "statement": "Contains information licensed under the Open Government Licence – Canada.", "url": "https://open.canada.ca/en/open-government-licence-canada" } ],
  "link_back": { "url": "https://www.gcsurplus.ca/...", "host": "gcsurplus.ca" } | null,
  "data_coverage": { "to": "2025-12-30" },
  "disclaimer": "Our estimate from past sales in open government data. Not a guarantee, appraisal or offer."
}
```
`comps` ≤ 12, newest first; only the listed columns (no `external_id` needed; never `description`).
Errors: `400 {"error":"invalid_input","fields":{…}}`; `404 {"error":"not_found"}` when the flag is off
(identical to an unknown route; also for `GET`); `429` from `checkRateLimit`; `503 {"error":"data_unavailable","state":"not_configured"|"not_migrated"}`;
`500 {"error":"Couldn't estimate right now."}` (never echo DB errors). Always `Cache-Control: no-store`.
Do not log request bodies, titles, URLs or IPs.

## 8. Feature flag

- `ESTIMATOR_ENABLED`, server-only, **off by default** (unset or anything other than `"1"`).
- Off ⇒ `/estimate` returns the standard 404 (`notFound()`), `/api/estimate` returns 404, no nav or
  `/comps` links render, nothing in the sitemap. Check the flag at request time (route handlers and the
  page are dynamic), not at build time, so turning it on needs only an env change + redeploy approved by Yonatan.
- Do not set it in `vercel.json` or any committed env file. E2E sets it in `E2E_ENV` only.

## 9. Legal and data rules (non-negotiable)

- **Attribution:** every result (including insufficient/mixed) shows `LicenceAttribution` for OGL–Canada,
  and OGL–Nova Scotia when NS rows are among the comps; plus the existing "Not an official Government of
  Canada or provincial product. No endorsement implied." The API returns `attribution[]`.
- **No scraping or fetching:** the server never requests `lot_url` or any auction/marketplace page (no
  `fetch`, no link preview, no HEAD request, no image proxy). A unit test asserts `runEstimate` makes no
  network calls besides the Supabase reader (stub `global.fetch` and fail on any non-Supabase host).
- **Link-back only:** `linkBack()` returns a link only for `https:` URLs whose host is (or is a subdomain of)
  an allow-list in `lib/estimator/linkBack.ts`: `gcsurplus.ca`, `novascotia.ca`. Anything else → `null`
  and the UI shows no link (prevents us being used to dress up phishing links). Rendered with
  `rel="noopener noreferrer nofollow"` and `target="_blank"`. URLs are not stored.
- **No copying listing content:** no photos, descriptions or text from auction sites are copied, framed,
  hot-linked or cached. The only text we use is what the user typed/pasted, for this one request.
  Do not use Ritchie Bros./IronPlanet/GovPlanet/GovDeals data in any form.
- **No personal data:** no accounts required, nothing persisted, no titles/URLs in logs or analytics,
  `assertNoStaffPii` holds on every estimator page and API response.
- **No guarantees:** never use "guaranteed", "exact", "worth", "value of", "appraisal", "you will win" or
  "market value" in UI/API copy. Use "typical sold range", "our estimate", "suggested max bid". A unit test
  greps the estimator UI/API strings for the banned words.
- **Freshness honesty:** always state the data runs to `data_coverage.to` and show `FeedFreshnessChip`s.

## 10. Test plan

### 10.1 Unit tests — `scripts/test-estimator.ts` (`npm run test:estimator`, part of `npm test`)
Use `docs/estimator/fixtures/price_history_sample.json` (372 real rows, §12) and hand-built rows.
- `parseLotTitle`: ≥ 25 real titles → kind/year/make/model/km (e.g. "2013 Toyota Tacoma (144,292 km)" → km 144292;
  "2017 Chevrolet Express 2500 Cargo Extended - Involved in an Accident, Sold for Parts" → forParts; "2022 Ford F-250
  Front Bumper" → part; "Honda EZ3500 Portable Generator" → non-dated, tokens include "generator"; f150/F-150/f 150 equal).
- Weighted quantiles: equal weights equal `computeCompStats` on random arrays; known small cases; single row.
- Outliers: nominal/bulk/contract/extreme counted; `show_all` includes them; fewer than 8 rows → no fences.
- Tiers: T1 → T2 → T3 fallback; province → national fallback; age window ±2.
- Adjustments: β clamped; mileage gate off when < 30 rows with km; hours note.
- Max bid: own_use vs resale, low-confidence → p25, rounding steps, never > p75, null when ≤ 0, null when not ok.
- Confidence: monotone in n and spread; T3 capped; insufficient below 8.
- Schema: rejects unknown keys, bad years, `javascript:`/`http:` URLs, oversize strings, PostgREST syntax in make/model.
- `linkBack`: allow-list incl. subdomains; rejects look-alikes (`gcsurplus.ca.evil.com`, `evilgcsurplus.ca`).
- Flag: route handler `POST`/`GET` → 404 with `ESTIMATOR_ENABLED` unset, 200 with `"1"` (call the exported handler with a `Request`; stub the reader).
- No network: `fetch` stub fails on any call during `estimateFromRows`.
- Banned-words grep over `app/estimate/**` and `lib/estimator/**` strings.

### 10.2 Playwright — `e2e/tests/estimator.spec.ts` (desktop + mobile projects)
- Title mode: paste "2016 Ford F-150 XLT SuperCrew 4WD" → result `data-status="ok"`, band p25 ≤ median ≤ p75, max bid shown,
  `n` chip, date span, attribution text visible, "We read it as" chips.
- Form mode: vehicle Ford F-150 2016 ON → same; switching kind to equipment shows hours not km.
- Thin data: Toyota Tacoma 2014 in a province with few rows → "Not enough comparable sales", no max bid, broadening links work.
- Outliers: a query whose pool contains C$1 / bulk rows shows the "left out" line; "Show all" changes `data-n` and toggles back.
- Mixed: "laptop" (with accessories) shows the mixed note and kind links.
- Link-back: gcsurplus.ca URL renders the link with `rel` containing `nofollow`; a non-allow-listed URL renders no link; the mock
  server sees no request to either host (route-intercept `**/*gcsurplus*` and fail if hit).
- No-JS: with `javaScriptEnabled: false`, the GET form still returns a result.
- Quality bars on every estimator page: `trackConsole` empty, `noHorizontalOverflow`, `axeSeriousOrCritical` none, `assertNoStaffPii`.
- API: `POST /api/estimate` happy path, 400 on bad input, rate-limit returns 429 after the limit (use a unique key/IP header the
  rate limiter trusts in the mock env, or skip with a note if the memory limiter makes it flaky).
- Flag off: covered by unit test (one shared server runs with the flag on). Optionally a second Playwright config with the flag
  off asserting 404 for `/estimate` and `/api/estimate`.
- Screenshots via `shot(page, "60_estimate_…")`.
- The existing suites (`public`, `search`, `signed-in`) must still pass unchanged.

### 10.3 Accuracy back-test — `scripts/backtest-estimator.ts` (`npm run backtest:estimator -- --batches <dir>`)
- Input: the full local copy of the live load (`--batches /workspace/yk-team/surplus-bus/docs_local/ingest_live_2026-11-09`,
  same format `e2e/mock-supabase.ts` reads with `E2E_LIVE_COPY`) or, without it, the fixture (smoke only; say so in the report).
  Runs `estimateFromRows` in-process; no database, no network.
- **Temporal holdout:** train = closing_date < 2025-07-01; test = 2025-07-01 … 2025-12-31. Also a second fold
  (train < 2025-01-01, test = Jan–Jun 2025) to show stability. Test items are fed as **title mode** with the
  title's own year/km, and `province` = the item's province; the item itself is never in its own comps.
- Exclude from the test set the rows the outlier rules would exclude (nominal, bulk, contract) and for-parts rows
  unless condition = for_parts; report how many.
- Metrics per segment (all, vehicle, heavy_truck, powersport, equipment, trailer, electronics, other; and by
  confidence level and tier): `coverage` (share with status ok), `MAE = mean|median − actual|`,
  `MdAPE = median(|median − actual| / actual)`, `hit_IQR` = share with p25 ≤ actual ≤ p75,
  `hit_maxbid` = share with actual ≤ max_bid (how often the suggestion would have won at that price, informational),
  and the same metrics for the **baseline** in §0.2 (implement it in the script).
- Ablations: with/without age adjustment (T1, T2), with/without recency weighting, mileage on/off. The script writes the
  winning switches and β values to `lib/estimator/coefficients.generated.ts` (deterministic output, provenance header).
- Output `docs/estimator/BACKTEST_REPORT.md` (tables + a one-paragraph plain-English summary) and
  `docs/estimator/backtest_results.json`. Commit both (they contain aggregates only, no rows).

## 11. Commands

```bash
cd /workspace/yk-team/surplus-bus/estimator-wt     # or your clone, on feature/price-estimator
npm ci
npm run lint
npm run typecheck
npm test                       # includes test:estimator
npm run backtest:estimator -- --batches /workspace/yk-team/surplus-bus/docs_local/ingest_live_2026-11-09
npm run build
npx playwright install chromium   # once
e2e/run.sh                         # full suite incl. estimator.spec.ts (builds with the mock env)
# if the estimator seed is gated:  E2E_ESTIMATOR_SEED=1 e2e/run.sh tests/estimator.spec.ts
```
Use only the local mock env from `e2e/mock-supabase.ts --print-env`. Never point any command at a live Supabase
URL or key, even read-only. If the local live copy directory is missing, run the back-test on the fixture and say so.

## 12. Fixture

`docs/estimator/fixtures/price_history_sample.json`: 372 real rows from the Nov 9, 2026 load, chosen to exercise the
engine (`_groups`: 70 Ford F-150, 50 Silverado, 30 Grand Caravan, 6 Toyota Tacoma (thin), 15 vehicles sold for parts,
12 vehicle parts, 40 power generators, 12 lab signal generators, 35 laptops, 15 laptop accessories/bulk, 20 snowmobiles/ATVs,
10 nominal-price lots, 15 multi-quantity lots, 12 Nova Scotia rows, 30 misc). Lot ids replaced with `fx-NNNN`; description,
hash and timestamps dropped; `category` cut to its quantity prefix; build aborts on any email/phone/contact text.
Rebuild: `python3 docs/estimator/fixtures/make_fixture.py <batches dir>`. Fields: `external_id, group, feed_key, kind, title,
sold_amount, closing_date, province, city, category, licence_id, source_url`. The `group` field is for tests only — never
use it in the engine.

## 13. Acceptance criteria

See `docs/estimator/ACCEPTANCE_CHECKLIST.md` (every box must be ticked with evidence). In short:
1. Flag off by default: `/estimate` and `/api/estimate` 404; no links; no sitemap entry.
2. Flag on: title and form modes return the contract in §7; thin data and mixed results are honest; no max bid without a range.
3. Back-test on the full local copy, Jul–Dec 2025 holdout, vehicles: MdAPE ≤ baseline (≈ 0.34) and MAE ≤ baseline (≈ C$4,500);
   `hit_IQR` between 0.42 and 0.58 overall and for vehicles (a calibrated middle-half range); coverage ≥ 75% for vehicles;
   hit-rate non-decreasing low → medium → high. Numbers re-measured by your script are the source of truth; if the
   baseline you measure differs from §0.2, report both.
4. Every adjustment that is on is justified by the back-test; every one that is off says why in the UI note.
5. All of lint, typecheck, `npm test`, build and the full Playwright suite (existing + new, desktop + mobile) pass.
6. Legal rules in §9 verified by tests; no network calls to listing hosts; attribution on every result.
7. Design: matches `/comps` (v4.1 tokens/classes only, no new colours or fonts, no gradients/glass), axe clean, no overflow at 390px.
8. No migrations, no new dependencies, no secrets, nothing pushed or deployed.

## 14. Non-goals (this branch)

- Photo upload or any image recognition (phase 2 below).
- Any AI/LLM call, any paid API, any third-party pricing data.
- Fetching, scraping or previewing auction pages; reading GCSurplus live auctions; storing lot links.
- Live/current auction listings, bid tracking, auto-bidding, notifications about estimates.
- Saving estimates to accounts, sharing pages, SEO landing pages, sitemap entries.
- Inflation/market-trend adjustment beyond the optional recency weight.
- Paywalling or plan limits (Yonatan decides later; keep the code entitlement-agnostic).
- Changing ingest, schema, RLS, existing search/kind behaviour (except adding rules to the shared module with tests, if strictly needed).

## 15. Phase 2 (describe only — do NOT build): photo → kind suggestion

- Goal: a bidder snaps or uploads a photo and we **suggest** the kind (and maybe a make) to pre-fill the form; the price
  engine is unchanged. The user always confirms.
- Preferred design: run an open-source CLIP-style model **in the browser** (e.g. OpenCLIP ViT-B/32 or SigLIP exported to ONNX,
  run with transformers.js / onnxruntime-web, weights self-hosted on our own domain), zero-shot against prompts built from
  `KIND_LABEL` and the common head nouns ("a photo of a pickup truck", "a photo of a generator", …). The photo never leaves the
  device; no per-photo cost; no outside service. Alternative: a small self-hosted inference server we run ourselves (not a
  third-party API).
- Must-haves before it is built: licence check of the exact weights (and their training-data terms) for commercial use; model
  size/latency budget on a mid-range phone (target < 3 s, < 100 MB download, lazy-loaded behind a button); an accuracy check on
  our own photos (not auction photos); clear copy "Suggestion from your photo — please confirm"; no storage of photos; an
  `ESTIMATOR_PHOTO_ENABLED` flag off by default; Yonatan's approval.
- Explicitly not allowed: sending photos to any external AI API, using auction-site photos to train or test.

## 16. Hand-back (what to return when done)

Commit on `feature/price-estimator` in small logical commits (`feat(estimator): …`, `test(estimator): …`,
`docs(estimator): …`). Do not push. Then report:
1. `git log --oneline aefb535..HEAD` and `git diff --stat aefb535..HEAD`.
2. Results of lint / typecheck / `npm test` / build / Playwright (counts, desktop + mobile).
3. The back-test table (baseline vs. estimator, by kind and confidence) and the adjustments switched on.
4. The filled-in `ACCEPTANCE_CHECKLIST.md` and screenshot paths.
5. Open questions and anything you could not do. Then stop and wait for Yonatan's approval.
