# Surplus Bus — Photo-to-Bid Pre-Build Stress Test, Market Data Rights and Legal Gate

**Prepared:** 2026-11-09 (America/Toronto)  
**Decision:** CONDITIONAL GO for further isolated research/prototype; NO GO for production numeric price recommendation or multi-market data ingestion until source-specific permissions and accuracy gates pass.  
**Scope:** Canadian commercial SaaS that analyzes user-authorized images of objects and returns conditional bidding intelligence for third-party auctions. This is product/compliance research, not legal advice. No image model has been implemented or tested in this audit.  
**Evidence:** Read-only SQL against Supabase `nycsuizssbpaqyhxxxup`; existing `feature/price-estimator` spec (commit `fe6fb09`); primary-source legal and platform documents linked below. No production writes were performed.

## A. User promise and non-negotiable boundaries

1. Customer photographs an actual object, or supplies images they own/are authorized to upload. User enters manually observed features, model and condition.
2. An optional vision model suggests item type, brand/model, visible damage and *unknowns*. User confirms; system does not claim hidden functionality or authenticity.
3. Historical **completed transaction prices**, permitted contemporary **asking-price indications**, and **new/replacement prices** remain three separately labeled source families. NEVER silently merge them into one `market value`.
4. Comparable matching must identify completed product versus part, one item versus bulk lot, exact model and revision, usable/for-parts condition, local costs and source age.
5. Bid ceiling is conditional on identified uncertainty and owner-entered buyer fees, taxes, transport, inspection/repair, buyer purpose/margin. Show computation and sources. Fail closed to **NO NUMERIC BID** on insufficient matches.
6. Bidding happens on the third-party site through a plain outbound link; no scraping, automatic bidding, framing, caching or misrepresentation of live auction state without explicit contractual rights.
7. No user photos or scraped imagery are used to train a model without independently acquired rights and distinct consent.

## B. Read-only baseline: data quality and adversarial matching

Production table `public.price_history_lots` (observed Nov 9): **85,217** rows (GCSurplus 84,992; Nova Scotia 225). All 85,217 include `sold_amount`; one row has a **negative** price; 234 GCSurplus rows and 32 NS rows have sale amount ≤ C$1. **65,307** of all records have blank/null `category` (~76.6%); all GCSurplus rows have `kind='gcsurplus_sold'`, i.e., feed identity, not object identity. **225/225** NS entries have missing `closing_date`. **4,254** GCSurplus titles are shorter than 12 characters. GCSurplus temporal range: 2023-01-02 to 2025-12-30.

**Counterexample:** 598 exact normalized `assorted office furniture` sales: C$1–C$12,978. This is not a safe comp group for a photograph of one desk.

**Deliberately naive forward-time baseline:** grouped title regex, training median from 2023–2024, holdout 2025; median absolute percentage error (MdAPE; lower better):
- Dell laptop keyword: train 98, holdout 41, **15.4%**; category includes different models, quantities and condition; not production quality.
- Filing-cabinet keyword: train 1,614, holdout 597, **63.8%**.
- Generator keyword: train 522, holdout 158, **79.7%**.
- Broad F-150 keyword: train 137, holdout 135, **256.9%** — keyword included *console/seat parts* and unrelated items (`Lot of 150 Vinyl Binders`, `KF-150 Heat Sealer`).
- Crude F-150 potential full-vehicle title filter (has year, excludes parts keywords): train 127, holdout 69, **43.8%**. This is still heterogeneous and not production ready.

**Important:** These are diagnostics of a naive title grouping, not an evaluation of the proposed statistical estimator or any visual recognition model. The results establish the *requirement* for well-defined comparability and honest refusals, not a prediction of achievable accuracy.

### Dataset gates before numeric estimates
- Independent object kind taxonomy and high-precision **complete item vs part** classification.
- Match exact model, generation, size/capacity, mileage/hours and quantity; reject mixed lots and NS land/awarded tenders for physical-object pricing.
- Exclude or quarantine ≤ C$1 records and negative prices pending per-feed semantics review; do not treat every C$1 as ordinary market sale.
- Show n, matching attributes, dates, source, filtering/exclusions, uncertainty and fees. Prefer recent matched transactions and Ontario/Canadian locations.
- Test 2025 held-out data, second time fold, MAE/MdAPE and coverage **including abstentions**. Make no accuracy promise until measured.
- If confidence too low, return identification and research guidance without max bid.

## C. Source rights matrix — default deny until proven for intended pricing use

| Data family/source | What it can tell us | Current status for commercial automated pricing | Action |
| --- | --- | --- | --- |
| GCSurplus official historical sold ZIP/CSV | Actual historical sales | **Conditional YES** under OGL-Canada for the licensed open dataset; attribution; personal info excluded; not the live auction site | Keep as core; verify each resource license and timestamp |
| Nova Scotia official open-data CSV | Historic property/tender awards | **Conditional YES** for in-scope OGL-NS datasets; many rows not ordinary physical-object comparable sales; awardee personal info omitted | Use only appropriate item records with licence/attribution |
| CanadaBuys official CSV | Notices/awards | **Conditional YES** for licensed public dataset, but tender amounts are not equivalent to used-equipment sale prices | Separate procurement intelligence, don't treat tender notice as comp |
| eBay Browse API | Current active listing/asking prices | **NOT CLEARED** for cross-market price estimation or mixing with other providers' data: eBay API licence has explicit restrictions on derived average pricing, cross-provider public displays and third-party pricing use. A general API key is insufficient | Request purpose-specific written rights, or avoid use |
| eBay Marketplace Insights API | Sold item data up to 90 days | **RESTRICTED / unavailable to new users** under current documentation; restricted data pricing-tool rights require eBay's express prior written permission | Do not depend on it for launch |
| Facebook Marketplace | User asking prices | **NO AUTO COLLECTION** without permission | Partnership/approved data only; otherwise link-out |
| Kijiji | Local asking prices | **NO AUTO COLLECTION** without express written permission | Partnership/approved feed only |
| AutoTrader Canada | Vehicle asking prices | **NO AUTO COLLECTION** in site terms | Dealer-supplied licensed inventory feed or data contract, not site crawling |
| Retail/manufacturer catalog prices | New/refurbished reference | **Only by agreed API/feed terms or licensed supply**; merchant account APIs are not general market-price access | Pursue supplier/dealer partnerships and clarify permitted estimation/aggregation |
| Private sellers/repair shops/auctions partners | Actual verified sale invoices, item-condition records | **Possible with explicit data-sharing terms, privacy and ownership checks** | High-priority partner pathway |
| User-entered price observations | Bid and seller asking price user personally knows | **Case-by-case, not a workaround to platform terms**; no storing/rebuilding prohibited third-party datasets | Use only transient user inputs; no site fetch, no pooled dataset pending legal review |

**Specific eBay caution:** Its API License Agreement restricts deriving site-wide/average category selling price without express permission, public display commingling, and using restricted API data to create pricing tools without express prior written consent. This directly implicates a multi-market valuation engine. Never interpret `available via an API` as permission for this proposed use.

Sources (reviewed Nov 9 2026):
- OGL–Canada: https://open.canada.ca/open-government-licence-canada
- Nova Scotia OGL: https://novascotia.ca/opendata/licence.asp (direct fetch timed out; re-verify before NS changes)
- eBay API Licence: https://developer.ebay.com/support/api-license-agreement
- eBay Marketplace Insights: https://www.edp.ebay.com/api-docs/buy/marketplace-insights/static/overview.html
- eBay marketplace support: https://developer.ebay.com/api-docs/buy/static/ref-marketplace-supported.html
- eBay user agreement: https://www.ebay.com/help/policies/member-behavior-policies/user-agreement?id=5414
- Meta scraping statement: https://about.fb.com/news/2021/04/how-we-combat-scraping/
- Kijiji terms: https://community.kijiji.ca/t/kijiji-terms-of-use/29
- AutoTrader Canada terms: https://www.autotrader.ca/company/terms-of-use/

## D. Canadian legal/compliance checklist

**Source contracts and copyright:** Track the exact rights to access/download, commercially reuse, transform into prices, aggregate, cache, quote, display photographs, retain data, provide attribution and terminate/revoke. Robots compliance does not substitute for licence; user-provided listing screenshots do not automatically grant permission to republish third-party copyrighted images.

**Privacy:** PIPEDA's purpose identification, meaningful consent, data minimization, safeguards, retention, access/correction and deletion requirements. User photos may reveal faces, plates, location, address, GPS EXIF, serial numbers and owners. Default to client-side EXIF stripping, image cropping/redaction, optional on-device inference, short/no retention and no training without separately authorized consent. If future biometric extraction/recognition of people is contemplated, require a separate review; do not implement in object model.

**Consumer marketing/accuracy:** Federal Competition Act forbids materially misleading representations; Ontario Consumer Protection Act, 2002 has analogous unfair-practice rules. Don't claim certified appraisal, exact resale value, guaranteed win, or partnerships not held. Clearly disclose if "max bid" is conditional, its cost inputs and material unknowns. Avoid implying that listing/asking price is a completed sale.

**Email/digests:** If marketing/commercial messages are sent, CASL requires consent or a valid exception, identification and unsubscribe. A one-off interactive price result is not automatically a marketing email.

**Ontario legislative version:** Ontario Consumer Protection Act, 2023 source page currently states not yet in force; use the current in-force law and have counsel re-check ahead of launch.

Primary sources:
- PIPEDA fair info principles: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/
- Consent: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/
- Competition Bureau: https://competition-bureau.canada.ca/en/deceptive-marketing-practices/types-deceptive-marketing-practices/false-or-misleading-representations
- Ontario 2002 Act: https://www.ontario.ca/laws/statute/02c30
- Ontario 2023 Act status: https://www.ontario.ca/laws/statute/23c23
- CASL CRTC: https://crtc.gc.ca/eng/internet/anti/reg.htm

## E. Mandatory pre-build adversarial test cases

| Case | Expected safe behavior |
| --- | --- |
| Photo of F-150 interior console vs complete pickup | Detect part/assembly; never price as truck |
| Blurry generator with unreadable model plate | Request plate/hours/capacity; no confident bid |
| Photo of 10 laptops vs one laptop | Ask quantity and working status; avoid per-lot/per-unit inversion |
| Power generator vs laboratory signal generator | Category separation |
| New branded tool packaging vs counterfeit/empty box | Don't assert authenticity/contents; request inspection |
| Lot screenshot from a restricted marketplace | No server fetch, no rehosting/retaining platform images; enforce user rights review |
| 2023 sale compared to 2026 asking listing | Distinct evidence types and date badges, do not compute one blended "sold" median |
| USD listing vs CAD auction | Disclose conversion rate/date, freight, import tax; avoid stale FX |
| Price C$1 / negative / bulk stock / scrap | Quarantine or mark anomalous; do not dominate estimates |
| 3 comparable transactions only | Return "insufficient data" with no price ceiling |
| High missing cost assumptions | Ask for fees/repair/transport; show scenario ranges, no fake certainty |
| Unknown seller/platform or URL containing local IP/metadata | Never fetch URL; only safe external navigation after user action |
| EXIF GPS, faces, documents visible in image | Strip EXIF/redact/suppress; don't persist or use for training |
| Repeated massive uploads / hidden prompt in image | Enforce mime/size/pixel/time limits and data-only prompt isolation |
| Source licence revoked or API unavailable | Disable source; cached data handled per terms; estimates clearly degrade/abstain |
| Mixed active asking and completed sale records | Show separated indicators; asking prices never labeled realized |
| Model confidence high but thin comps | Two distinct confidences; estimator must abstain |
| Plausible model with hidden catastrophic damage | Flag unobservable condition; no mechanically sound assertion |

## F. Proposed objective gates (design thresholds; not measured results)

1. **Legal:** 100% of active source adapters have explicit commercial/derivative/use permission documented; source rights registry with deny-by-default, terms URL/date, attribution, retention and revocation.
2. **Privacy:** client-side metadata stripping and image deletion/no-retention tests pass; no image/serial/PII logging; user consent clearly scoped. No third-party image model without approved privacy & licensing review.
3. **Recognition:** representative user-authorized photo test set, stratified by kind/lighting/condition; exact-model vs category accuracy and calibration independently measured; low-confidence abstention. Do not set an arbitrary accuracy claim before collecting ground truth.
4. **Valuation:** at least two time-based folds and category-level MAE/MdAPE, robust no-signal withholding, no systematically overoptimistic max bid, reproduce comparisons with truly held-out transactions (no near-duplicate leakage), track coverage/abstention.
5. **Performance:** set measurable mobile targets (e.g. p95 photo-to-first-result within 10 sec under realistic network/device) and cost per estimate, including model download, memory and energy; benchmark before locking architecture.
6. **Security:** upload decompression-bomb and EXIF attack tests, non-fetch URL rule, query/role/RLS isolation, quotas, rate limits, prompt injection treated as data.

## G. Execution sequence and decision rights

- **NOW / Titi:** finish text-based estimator, fix poor kind taxonomy, strengthen exact-item matching, handle outliers and backtest; continue PR #28 unrelated security and licensed feed tasks.
- **NOW / Claude:** isolated prototype/research ONLY: image capture UX, editable observations, unknown-condition questions, two viable vision licensing/latency options, mocked typed interface to the price engine. Research marketplaces permission registry; do **not** ingest unauthorized data.
- **TRIGGERED NEXT:** implement commercially licensed visual recognition and any additional market source only after rights, actual photo accuracy, privacy, held-out pricing performance and operational cost are demonstrated.
- **FUTURE OPTION:** signed supply-data partnerships, marketplace integrations, sharing, authorized inventory feeds.

No merge, production deployment, production database writes/migrations, customer contact, spend or source agreement outreach without separate owner approval. This document authorizes **planning and nonproduction test design**, not any external source access beyond the read-only primary-source documentation reviewed above.
