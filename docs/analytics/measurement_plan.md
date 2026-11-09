# Surplus Bus — launch measurement plan (YkData)

**Status:** Draft only. Nothing installed, enabled, or published.  
**Author:** YkData  
**Date:** 2026-11-09 (America/Toronto)  
**Inputs:** `launch/BRIEF.md`, `data/sources_audit.md`, `ro/scoring_alerts_review.md`, `cx/onboarding_settings_copy.md`, `copy/YkMedia/waitlist.md`, `design/SPEC.md`, existing HQ UTM pattern in `/workspace/yk-team/front-door_utm_links.md`.  
**Product framing:** Information service only. No brokering, fees, or matching. Alerts = in-app inbox for v1. Email digests not approved. Live reusable data is limited (mostly link-out; GC Surplus sold history, NS datasets, CanadaBuys CSV). Pricing = **[PRICE TBD]** (BRIEF).

Companion files:
- `weekly_scorecard_template.md`
- `events.json` (mirrors §3)

---

## 1. North-star metric

### Metric
**Official listing opens per week** — count of `official_listing_clicked` events where `source_status` is `live`, `partial`, or `official_site_only` (never sample/placeholder).

### Definition
A user (authenticated or demo-session) clicks **View official listing** / **Open official site** and the click is recorded server-side (or client with a server echo). One click = one event. Deduplicate only for accidental double-clicks within 2 seconds on the same `opportunity_id` (implementation detail for Titi; scorecard uses raw weekly count until that exists).

### Rationale
- Surplus Bus’s job is to help someone **reach the official public listing**, not to broker a deal. Opens of official pages are the clearest success signal that still respects the information-service positioning.
- Feed views and waitlist joins are leading indicators; paid is lagging and currently **[PRICE TBD]**. Ranking quality without an open is noise.
- With sparse live lots (per sources audit), this metric stays honest: link-out-only sources still count when the user opens them.

### Supporting (not north-star)
| Metric | Role |
|---|---|
| Waitlist joins / week | Top-of-funnel demand |
| Alert rules created / week | Activation depth |
| Inbox matches opened / week | Alert usefulness (v1 in-app only) |
| Paying accounts (when pricing ships) | Monetisation lag |

---

## 2. Funnel definitions

| Stage | Precise definition | Primary events | Notes |
|---|---|---|---|
| **1. Visit** | Unique visitor who loads a marketing or app page in the window. Prefer Vercel Web Analytics “Visitors” for marketing pages; for authenticated app use server sessions / `page_viewed` if instrumented. | `page_viewed` (optional client), Vercel pageviews | Do not invent unique-visitor math if only raw pageviews exist — report pageviews and mark uniqueness **UNVERIFIED**. |
| **2. Waitlist / signup** | **Waitlist:** successful POST to waitlist with required consent ticked (`waitlist_joined`). **Signup:** authenticated account created (`signup_completed`). Count each email/account once per stage (first success wins). | `waitlist_joined`, `signup_completed`, `onboarding_completed` | Waitlist and signup are parallel entry paths in beta; report both, and a combined “entered” = distinct people who did either (needs email hash on waitlist + auth id on signup — store hash server-side, never emit email in analytics properties). |
| **3. Saved search (alert rule)** | User creates at least one alert rule (`alert_rule_created`). “Saved search” = alert rule in product language (YkCX/YkRO). | `alert_rule_created` | First rule per user is the funnel conversion; subsequent rules are depth. |
| **4. Paid** | First successful subscription charge or confirmed paid entitlement for the account. | `checkout_started`, `subscription_started` | **Blocked until pricing is decided.** Do not quote C$ amounts. Until then, report “paid = n/a / not instrumented”. |

### Stage conversion formulas (when denominators exist)
- Visit → entered = `entered / visits` (same week cohort preferred; else crude weekly ratio labelled **crude, not cohort**).
- Entered → first alert rule = users with `alert_rule_created` / users entered.
- Alert rule → paid = paying users / users with ≥1 alert rule.

All conversion **targets** below are **ASSUMPTION**, not benchmarks.

---

## 3. Event list

Rules:
- Names: `snake_case`.
- Properties: no email, name, phone, IP, full URL query with tokens, or free-text that could hold PII. Use opaque ids (`user_id` only server-side in the DB table; client payloads use `anonymous` or omit).
- Prefer **server** for anything that affects money, consent, or entitlement.

| event_name | When it fires | Properties (allowed) | Source |
|---|---|---|---|
| `page_viewed` | Marketing or app route becomes visible | `path` (pathname only), `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `referrer_host` | client (or Vercel automatic pageview) |
| `cta_clicked` | Primary marketing CTA click (waitlist / pricing / how-it-works) | `cta_id`, `path`, UTM quartet if present | client |
| `waitlist_joined` | Waitlist form accepted after required consent | `consent_version` (short hash of consent string), `has_utm` (bool) | **server** |
| `signup_completed` | Auth account created | `method` (`email`\|`oauth_provider_key`), `from_waitlist` (bool) | **server** |
| `onboarding_completed` | User finishes / skips onboarding | `steps_completed` (int), `provinces_count`, `categories_count`, `has_value_range` (bool) | **server** |
| `feed_viewed` | Ranked feed page loaded with results or empty | `result_count`, `filter_province_count`, `filter_category_count` | server or client |
| `opportunity_viewed` | Opportunity detail opened | `opportunity_id`, `source_key`, `source_status` (`live`\|`partial`\|`official_site_only`\|`closed`), `rank_position` (nullable) | **server** preferred |
| `score_reasons_expanded` | User opens “why this ranked” | `opportunity_id` | client |
| `official_listing_clicked` | User clicks View official listing / Open official site | `opportunity_id`, `source_key`, `source_status`, `surface` (`feed_card`\|`detail`\|`inbox`\|`saved`\|`sources`) | **server** preferred |
| `opportunity_saved` | User saves a listing | `opportunity_id`, `source_key` | **server** |
| `opportunity_unsaved` | User removes a save | `opportunity_id` | **server** |
| `alert_rule_created` | New alert rule saved | `rule_id`, `has_category`, `has_region`, `has_price_range` (bools only) | **server** |
| `alert_rule_updated` | Rule edited | `rule_id` | **server** |
| `alert_rule_deleted` | Rule deleted | `rule_id` | **server** |
| `inbox_opened` | In-app inbox viewed | `unread_count` | server or client |
| `inbox_item_opened` | User opens an inbox match | `delivery_id`, `opportunity_id`, `rule_id` | **server** |
| `source_status_viewed` | Sources status page viewed | `live_count`, `partial_count`, `link_out_count` | server or client |
| `pricing_viewed` | `/pricing` viewed | `path` | client / Vercel |
| `checkout_started` | User starts checkout (**when pricing exists**) | `plan_key` (opaque, not dollar amount) | **server** |
| `subscription_started` | First paid entitlement active | `plan_key`, `billing_interval` | **server** |
| `marketing_email_pref_changed` | Marketing toggle changed in settings | `enabled` (bool) | **server** |

### Explicitly deferred (do not instrument as “sent” until approved)
- Email alert / digest send, open, click — **not approved** (YkRO + BRIEF). If Resend logs exist for waitlist confirmation only, count those as `waitlist_confirm_sent` **server** ops metric, not product engagement.

Full mirror: `events.json`.

---

## 4. UTM conventions

Align with HQ Front Door pattern (`front-door_utm_links.md`), adapted for Surplus Bus.

### Naming rules
| Param | Rule | Examples |
|---|---|---|
| `utm_source` | lowercase platform or partner slug, no spaces | `x`, `linkedin`, `reddit`, `email`, `partner`, `direct` |
| `utm_medium` | channel type | `organic`, `paid` (only if Yonatan approves spend), `outbound`, `newsletter`, `referral`, `social` |
| `utm_campaign` | product + push slug | `surplus-bus-waitlist`, `surplus-bus-beta`, `surplus-bus-launch` |
| `utm_content` | creative or placement id | `post-1`, `thread-1`, `bio`, `partner-acme`, `prospect-<id>` |

Do **not** put emails or person names in `utm_content`. Use opaque prospect/partner ids.

### Examples (draft — nothing published)

| Channel | Example query |
|---|---|
| **X** | `?utm_source=x&utm_medium=organic&utm_campaign=surplus-bus-waitlist&utm_content=post-1` |
| **LinkedIn** | `?utm_source=linkedin&utm_medium=organic&utm_campaign=surplus-bus-waitlist&utm_content=company-1` |
| **Reddit** | `?utm_source=reddit&utm_medium=organic&utm_campaign=surplus-bus-waitlist&utm_content=r-canadaprocurement-1` |
| **Email** (waitlist confirm / approved CEM only) | `?utm_source=email&utm_medium=newsletter&utm_campaign=surplus-bus-waitlist&utm_content=confirm-v1` |
| **Direct outreach** (YkRO/sales) | `?utm_source=email&utm_medium=outbound&utm_campaign=surplus-bus-beta&utm_content=<prospect_id>` |
| **Partners** | `?utm_source=partner&utm_medium=referral&utm_campaign=surplus-bus-waitlist&utm_content=<partner_slug>` |

**Capture:** persist UTM quartet on first landing into waitlist row / signup profile (server). Attribution rule (same as Front Door): `utm_medium=outbound` → YkRO; organic / social / referral / paid → YkMedia.

BRIEF does not hard-list channels; these match the channels named in Titi’s measurement ask and the existing HQ UTM style.

---

## 5. Targets (all ASSUMPTION)

No live Surplus Bus traffic baseline exists in this folder. yksystems.ca still had Web Analytics disabled as of YkData week-6 scorecard (Nov 6, 2026). **Do not treat the numbers below as industry benchmarks.**

| Metric | ASSUMPTION (first 4 weeks after public waitlist) | Reasoning (not a cited benchmark) |
|---|---|---|
| Visits / week | 200–500 | Small organic push on X/LinkedIn/Reddit with no paid; order-of-magnitude only. |
| Waitlist joins / week | 20–50 | ~5–15% visit→join if CTA is clear; **crude assumption**, not measured. |
| Signup completes / week (when invites open) | 10–30 | Subset of waitlist + direct; beta capacity unknown. |
| Users with ≥1 alert rule / week among new signups | 40–60% of new signups | Onboarding CTA pushes “Add an alert rule”; assumption until measured. |
| Official listing opens / week | 50–150 | North-star; depends on how many real/link-out lots exist (data-constrained). |
| Paid conversions | **n/a** until [PRICE TBD] | No target. |

If an external SaaS conversion “rule of thumb” is ever quoted in a future revision, cite the source and date; **none are used as fact here**.

---

## 6. Privacy-friendly analytics recommendation (free first, PIPEDA-aware)

### Recommendation (launch)
**Use two free layers; install nothing in this task.**

1. **Vercel Web Analytics (Hobby free tier)** for marketing pageviews / visitors / referrers.  
   - Already on the stack (Next.js on Vercel per BRIEF).  
   - Vendor: anonymized, **no cookies**; visitor hash resets daily ([Vercel Web Analytics docs](https://vercel.com/docs/analytics), accessed 2026-11-09).  
   - Hobby: **50,000 events / month** included across the team; collection pauses after grace if exceeded; custom events / rich UTM panels need Pro or Web Analytics Plus ([limits & pricing](https://vercel.com/docs/analytics/limits-and-pricing), accessed 2026-11-09).  
   - **Caveat:** If the Surplus Bus Vercel team is on **Pro**, pageview events are usage-priced (~$0.03 per 1K on Pro per same page) — confirm plan before enabling. HQ `yonipro` analytics enablement was approved earlier for yksystems.ca but is a **separate project**; do not assume Surplus Bus already has it.

2. **Server-side `analytics_events` (or equivalent) table in existing Supabase** for the product event list in §3.  
   - Free within current Supabase quota (**UNVERIFIED** exact headroom — check project usage before launch).  
   - Full control of properties, PIPEDA purpose limitation, and no third-party marketing pixel.  
   - Best place for `waitlist_joined`, alert, inbox, and `official_listing_clicked`.

### Compared alternatives (not installing)

| Option | Cost / licence (accessed 2026-11-09) | Privacy notes | Fit for Surplus Bus |
|---|---|---|---|
| **Vercel Web Analytics** | Hobby 50k events/mo free; Pro usage-priced; Plus add-on $10/mo for UTM etc. ([pricing](https://vercel.com/docs/analytics/limits-and-pricing)) | No cookies; daily rotating hash ([docs](https://vercel.com/docs/analytics)) | **Best free default** for traffic; weak alone for product funnel |
| **Plausible CE (self-host)** | No licence fee to Plausible; you pay host; **AGPLv3** ([self-hosted page](https://plausible.io/self-hosted-web-analytics)) | Cookie-free positioning; you control region | Good if we want a dashboard UI; ops cost; AGPL obligations if modified/networked |
| **Umami (self-host)** | Free; **MIT** ([developers](https://umami.is/product/developers), [LICENSE](https://github.com/umami-software/umami)) | Cookie-free claim; Postgres | Fits if we already want a second Postgres; still ops overhead vs Supabase events |
| **GoatCounter** | Hosted free for “reasonable public usage”; self-host free ([goatcounter.com](https://www.goatcounter.com/)) | No unique IDs / no GDPR notice per vendor | Fine for pageviews; product events still need our DB |
| **Supabase event table** | Included in existing DB | Full PIPEDA control; no extra vendor | **Required** for funnel/north-star regardless |

**Do not use** Google Analytics / Meta Pixel / similar adtech for launch (surveillance model; consent burden; conflicts with honest operator tone).

### PIPEDA-oriented practice (not legal advice)
- Collect only what the purpose needs (traffic + product funnel).  
- Prefer aggregated / cookieless traffic tools.  
- Keep personal information (email, consent text, billing) in app tables with access control — **never** copy into analytics properties.  
- Disclose analytics in `/legal/privacy` before enablement (see §7).  
- CASL remains separate for commercial electronic messages (YkCX); analytics ≠ email consent.

---

## 7. Consent / privacy-page notes

Before enabling any analytics script or event table reads in production:

1. **Privacy policy** (`/legal/privacy`): add a short “Analytics” section stating  
   - what is measured (page views, product actions listed in §3);  
   - that marketing analytics are cookieless / anonymized if using Vercel Web Analytics;  
   - that product events are stored in our database to operate and improve Surplus Bus;  
   - that we do not sell personal information;  
   - retention period (**ASSUMPTION to set with Yonatan** — e.g. raw events 13 months, then aggregate).  
2. **Waitlist consent** stays as YkMedia/YkCX drafted (required, unticked, names YK+ Systems). Analytics disclosure is separate from CASL consent.  
3. **Marketing emails** toggle defaults **off** (YkCX); changing it emits `marketing_email_pref_changed` only.  
4. **No email-alert tracking** until digests are approved.  
5. Anti-spam / CASL pages already referenced on waitlist — keep mailing address / From domain / unsubscribe blockers visible to the team until cleared.

---

## 8. What is NOT measured

- Brokerage outcomes, bids placed, win rates, deal values, referral payouts, buyer↔seller matches.  
- Email alert/digest delivery, opens, or clicks (not approved).  
- Session replay / heatmaps / fingerprinting beyond vendor’s stated daily hash.  
- Cross-site tracking or advertising audiences.  
- Invented social-proof stats (340+ / 94% / 84,995 — excluded per BRIEF and prior audits).  
- Scraping success against bot-protected or ToS-blocked sources as a “user” metric.  
- PII in event properties.  
- Paid-plan revenue targets until [PRICE TBD].

---

## 9. Implementation notes for Titi (no work started here)

- Wire Vercel `<Analytics />` only after Yonatan confirms project plan + privacy line.  
- Add Supabase migration for `analytics_events` (id, created_at, event_name, user_id nullable, session_id nullable, props jsonb) with RLS: insert via service role / route handlers only.  
- Emit server events from existing API routes (waitlist, alerts CRUD, opportunity detail, link-out).  
- Weekly fill: YkData uses Vercel dashboard + SQL aggregates into `weekly_scorecard_template.md`.

---

*End of measurement plan. Draft only — Yonatan approves enablement.*
