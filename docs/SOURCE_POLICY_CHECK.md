# Surplus Bus — Source policy / licence / robots check

**Checked:** 2026-11-03 ~06:33 America/Toronto (ET)  
**Checker:** Titi executor (Phase 2 feeds)  
**Rule:** Before download, link-out directory, or parser work: record terms, licence, robots, and automated-access rules. Proceed only when reuse is clearly allowed; otherwise **link-out only** or **do not use**.  
**Prior art:** YkData `sources_audit.md` (2026-11-02) — robots for CanadaBuys HTML cited there; re-checked today where reachable.

**Verdict key:** `reuse OK` | `link-out only` | `do not use`

**Redistribution rule (Phase 2):** For every source, record whether terms/licence clearly allow **republishing**, **redistributing**, and **commercial use inside a paid SaaS**; required **attribution**; restrictions on **derived data**; and relevant **Canadian / provincial** rules (OGL, Crown copyright exemptions, Privacy Act / PIPEDA / FOIPOP if personal info appears). Quote exact text with URL + date. If redistribution is not clearly allowed → treat as **link-out only**.

---

## Summary

| Source | Verdict | Republish / redistribute | Commercial / paid SaaS | Attribution | Derived data | Personal info / privacy |
|--------|---------|--------------------------|------------------------|-------------|--------------|-------------------------|
| GCSurplus “What has Sold” CSV | **reuse OK** | Yes (OGL–Canada) | Yes | Required OGL–Canada statement | Adapt/modify allowed | Strip/exclude personal fields; OGL excludes PI; PIPEDA if PI retained in commercial activity |
| Live gcsurplus.ca HTML | **link-out only** | Not clearly granted | No clear grant | n/a | n/a | n/a — do not scrape |
| CanadaBuys open tender CSV | **reuse OK** | Yes (OGL–Canada) | Yes | Required OGL–Canada statement | Adapt/modify allowed | Prefer org/business contacts; exclude personal emails/phones from public UI |
| CanadaBuys HTML scrape | **do not use** | No (robots Disallow:/) | No | n/a | n/a | n/a |
| NS public-tender CSV | **reuse OK** | Yes (OGL–NS) | Yes | Required OGL–NS statement | Adapt/modify allowed | Contractor names may be PI — minimize; FOIPOP/PIPEDA if identifying individuals |
| NS real-property CSV | **reuse OK** | Yes (OGL–NS) | Yes | Required OGL–NS statement | Adapt/modify allowed | Awarded party names may identify people — minimize display |
| GovDeals Canada | **link-out only** | No (ToS bans reproduce/archive/data-mining) | No for scraped data | n/a | n/a | ToS + PIPEDA irrelevant if we never ingest |
| MA Auctions | **link-out only** | Not clearly granted | Not clearly granted | n/a | n/a | link-out only |
| Infrastructure Ontario / OILC | **link-out only** | **No** without written consent | **No** without consent | n/a | Ban on modify/repurpose/reproduce | link-out only |
| Ottawa | **link-out only** | Unclear | Unclear | n/a | n/a | Incapsula; link-out |
| Hamilton | **link-out only** | Unclear / downstream GovDeals bans | No for lot scrape | n/a | n/a | link-out |
| AB / Toronto / Calgary / Edmonton portals | **link-out only** | Not clearly under OGL for live lots | Not clearly granted | n/a | n/a | link-out |

---

## 1. GCSurplus — What has Sold (open data)

| Item | Detail |
|------|--------|
| Dataset | https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4 |
| Sample resource (ENG) | `https://donnees-data.tpsgc-pwgsc.gc.ca/bi1/gcsurplus/gcsurplus-2025-01-01--2025-06-30-eng.zip` |
| Licence page | https://open.canada.ca/en/open-government-licence-canada |
| Licence (portal API) | `license_title`: Open Government Licence - Canada; `license_id`: ca-ogl-lgo |
| robots (open.canada.ca) | https://open.canada.ca/robots.txt — `User-agent: *` Crawl-delay 20; Disallow admin/core paths; **data catalogue paths not blanket-disallowed** |
| robots (gcsurplus.ca) | https://www.gcsurplus.ca/robots.txt → **404** (HTML error page) on 2026-11-03 |
| robots (donnees-data.tpsgc-pwgsc.gc.ca) | `/robots.txt` → **404** |
| Date checked | 2026-11-03 America/Toronto |

**Exact relevant quotes (OGL–Canada):**
> “The Information Provider grants you a worldwide, royalty-free, perpetual, non-exclusive licence to use the Information, including for commercial purposes, subject to the terms below.”
> “You are free to: Copy, modify, publish, translate, adapt, distribute or otherwise use the Information…”
> “You must… Acknowledge the source… Contains information licensed under the Open Government Licence – Canada.”
> Exemptions include Personal Information and official symbols.

**Verdict:** **reuse OK** for the published sold-history CSV/ZIP under OGL–Canada, with attribution and no Crown endorsement claim.  
**Not covered:** scraping live open auctions on gcsurplus.ca → treat as **link-out only**.

---

## 2. CanadaBuys tender notices (open-data CSV only)

| Item | Detail |
|------|--------|
| Dataset | https://open.canada.ca/data/en/dataset/6abd20d4-7a1c-4b38-baa2-9525d0bb2fd2 |
| Preferred resource | Open tender notices CSV: `https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv` |
| Licence | Open Government Licence – Canada (portal `license_title` / `license_url` confirmed via package_show API 2026-11-03) |
| robots (canadabuys.canada.ca) | Live GET 2026-11-03 → **HTTP 500**. YkData audit 2026-11-02 recorded: `User-agent: *` → **`Disallow: /`** (blanket HTML disallow); search bots had narrower rules |
| Date checked | 2026-11-03 America/Toronto (licence/API + CSV URL); robots live fail — prior YkData day retained |

**Exact relevant quotes:**
- OGL–Canada (same as §1): commercial reuse permitted with attribution “Contains information licensed under the Open Government Licence – Canada.”
- Dataset note (portal): CanadaBuys is authoritative; open-data files are the published federal tender notices feed (not an invitation to scrape the UI).

**Verdict:** **reuse OK** for official `/opendata/pub/*.csv` files under OGL–Canada with attribution.  
**HTML scrape / tender UI crawl:** **do not use** (robots Disallow:/ per YkData; unclear while robots endpoint 500s — default deny for scrape).

---

## 3. Nova Scotia — Surplus Crown Property (open data)

| Item | Detail |
|------|--------|
| Public Tender dataset | https://data.novascotia.ca/…/f89b-7ujj · CSV `https://data.novascotia.ca/api/views/f89b-7ujj/rows.csv?accessType=DOWNLOAD` |
| Real Property dataset | https://data.novascotia.ca/…/2kw3-tjdw · CSV `https://data.novascotia.ca/api/views/2kw3-tjdw/rows.csv?accessType=DOWNLOAD` |
| Licence page | https://novascotia.ca/opendata/licence.asp |
| API licence field | `"license": {"name": "Nova Scotia Open Government Licence", "termsLink": "http://novascotia.ca/opendata/licence.asp"}` (both views) |
| robots | https://data.novascotia.ca/robots.txt — Crawl-delay 1; Disallow browse/search query variants; **API `/api/views/…/rows.csv` not disallowed** |
| Date checked | 2026-11-03 America/Toronto |

**Exact relevant quotes (OGL–Nova Scotia):**
> “The Information Provider grants you a worldwide, royalty-free, perpetual, non-exclusive licence to use the Information, including for commercial purposes…”
> Required attribution when unspecified: “Contains information licensed under the Open Government Licence – Nova Scotia”
> Exemptions include Personal Information and official symbols.

**Verdict:** **reuse OK** for both CSVs under OGL–NS with attribution. Historical award/disposal rows — not live auction scrape.

---

## 4. GovDeals Canada (watchlist directory only)

| Item | Detail |
|------|--------|
| Terms | https://prod-seo.govdeals.ca/content/site-terms (User Agreement) |
| robots | https://www.govdeals.ca/robots.txt — Crawl-delay 5; Disallow `/account/`, `/assets/` (partial Allows) |
| Date checked | 2026-11-03 America/Toronto (robots live; terms via public extract / search mirror of same page) |

**Exact relevant quote:**
> “use spiders, crawlers, robots or any other similar means to access our Site or substantially download, reproduce or archive any portion of our Site, or otherwise engage in any data-mining activities using our Site or Services”

**Verdict:** **link-out only**. Automated lot ingest = **do not use**.

---

## 5. MA Auctions (watchlist directory only)

| Item | Detail |
|------|--------|
| Buyer terms | https://www.maauctions.com/terms (payment/commission/jurisdiction — no data-reuse grant found) |
| robots | https://www.maauctions.com/robots.txt — `Content-Signal: search=yes,ai-train=no,use=reference`; many AI training bots Disallow:/; generic `Allow: /` for `*` |
| Date checked | 2026-11-03 America/Toronto |

**Verdict:** **link-out only** — no clear licence to republish lots; AI-train signal = no; default deny for bulk listing reuse.

---

## 6. Infrastructure Ontario / OILC property portals

| Item | Detail |
|------|--------|
| Related terms (Provincial Real Estate Inventory) | https://www.publicgeoportal.com/ProvincialRealEstateInventory/ |
| Properties for sale host | https://propertiesforsale.infrastructureontario.ca/Home.aspx |
| robots (propertiesforsale host) | `/robots.txt` → **404** (2026-11-03) |
| Date checked | 2026-11-03 America/Toronto |

**Exact relevant quote:**
> “Except as expressly provided in these Terms of Use, no part of the Site or any contents contained therein may be copied, reproduced, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, or distributed in any way (including \"mirroring\") … without OILC’s express prior written consent. Users shall not have the right to modify, repurpose, reproduce, or appropriate any data contained on this website…”

**Verdict:** **link-out only**. Do not scrape or mirror listing data.

---

## 7. City of Ottawa

| Item | Detail |
|------|--------|
| Page | https://ottawa.ca/en/business/procurement |
| robots | https://ottawa.ca/robots.txt returns Incapsula challenge HTML (`noindex,nofollow`) — **not a usable robots policy** |
| Date checked | 2026-11-03 America/Toronto |

**Verdict:** **link-out only** (unclear automated-access rules + bot challenge).

---

## 8. City of Hamilton surplus auction page

| Item | Detail |
|------|--------|
| Page | https://www.hamilton.ca/…/surplus-items-auction |
| robots (hamilton.ca) | Allows general crawl of path; Disallow core/profiles internals |
| Downstream host | Often GovDeals — see §4 scrape ban |
| Date checked | 2026-11-03 America/Toronto |

**Verdict:** **link-out only** for the city info page; no lot-row ingest from third-party auction hosts whose ToS ban mining.

---

## 9. Other official-site-only watchlist entries

Alberta Surplus (`surplus.gov.ab.ca`), City of Toronto surplus info, Calgary/Edmonton surplus pages: no clear open-data licence covering live lot scrape found in this check (see YkData audit). **Verdict: link-out only** until a licensed open feed is identified.

---

## Attribution strings (required when reuse OK)

| Licence | Attribution text |
|---------|------------------|
| OGL–Canada | Contains information licensed under the Open Government Licence – Canada. https://open.canada.ca/en/open-government-licence-canada |
| OGL–Nova Scotia | Contains information licensed under the Open Government Licence – Nova Scotia. https://novascotia.ca/opendata/licence.asp |

Do **not** use Crown / provincial logos or imply endorsement.

---


---

## Redistribution matrix (detailed quotes)

Checked **2026-11-03 America/Toronto**. Licence URLs and exact text below.

### A. Open Government Licence – Canada (applies to GCSurplus sold CSV + CanadaBuys tender CSVs)

- **URL:** https://open.canada.ca/en/open-government-licence-canada (version 2.0)
- **Date checked:** 2026-11-03 America/Toronto

| Question | Answer under OGL–Canada |
|----------|-------------------------|
| Republish / redistribute? | **Yes** — “Copy, modify, publish, translate, adapt, **distribute** or otherwise use the Information in any medium, mode or format for any lawful purpose.” |
| Commercial use / paid SaaS? | **Yes** — “worldwide, royalty-free, perpetual, non-exclusive licence to use the Information, **including for commercial purposes**…” |
| Required attribution | “Contains information licensed under the Open Government Licence – Canada.” (+ link to licence where possible). Provider-specific attribution if supplied. |
| Derived / adapted data | **Allowed** (“modify… adapt…”). No separate share-alike clause. Still must attribute the Information used. |
| Crown copyright / symbols | Licence **does not** grant use of “names, crests, logos, or other official symbols of the Information Provider” nor patents/trade-marks/official marks. |
| Non-endorsement | Must not suggest “any official status” or that the Information Provider “endorses you or your use of the Information.” |
| Personal information | Licence **does not grant** right to use “Personal Information” (defined by reference to Privacy Act s.3). Separately, if a private-sector SaaS **collects, uses or discloses** personal information in commercial activity, **PIPEDA** may apply (OPC brief: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief/ ; statute: https://laws-lois.justice.gc.ca/eng/acts/p-8.6/FullText.html ). OPC: personal info can include publicly available info; anonymization must consider re-identification. |
| Product rule for Surplus Bus | Redistribute sold-lot / tender **fields that are not personal**; drop or redact custodian personal names/phones/emails from public pages; show OGL attribution on price-history and tenders views. |

Exact quotes:
> “The Information Provider grants you a worldwide, royalty-free, perpetual, non-exclusive licence to use the Information, including for commercial purposes, subject to the terms below.”
> “You are free to: Copy, modify, publish, translate, adapt, distribute or otherwise use the Information in any medium, mode or format for any lawful purpose.”
> “If the Information Provider does not provide a specific attribution statement… you must use the following attribution statement: Contains information licensed under the Open Government Licence – Canada.”
> “This licence does not grant you any right to use: Personal Information; … the names, crests, logos, or other official symbols of the Information Provider…”
> “This licence does not grant you any right to use the Information in a way that suggests any official status or that the Information Provider endorses you or your use of the Information.”

### B. Open Government Licence – Nova Scotia (NS surplus CSVs)

- **URL:** https://novascotia.ca/opendata/licence.asp (version 1.1)
- **Date checked:** 2026-11-03 America/Toronto
- **API confirmation:** both `f89b-7ujj` and `2kw3-tjdw` list `"license": {"name": "Nova Scotia Open Government Licence", "termsLink": "http://novascotia.ca/opendata/licence.asp"}`

| Question | Answer under OGL–NS |
|----------|---------------------|
| Republish / redistribute? | **Yes** — same “Copy, modify, publish, translate, adapt, distribute…” language as federal OGL. |
| Commercial / paid SaaS? | **Yes** — “including for commercial purposes”. |
| Required attribution | “Contains information licensed under the Open Government Licence – Nova Scotia” (+ link). |
| Derived data | Adapt/modify allowed; attribution still required. |
| Symbols / endorsement | Same style exemptions (names, crests, logos; no endorsement). |
| Personal information | Licence excludes Personal Information (FOIPOP NS definition). Contractor / awardee **individual names** in award CSVs may be identifying — **minimize** in UI (prefer organization names; avoid shipping full address lines of individuals into public marketing pages). Provincial FOIPOP + federal PIPEDA (commercial activity) remain relevant if PI is retained. |

Exact quotes:
> “The Information Provider grants you a worldwide, royalty-free, perpetual, non-exclusive licence to use the Information, including for commercial purposes, subject to the terms below.”
> “You are free to: Copy, modify, publish, translate, adapt, distribute or otherwise use the Information…”
> Required attribution: “Contains information licensed under the Open Government Licence – Nova Scotia”
> Exemptions include “Personal Information” and “Information or Records not accessible under the Freedom of Information and Protection of Privacy Act (Nova Scotia)…”

### C. GovDeals Canada — redistribution

- **Terms URL:** https://prod-seo.govdeals.ca/content/site-terms
- **Date checked:** 2026-11-03 America/Toronto

| Question | Answer |
|----------|--------|
| Republish / redistribute site content? | **No** — bans substantially download, reproduce, or archive; bans data-mining. |
| Commercial SaaS built on scraped lots? | **Not allowed** under User Agreement restrictions on use. |
| Attribution | Irrelevant — we do not ingest. |
| Derived data from scrape | Prohibited by same clause. |

Exact quote:
> “use spiders, crawlers, robots or any other similar means to access our Site or substantially download, reproduce or archive any portion of our Site, or otherwise engage in any data-mining activities using our Site or Services”

**Verdict remains link-out only.**

### D. OILC / Infrastructure Ontario inventory terms — redistribution

- **Terms URL:** https://www.publicgeoportal.com/ProvincialRealEstateInventory/
- **Date checked:** 2026-11-03 America/Toronto

| Question | Answer |
|----------|--------|
| Republish / redistribute? | **No** without OILC express prior written consent (copy/reproduce/republish/mirror/distribute banned). |
| Commercial? | Explicitly barred for commercial enterprise without consent. |
| Derived / repurpose? | “shall not have the right to modify, repurpose, reproduce, or appropriate any data…” |

Exact quote:
> “Except as expressly provided in these Terms of Use, no part of the Site or any contents contained therein may be copied, reproduced, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, or distributed in any way (including "mirroring") to any other computer, server, website or other medium for publication or distribution or for any commercial enterprise, without OILC’s express prior written consent. Users shall not have the right to modify, repurpose, reproduce, or appropriate any data contained on this website…”

**Verdict remains link-out only.**

### E. MA Auctions / Ottawa / Hamilton / municipal portals

No licence text found that clearly grants republishing, redistributing, or commercial reuse of listing databases inside a paid SaaS. MA robots content-signal `ai-train=no`. Ottawa robots unusable (Incapsula). Hamilton downstream often GovDeals (§C). **Default: link-out only** until a written open licence is identified.

### F. Canadian privacy overlay (all paid SaaS paths)

- **PIPEDA** applies to private-sector organizations that collect, use, or disclose personal information in the course of commercial activities (OPC summary dated check 2026-11-03: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief/ ).
- OGL “Personal Information” exemption ≠ a free pass if we independently hold PI; it means the OGL itself does not license PI.
- **Product controls:** do not display personal emails/phones from GCSurplus custodian fields; prefer organization/entity names for NS awardees; never invent contact data.


## Phase 2 ingest decision

| Feed | Sources used | Action |
|------|--------------|--------|
| Surplus watchlist directory | GovDeals, MA Auctions, IO, Ottawa, Hamilton, GC Surplus site, AB/ON/cities | **Link-out cards only** — no lot scrape |
| Price history | GCSurplus What-has-Sold CSV + NS open-data CSVs | **Ingest** under OGL with attribution |
| CanadaBuys tenders | `openTenderNotice-ouvertAvisAppelOffres.csv` only | **Ingest** under OGL–Canada with attribution; never HTML scrape |

