# Surplus Bus — Source Atlas & Rights-Gated Integration Queue
**Research date:** 2026-11-09 (Toronto). **Scope:** Canada-first government surplus discovery, photo-to-item identification, used-asset sold-price estimator, cross-market asking-price signals, procurement intelligence, bid cost/risk. Research only. Existing production ingestion and source terms must be independently rechecked before any NEW adapter is deployed.

## Status legend
- **A — dataset-licensed candidate:** the linked specific dataset has an open licence permitting commercial copying/adaptation with attribution, but field-level privacy and actual relevance must still be verified; source-site HTML outside that dataset is NOT covered.
- **B — public/free API candidate:** official API exists or reusable open data is documented; service operation, availability, rate limits, intended commercial use and current terms must be verified before integration.
- **C — contract/partnership candidate:** valuable, but commercial pricing, aggregation, storage, resale and derivative rights require a written data agreement; ordinary account/API access is not sufficient.
- **D — link-out/research only:** public browsing, sometimes past sales, but **NO permission for commercial automated ingestion established**.
- **X — default deny for automated access/use:** provider terms materially restrict crawling/data-mining or pricing-tool reuse; negotiate a specific licence if commercially essential.

Do not confuse **active asking price**, **completed sold price**, **procurement contract award**, **new replacement cost**, **valuation model output**, or **bid**. Preserve `price_basis`, `asset_kind`, `quantity`, `condition`, `currency`, `region`, `sale_date`, `observation_date`, `source_version`, `license_evidence` and `attribution` per record.

## 1. Licensed government data (Canada-first)

| # | Candidate | Evidence URL | Data/value | Class | Integration decision |
|---|---|---|---|---|---|
| 01 | GCSurplus “What Has Sold” | https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4 | Historical completed federal surplus sales **since Aug 2015**; current ingest uses 2023–2025 | **A** (OGL-Canada) | **Priority 1** — expand archive cautiously, dedupe by external ID; measure age degradation; keep live GCSurplus site OUTSIDE licence |
| 02 | Nova Scotia surplus Crown Property — public tenders | https://open.canada.ca/data/en/dataset/6079d764-419b-00e0-985e-d790ea84a3ac | Historical public tender purchase/removal of physical surplus; more relevant than NS land disposal | **A** (OGL-NS) | **Priority 1** — field/schema/date audit; check whether row is realized sale vs award; minimize awardee personal information |
| 03 | Nova Scotia surplus real-property disposals | https://open.canada.ca/data/en/dataset/5ad9d9b5-da24-b90c-5366-079fbb872556 | Disposed surplus land/buildings | **A** (OGL-NS) | Property vertical only; **never** train used physical-goods pricing on this |
| 04 | Nova Scotia surplus disposal revenue by category | https://open.canada.ca/data/en/dataset/27dcf011-8693-84c5-d2b1-bb9833cff29f | Government revenue totals by disposal category | **A** (OGL-NS) | Sector analysis only; not object-level comps |
| 05 | CanadaBuys open tender notices | https://open.canada.ca/data/en/dataset/6abd20d4-7a1c-4b38-baa2-9525d0bb2fd2 | Procurement opportunities; current feed already used | **A** (OGL-Canada) | Continue licensed **official CSV only**, not CanadaBuys HTML scraping |
| 06 | CanadaBuys award notices | https://open.canada.ca/data/en/dataset/a1acb126-9ce8-40a9-b889-5da2b1dd20cb | Award/cancelled/expired procurement outcomes; daily current FY / monthly historic | **A** (OGL-Canada) | **Priority 2** procurement intelligence, not auction sale comps; 2026 field restructuring applies |
| 07 | CanadaBuys contract history | https://open.canada.ca/data/en/dataset/4fe645a1-ffcd-40c1-9385-2c771be956a4 | Federal contract value history since Jan 2009; monthly refresh | **A** (OGL-Canada) | **Priority 2** analytics, vendor/award trends; keep contract price separate |
| 08 | Legacy CanadaBuys contract history | https://open.canada.ca/data/en/dataset/53753f06-8b28-42d7-89f7-04cd014323b0 | Archived procurement historical data | **A** (OGL-Canada) | Defer; compare de-duplicated overlap with current contract history |
| 09 | Toronto Bids awarded contracts | https://open.toronto.ca/ (search “Toronto Bids Awarded Contracts”) | Municipal contract amounts/awards in downloadable open data | **B** pending *dataset-specific* City licence check | Municipal procurement lane, **not** used-item price comps |
| 10 | BC Bid historical opportunities / awards | https://www2.gov.bc.ca/gov/content/bc-procurement-resources/bc-bid-resources/bc-bid-historical-data | 2015–2022 opportunities and contract awards with restrictions | **D** | Research and link out; licensed redistribution/export not established |
| 11 | USAspending.gov federal awards API | https://api.usaspending.gov/docs/endpoints | U.S. federal spending / contracts | **B** open public API | Optional US procurement vertical; **not** auction sold comps |
| 12 | Ontario “Surplus property” catalogue | https://data.ontario.ca/dataset/surplus-property | Metadata for an Ontario surplus-property dataset | **D — NOT available** | Do not schedule ingestion: Ontario explicitly says underlying data under review/unavailable |

**Licence reference:** https://open.canada.ca/en/open-government-licence-canada/ . Check each resource licence independently (not every government website is under the licence). Nova Scotia OGL: https://novascotia.ca/opendata/licence.asp .

## 2. Official auction sites / live inventory discovery — do NOT silently treat as open feeds

| # | Candidate | Evidence URL | What it offers | Class | Decision |
|---|---|---|---|---|---|
| 13 | GSA Auctions official API (U.S.) | https://gsa.github.io/auctions_api/basics | **Official live JSON/XML listings API** documented at `api.gsa.gov/assets/gsaauctions/v2/auctions` and `api.data.gov` key; documentation describes 5000/day and 5/5 sec | **B** | **Priority 1 US pilot:** confirm live endpoint works in 2026, rate limits/terms and commercial display scope before first adapter |
| 14 | SaskSurplus (Saskatchewan) | https://www.sasksurplus.ca/ | Current Canadian government items **and a past-sale-results search** | **D** | **Priority 1 permissions review** for past outcomes; no collection until express permission/open licence shown |
| 15 | BC Auction | https://www2.gov.bc.ca/gov/content/bc-procurement-resources/buy-for-government/goods-and-services-catalogue/asset-recovery-disposal/bc-auction | Province-run asset recovery auction site | **D** | Official links; negotiate feed/API for structured listings |
| 16 | Alberta Surplus Sales | https://www.alberta.ca/government-surplus-sales.aspx | Provincial auctions, public tenders and official auctioneer links | **D** | Directory/link-out, permission request for machine-readable sale results |
| 17 | Alberta public auction schedule | https://surplus.gov.ab.ca/AuctionsList.aspx | Auctions and auctioneers (often external) | **D** | Directory only; third-party lot content may have different terms |
| 18 | Toronto Bids Portal | https://www.toronto.ca/business-economy/doing-business-with-the-city/searching-bidding-on-city-contracts/toronto-bids-portal/ | Official solicitations, awards and purchase offers | **D** for page; data collections may be **A/B** | Use portal links unless a specific licensed open dataset is identified |
| 19 | U.S. GSA completed sales dataset via GovAuctions.app | https://govauctions.app/research/open-dataset | Site claims CC BY 4.0 on compiled GSA-only historical results | **C/Rights due diligence** | Validate upstream GSA rights, dataset licence details, accuracy, reuse provenance, and Canadian comparability; don't treat aggregator rights as self-proving |

## 3. Contractable valuation, sold-price and market-feed partners

| # | Candidate | Evidence URL | Valuable signals | Class | Decision |
|---|---|---|---|---|---|
| 20 | Canadian Black Book | https://www.canadianblackbook.com/api/ | Licensed Canadian vehicle wholesale/trade-in/retail/private-party valuations and specs | **C** | **Priority 1 vehicle partnership**, request commercial pricing-engine derivation and user display rights |
| 21 | CARFAX Canada valuation suite | https://go.carfax.ca/data-driven-valuation | History/market-based car price range, damage/mileage/location factors | **C** | Vehicle premium tier; source specific records vs derived values |
| 22 | Manheim MMR valuations API | https://developer.manheim.com/apis/marketplace/valuations.html | Wholesale automobile pricing from auction history; nightly updates | **C** | Dealer/API access; negotiate consumer-facing display, Canadian coverage and derivative usage |
| 23 | EquipmentWatch Values API | https://equipmentwatch.com/api/values/ | Heavy equipment FMV, OLV, FLV by year, hours, condition, geography | **C** | **Priority 1 heavy equipment partnership**, potentially higher defensibility than broad scraping |
| 24 | EquipmentWatch taxonomy/specs/verification | https://equipmentwatch.com/api/ | Equipment model taxonomy, detailed specs, serial-year verification, costs | **C** | Image → exact machine model, cost/condition checking |
| 25 | BrickLink official price-guide API | https://www.bricklink.com/v3/api.page?page=references | Used/new LEGO last-6-month completed-sales price stats | **C** | Niche pilot, requires API account + explicit commercial reuse/derivative licence verification |
| 26 | Reverb Price Guide | https://reverb.com/price-guide | Public human-facing used instrument sold-price comparison | **D** | Manual link/reference, pursue licensed programmatic rights; public pages are not a bulk-use licence |
| 27 | GovAuctions.app research/API | https://govauctions.app/research | Site advertises CC BY 4.0 aggregates, and separately a paid API | **C / upstream-rights due diligence** | **High-potential lead but HIGH provenance risk**: operator says underlying data includes platforms with extraction restrictions; obtain provenance/contractual representations before integration |
| 28 | BidProwl research/API | https://bidprowl.com/research | Site advertises CC BY 4.0 government auction aggregates; API under separate terms | **C / upstream-rights due diligence** | Similar upstream legal & direct-competitor risk; API licence limits competing data feeds |
| 29 | Keepa price history API | https://keepa.com/api-docs/ | Amazon asking/offered history and product metadata | **C** | Paid API but Amazon upstream/usage rights need independent review; **not realized auction sale prices** |
| 30 | Rebrickable catalogue API/CSV | https://rebrickable.com/api/ | LEGO object/set/part identifiers, **no prices** | **C/B** pending terms | Identification and completeness of multi-part lots, not valuation |
| 31 | Dealer / refurbisher / liquidation inventory feeds | Direct opt-in data contracts; partner-controlled CSV, Shopify or Merchant accounts | Dealer own sale receipts, grades, returns, condition, real historical sold amount | **C** | **Priority 1 low-cost outreach hypothesis**, but only after owner approval and a written licence permitting SaaS commercial estimates |
| 32 | Google Merchant API | https://developers.google.com/merchant/api/overview | Account-authorized merchant product inventory/price | **C** account-scoped | Not a universal public Google Shopping price feed; use only consenting merchant's data via OAuth |

## 4. Product identification, visual aids and item-condition signals

| # | Candidate | Evidence URL | Application | Class | Caveat |
|---|---|---|---|---|---|
| 33 | Wikidata product entities | https://www.wikidata.org/wiki/Wikidata:Data_access | CC0 structured make/model/producer taxonomy; product identity enrichment | **B (CC0)** | Not always verified, complete or exact-model granular |
| 34 | Open Icecat | https://icecat.com/content-subscription/ | Manufacturer-provided tech-spec sheets from 600+ brands in Open Icecat | **C/B** under Icecat *open content licence* | Must check exact terms and whether photos/video reuse is reserved to resellers; do NOT assume every asset is free |
| 35 | Wikimedia Commons | https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en | Example/reference object images for vision testing/UI with per-file permission | **B** only when each file's commercial reuse licence verified | Per-image author attribution, licences/share-alike, privacy and training rights separately reviewed |
| 36 | U.S. NHTSA vPIC VIN decode | https://vpic.nhtsa.dot.gov/api/ | VIN -> year/make/model/engine/specifications | **B** official free API | VIN or exact model needed; API rate control; check country coverage |
| 37 | Transport Canada vehicle recalls | https://open.canada.ca/data/en/dataset/1ec92326-47ef-4110-b7ca-959fab03f96d | Safety recall data, model/year hazard signal | **A** OGL–Canada | It is a caution flag, not mechanical condition proof |
| 38 | Rebrickable product identity | https://rebrickable.com/api/ | LEGO exact set/part reference | **C/B** terms pending | Avoid data that belongs to other pricing sites |

## 5. Bid-cost, inflation, currency and logistics enrichment

| # | Candidate | Evidence URL | Value | Class | Caveat |
|---|---|---|---|---|---|
| 39 | Bank of Canada Valet API | https://www.bankofcanada.ca/valet-api-how-to/ | Official daily FX for USD/CAD etc., no key/cost | **B** | Respect API/site terms and attribution; display rate date |
| 40 | CRA GST/HST tables | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html | Jurisdiction/year-specific tax rates | **B** reference | Tax depends on supply/type/location; old generic 13% default across provinces is unsafe |
| 41 | Statistics Canada Web Data Service | https://www.statcan.gc.ca/en/developers/wds/user-guide | CPI, price indices, economic adjustments | **B** API | Inflation index != item resale appreciation; avoid unjustified time adjustments |
| 42 | EquipmentWatch ownership/operating costs | https://equipmentwatch.com/api/ | Ownership, operating, repair proxies | **C** | Partner licence and model specificity |
| 43 | User-owned delivery/inspection cost estimates | User input, vetted local transport/inspection partner quotes | Transport, import, fees and repair cost | **C** user or partner authorized | Do not invent quote, tax status, or inspection outcome |

## 6. Explicit restricted marketplace/source watchlist

| # | Source | Policy | Class | Recommendation |
|---|---|---|---|---|
| 44 | eBay | https://developer.ebay.com/support/api-license-agreement | **X for valuation tool absent written purpose-specific permission** | Browse API ≠ pricing-tool licence; restricted-API derivative pricing may need express consent; Marketplace Insights restricted |
| 45 | GovDeals | https://prod-seo.govdeals.ca/en/content/site-terms | **X** | Prohibits spiders/data mining/archiving; plain outbound links only |
| 46 | IronPlanet/GovPlanet/Ritchie group | https://www.ironplanet.com/pop/terms_page.jsp?id=5 | **X** | Explicit restrictions on auction data in **used equipment pricing tools/dashboards** |
| 47 | Kijiji | https://community.kijiji.ca/t/kijiji-terms-of-use/29 | **X** | Express written permission for automated collection |
| 48 | AutoTrader Canada | https://www.autotrader.ca/company/terms-of-use/ | **X** | Personal noncommercial website access, prohibits automated collection; dealership data partnership instead |
| 49 | Facebook Marketplace | https://about.fb.com/news/2021/04/how-we-combat-scraping/ | **X** | No automated collection without Meta permission |
| 50 | Swappa | https://swappa.com/ | **D** | Interesting device sold-price views; no verified commercial ingestion rights in this review |
| 51 | Ritchie Bros Market Trends | https://www.rbauction.com/ | **C/X** | High-value equipment transaction histories but partner licence required; do not scrape |
| 52 | General classified/auction sites: MA Auctions, Proxibid, HiBid, Purple Wave, BidSpotter, Public Surplus | provider-specific terms pending | **D/X** | Link-out only pending individual written permission; do not infer a right from publicly viewable pages |

## 7. Data-supplier provenance risk

GovAuctions.app and BidProwl each advertise CC BY 4.0 releases. Those are **their statements**, not a verified conclusion that they own/hold upstream rights to sublicense all auction-origin content. GovDeals and IronPlanet explicitly forbid automated extraction or use in competing valuation products under their terms. Even aggregate data can have collection-contract risk. Before business use, document origin per record, whether the source's terms governed collection, who licensed data, derivative/redistribution rights, withdrawal rights, provenance evidence, and independent counsel review if unresolved.

GovAuctions TOS https://govauctions.app/terms ; BidProwl TOS https://bidprowl.com/terms .

## 8. Execution order

**Now, free/low dependency:** (a) expand GCSurplus official 2015–22 sold CSVs into isolated test data; evaluate temporal degradation, idempotence, item taxonomy, copyright exceptions; (b) identify official NS physical-surplus tender rows (not NS property/contract award totals); (c) safe GSA Auctions API availability/terms test; (d) integrate on-device/manual Wikidata, NHTSA and Transport recalls only if useful to prototype; (e) BOC/CRA/StatCan cost data with correct attribution.

**Triggered next, commercial negotiation by owner:** (a) EquipmentWatch heavy equipment, (b) Canadian Black Book and CARFAX vehicles, (c) seller-owned feeds/refurbishment partners, (d) BrickLink and other category-specific sold data, (e) GSA/GovAuctions/BidProwl after origin/right-chain due diligence. Decide paid API spend only against real validated demand.

**Future options:** Expanded U.S. and cross-border markets, catalog/API partner directory, revenue-sharing data contributions, authorized commercial marketplace feeds, user opt-in image-based recognition. None overrides current Titi security/release work or Claude's existing estimator/vision design.

## 9. Required gate for every new source

Store: source ID, URL, origin publisher, dataset title/version, exact licence URL, ToS snapshot review date, legal owner, permitted purposes (download, transform, derivative valuation, public display, retention, redistribution, AI inference/training), geography, refresh cadence, record grain, price basis, tax/fee basis, condition/quantity fields, attribution line, personal data, robots, available API/CSV, rate limit, storage/deletion time, expiry, kill switch, and reviewer approval.

**Fail closed:** no automated ingestion until evidence for commercial data extraction AND commercial pricing derivation (where relevant) is recorded. Only licensed source data enters production comps; otherwise show source name + plain outbound link. Track data provenance at *field* level when mixing sources; evaluate source-specific pricing bias.

## 10. Project boundary

This catalogue is a **candidate source inventory**, not proof every candidate is reachable or production-use legal. Rights and pricing are not interchangeable. No production change, merge, deploy, spend, live-site scraping or unauthorized customer/vendor outreach was performed as part of this investigation.
