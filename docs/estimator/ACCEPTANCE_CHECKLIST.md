# Price Estimator — acceptance checklist

Tick each box only with evidence (command output, test name, screenshot path or file:line).
Branch `feature/price-estimator`, base `aefb535`. Spec: `docs/estimator/BUILD_BRIEF.md`.

## A. Safety and scope
- [ ] Nothing pushed, no PR opened, nothing deployed, no migration run, no live Supabase touched (state it explicitly).
- [ ] No AI/LLM or paid service calls; no new npm dependencies (`git diff aefb535 -- package.json package-lock.json` shows only scripts).
- [ ] No database migrations added (`git diff --stat aefb535 -- supabase/` is empty).
- [ ] No secrets or env values committed; `ESTIMATOR_ENABLED` not set in `vercel.json` or any committed env file.
- [ ] Odd-items handling: rebased onto the shared `lib/opendata/outliers.ts`/`kinds.ts` **or** `lib/estimator/outliers.ts` is a marked TEMPORARY stand-in with the same contract (say which).

## B. Feature flag
- [ ] `ESTIMATOR_ENABLED` unset → `GET /estimate` is a 404 page; `POST`/`GET /api/estimate` → 404 `{"error":"not_found"}` (unit test name).
- [ ] Flag off → no "Estimate a lot" link on `/comps` or in nav/footer; `/estimate` not in `sitemap.xml`.
- [ ] Flag is read at request time (no rebuild needed to change it).

## C. Behaviour (flag on)
- [ ] Title mode parses year / make / model / km / for-parts and shows "We read it as" chips with an Edit path.
- [ ] Form mode shows km for vehicles/heavy trucks, hours for equipment, "what is it" for other kinds.
- [ ] Result shows p25 / median / p75 band, suggested max bid, n, date span, scope (province / all provinces), confidence with reasons.
- [ ] Tier fallback T1 → T2 → T3 and province → national work and are reported in `match`.
- [ ] Outliers: excluded counts by reason shown; "Show all" includes them and changes the numbers; "Hide them" restores.
- [ ] Thin data (< 8 kept comps) → "Not enough comparable sales", found vs. needed, the individual sales, broadening links, **no range and no max bid**.
- [ ] Mixed kinds → mixed note + kind links, no range, no max bid.
- [ ] Adjustments: each one applied is listed; each one not applied has an honest note (mileage, hours, condition).
- [ ] Max bid: own use vs resale, fees % and extra costs respected, Low confidence → p25, rounding steps, never above p75.
- [ ] API matches the contract in BUILD_BRIEF §7 (400 / 404 / 429 / 503 / 500 shapes; `Cache-Control: no-store`).
- [ ] Data unavailable states use `DataStateNotice` (not_configured / not_migrated / error).

## D. Legal and data rules
- [ ] OGL–Canada attribution on every result state; OGL–Nova Scotia when NS rows are used; API returns `attribution[]`.
- [ ] No request is ever made to `lot_url` or any auction host (unit fetch-stub test + Playwright route-intercept test).
- [ ] Link-back only for allow-listed https hosts (gcsurplus.ca, novascotia.ca + subdomains); look-alikes rejected; `rel` includes `noopener noreferrer nofollow`.
- [ ] No listing photos/descriptions copied, framed or cached; no Ritchie Bros./GovDeals data used.
- [ ] Nothing persisted; no titles, URLs, IPs or request bodies logged; analytics event (if added) has only allow-listed coarse props and is off by default.
- [ ] `assertNoStaffPii` passes on all estimator pages and API responses.
- [ ] Banned-words test passes (no "guaranteed", "exact", "worth", "value of", "appraisal", "you will win", "market value").
- [ ] Data-coverage note ("sales up to Dec 2025") and freshness chips shown.

## E. Data access
- [ ] Reads only through `lib/opendata/queries.ts` `reader()` with an explicit column list (no `select("*")`, no browser client for `price_history_lots`).
- [ ] All user text passes `cleanTerm`/`planSearch`/`plannedOrFilter`; injection cases covered by unit tests.
- [ ] ≤ 4 tier queries per request, each ≤ 5,000 rows.

## F. Accuracy (full local copy, `npm run backtest:estimator -- --batches …`)
- [ ] `docs/estimator/BACKTEST_REPORT.md` and `backtest_results.json` committed (aggregates only).
- [ ] Holdout Jul–Dec 2025, vehicles: MdAPE ≤ baseline (≈ 0.34) — value: ____ vs baseline ____.
- [ ] Holdout Jul–Dec 2025, vehicles: MAE ≤ baseline (≈ C$4,500) — value: ____ vs baseline ____.
- [ ] `hit_IQR` within 0.42–0.58 overall (____) and for vehicles (____).
- [ ] Vehicle coverage ≥ 75% (____).
- [ ] Hit-rate non-decreasing low → medium → high (____ / ____ / ____).
- [ ] Second fold (Jan–Jun 2025) reported; no metric swings by more than 10 points between folds, or the difference is explained.
- [ ] Every adjustment switched on in `coefficients.generated.ts` is justified by the ablation table.

## G. Quality gates
- [ ] `npm run lint` clean.
- [ ] `npm run typecheck` clean.
- [ ] `npm test` (incl. `test:estimator`) passes — assertion count: ____.
- [ ] `npm run build` passes.
- [ ] `e2e/run.sh`: all existing tests still pass and `estimator.spec.ts` passes on desktop and mobile — totals: ____.
- [ ] No console errors, no horizontal overflow at 390 px, axe: no serious/critical issues on estimator pages.
- [ ] Works with JavaScript disabled (GET form).
- [ ] Design uses only v4.1 tokens/classes (`--sb-*`, `.card`, `.chip`, `.btn*`, `.guidance-band*`, `.sb-title`, `.sb-mono`); no new colours, fonts, gradients or glass; 44 px tap targets; reduced motion respected.
- [ ] Screenshots saved (list paths).

## H. Hand-back
- [ ] `git log --oneline aefb535..HEAD` and `git diff --stat aefb535..HEAD` included.
- [ ] Open questions listed (e.g. province tax defaults verified? paywall? which hosts to allow for link-back?).
- [ ] Stopped and waiting for Yonatan's approval before any push or deploy.
