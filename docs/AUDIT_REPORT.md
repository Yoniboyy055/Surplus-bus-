# Surplus Bus — Full Repo Truth Audit

**Locked Product Scope (Authoritative):**
- Surplus Bus is an **intelligence/monitoring/analytics platform only**.
- It does: Construction/RFP alerts, Auction/Surplus alerts, Auction intelligence/analytics.
- It does **NOT**: transactions, matchmaking, bidding, negotiation, commissions, brokerage, marketplace behavior.

---

## 1. Repo Overview

| Item | Value |
|------|-------|
| Framework | Next.js 14.2.35 |
| Router | App Router only (no `pages/` directory) |
| Auth | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) |
| Styling | Tailwind CSS |
| Validation | Zod |
| Deploy | Vercel (vercel.json present) |

**Evidence:** `package.json`, `app/` structure, `middleware.ts`

---

## 2. Route Inventory

### App Routes (Pages)

| Path | File | Renders |
|------|------|---------|
| `/` | `app/page.tsx` | Public homepage, CTAs to landing/product |
| `/landing` | `app/landing/page.tsx` | Beta waitlist form |
| `/product` | `app/product/page.tsx` | Product overview (describes features, no wiring) |
| `/pricing` | `app/pricing/page.tsx` | Pricing surface |
| `/faq` | `app/faq/page.tsx` | FAQ |
| `/auth` | `app/auth/page.tsx` | Login (Google OAuth) |
| `/dashboard` | `app/dashboard/page.tsx` | RBAC router (redirects by role) |
| `/operator` | `app/operator/page.tsx` | Operator portal (deals Kanban, agent health) |
| `/operator/payouts` | `app/operator/payouts/page.tsx` | Payouts list |
| `/operator/properties/review` | `app/operator/properties/review/page.tsx` | Property candidates review |
| `/buyer` | `app/buyer/page.tsx` | Buyer portal (criteria, deals, commit-to-bid) |
| `/referrer` | `app/referrer/page.tsx` | Referrer portal (links, referred deals) |
| `/onboarding/role` | `app/onboarding/role/page.tsx` | Role selection |
| `/legal/terms` | `app/legal/terms/page.tsx` | Terms |
| `/legal/privacy` | `app/legal/privacy/page.tsx` | Privacy |
| `/legal/anti-spam` | `app/legal/anti-spam/page.tsx` | Anti-spam |
| `/401` | `app/401/page.tsx` | Unauthorized |
| `/403` | `app/403/page.tsx` | Forbidden |

### API Routes

| Path | Methods | Auth | File |
|------|---------|------|------|
| `/auth/callback` | GET | None (handler) | `app/auth/callback/route.ts` |
| `/api/health` | GET | None | `app/api/health/route.ts` |
| `/api/beta-signups` | POST | None | `app/api/beta-signups/route.ts` |
| `/api/profile` | GET, PATCH | requireUser | `app/api/profile/route.ts` |
| `/api/alerts` | GET, POST | requireUser | `app/api/alerts/route.ts` |
| `/api/analytics` | GET | requireUser | `app/api/analytics/route.ts` |
| `/api/subscription` | GET, PATCH | requireUser | `app/api/subscription/route.ts` |
| `/api/opportunities/ranked` | GET | requireUser | `app/api/opportunities/ranked/route.ts` |
| `/api/opportunities/recompute-scores` | POST | requireOperator | `app/api/opportunities/recompute-scores/route.ts` |
| `/api/deals` | POST, PUT, PATCH | requireUser | `app/api/deals/route.ts` |
| `/api/referral-links` | GET, POST | requireUser | `app/api/referral-links/route.ts` |
| `/api/payouts` | GET | requireUser | `app/api/payouts/route.ts` |
| `/api/agents/health` | GET | Operator session | `app/api/agents/health/route.ts` |
| `/api/agents/listing/scrape-alberta` | POST | CRON_SECRET or operator | `app/api/agents/listing/scrape-alberta/route.ts` |
| `/api/agents/listing/scrape-gc` | POST | CRON_SECRET or operator | `app/api/agents/listing/scrape-gc/route.ts` |

### Pages Router

**FALSE** — No `pages/` directory exists.

---

## 3. Agent Inventory

| Endpoint | Schedule | Auth | File | Notes |
|----------|----------|------|------|-------|
| `/api/agents/listing/scrape-alberta` | `0 11 * * *` (UTC) | CRON_SECRET or operator | `app/api/agents/listing/scrape-alberta/route.ts` | Mock data |
| `/api/agents/listing/scrape-gc` | `0 12 * * *` (UTC) | CRON_SECRET or operator | `app/api/agents/listing/scrape-gc/route.ts` | Mock data |
| `/api/agents/health` | — | Operator session | `app/api/agents/health/route.ts` | Health logs |

**Evidence:** `vercel.json` (crons), `docs/agents.md`, `lib/auth/verifyAgentAuth.ts`

**Agent implementation:** Both scrapers use **mock data** (`mockCandidates`). No real scraping. `docs/agents.md`, `app/api/agents/listing/scrape-gc/route.ts:40-55` — "Future Enhancements: Real scraping implementation (currently using mock data)".

---

## 4. Auth Audit

| Item | Status | Evidence |
|------|--------|----------|
| Auth library | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) | `package.json`, `lib/supabase/server.ts`, `lib/supabase/client.ts` |
| Cookie write path | Auth callback writes cookies to Response | `app/auth/callback/route.ts` — `createServerClient` with `setAll` writing to `response.cookies` |
| Middleware protection | Explicit PROTECTED_ROUTES | `middleware.ts` — `/dashboard`, `/operator`, `/buyer`, `/referrer`, `/onboarding` |
| Callback redirect | Sanitized `next` param | `lib/auth/sanitizeRedirect.ts`, `app/auth/callback/route.ts` |
| OAuth callback | `/auth/callback` | `app/auth/callback/route.ts` |

---

## 5. DB Audit

### Schema Tables (from `supabase/sql/`)

| Table | Migration | Aligned | Notes |
|-------|-----------|---------|-------|
| `profiles` | 001 | ✅ | User roles |
| `alert_rules` | 015 | ✅ | Alerts by category/region |
| `alert_delivery_events` | 015 | ✅ | Delivery tracking |
| `subscriptions` | 015 | ✅ | Freemium tiers |
| `beta_signups` | 015 | ✅ | Waitlist |
| `user_preferences` | 015, 016 | ✅ | Preferences for ranking |
| `ingestion_runs` | 015 | ✅ | Agent run logs |
| `ingestion_failures` | 015 | ✅ | Failure logs |
| `property_candidates` | 013 | ✅ | Scraped listings queue |
| `opportunities` | 016 | ✅ | Canonical opportunity model |
| `opportunity_history` | 016 | ✅ | History |
| `opportunity_features` | 016 | ✅ | Scoring |
| `agent_health_log` | 013 | ✅ | Agent metrics |
| `referrers` | 001 | ❌ | Out-of-scope: commission_rate |
| `referrer_tier_history` | 001 | ❌ | Out-of-scope |
| `referral_links` | 001 | ❌ | Out-of-scope: referral tracking |
| `buyers` | 001 | ⚠ | Questionable: track, reputation for matching |
| `buyer_reputation_events` | 001 | ❌ | Out-of-scope |
| `buyer_leads` | 013 | ❌ | Out-of-scope: lead outreach |
| `deals` | 001 | ❌ | Out-of-scope: status, fees, bids |
| `offers` | 001 | ❌ | Out-of-scope |
| `messages` | 001 | ❌ | Out-of-scope |
| `audit_logs` | 001 | ⚠ | Deal-centric (out-of-scope) |
| `payouts` | 001 | ❌ | Out-of-scope |
| `properties` | 004 | ⚠ | May be property_candidates/opportunities |

**Legend:** ✅ aligned with locked scope | ⚠ questionable | ❌ out-of-scope (transaction/matchmaking)

---

## 6. Truth Table

| Claimed Feature | Status | Evidence |
|-----------------|--------|----------|
| Auth flow + role-aware onboarding | TRUE | `app/auth/`, `app/dashboard/page.tsx`, `app/onboarding/role/page.tsx` |
| Beta landing page with email capture | TRUE | `app/landing/page.tsx` → `/api/beta-signups` |
| User-facing product overview | TRUE | `app/product/page.tsx` (describes features, no wiring) |
| Freemium pricing surface | TRUE | `app/pricing/page.tsx` |
| Legal and policy pages | TRUE | `app/legal/terms/`, `app/legal/privacy/`, `app/legal/anti-spam/` |
| API routes for analytics, alerts, profiles, beta signups | TRUE | `app/api/analytics/`, `app/api/alerts/`, `app/api/profile/`, `app/api/beta-signups/` |
| User alert config dashboard | FALSE | README claims "User alert config dashboard". No page calls `/api/alerts` or renders alert UI. | `app/product/page.tsx` only describes it. |
| Trend + engagement views | FALSE | README claims "Trend + engagement views". `/api/analytics` exists but no UI consumes it. |
| User monitors performance via `/api/analytics` and dashboard UI | FALSE | Dashboard redirects to role portals; no analytics UI. |
| `/api/opportunities/ranked` | TRUE | API exists, `app/api/opportunities/ranked/route.ts` |
| `/api/opportunities/recompute-scores` | TRUE | API exists, operator-only |
| Listing agents scrape GC Surplus | PARTIAL | Route exists, uses mock data. `app/api/agents/listing/scrape-gc/route.ts:40-55` |
| Listing agents scrape Alberta | PARTIAL | Route exists, uses mock data. `app/api/agents/listing/scrape-alberta/route.ts` |
| Cron jobs scheduled | TRUE | `vercel.json` crons for both agents |
| Agent health monitoring | TRUE | `app/api/agents/health/route.ts`, operator dashboard shows health |
| Operator property review | TRUE | `app/operator/properties/review/page.tsx` |
| Buyer portal | TRUE | `app/buyer/page.tsx` | **OUT-OF-SCOPE: deals, commit-to-bid, success fee** |
| Referrer portal | TRUE | `app/referrer/page.tsx` | **OUT-OF-SCOPE: referral links, commission** |
| Operator portal | TRUE | `app/operator/page.tsx` | **OUT-OF-SCOPE: deals Kanban, payouts** |
| Deals API | TRUE | `app/api/deals/route.ts` | **OUT-OF-SCOPE: transaction flow** |
| Payouts API | TRUE | `app/api/payouts/route.ts` | **OUT-OF-SCOPE** |
| Referral links API | TRUE | `app/api/referral-links/route.ts` | **OUT-OF-SCOPE** |
| Invitation-based beta funnel | PARTIAL | `beta_signups` table exists; no invite flow in UI |

---

## 7. Out-of-Scope Detection (Transaction/Matchmaking Drift)

| Item | Location | Evidence |
|------|----------|----------|
| Deals table | `supabase/sql/001_schema.sql` | `deals` with status, referral, buyer, fee splits |
| Success fee | `app/buyer/page.tsx:178`, `001_schema.sql:73` | "5% Success Fee", "Commit to Bid" |
| Commission | `001_schema.sql:17`, `app/api/deals/route.ts:69` | `commission_rate` |
| Referrer/buyer matching | `app/api/deals/route.ts` | Inserts buyer+referrer into deals |
| Payouts | `supabase/sql/001_schema.sql`, `app/api/payouts/` | `payouts` table |
| Referral links | `app/api/referral-links/`, `app/referrer/page.tsx` | Referrer earns commission |
| Buyer leads | `supabase/sql/013_dual_agent_system.sql` | `buyer_leads` for outreach |
| Offers | `001_schema.sql` | `offers` table |

**README claims:** "Surplus Bus is an information service, not a broker, marketplace, or transaction intermediary." — **Contradicted by** the presence of `deals`, `offers`, `payouts`, `referrers`, `referral_links`, buyer/referrer portals, and deal-matching APIs.

---

## 8. Security + Compliance Findings

| Item | Status | Evidence |
|------|--------|----------|
| RLS on public tables | TRUE | `002_rls.sql`, `010_supabase_hardening.sql`, etc. |
| Service-role writes | `ensureProfile` | `lib/auth/ensureProfile.ts:79-86` — uses `SUPABASE_SERVICE_ROLE_KEY` for profile bootstrap |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | `lib/env.ts` — not in `NEXT_PUBLIC_*` |
| `CRON_SECRET` | Server-only | `lib/env.ts`, `lib/auth/verifyAgentAuth.ts` |
| Cron secret comparison | Timing-safe | `lib/auth/verifyAgentAuth.ts:28-31` — `timingSafeEqual` |
| Cron endpoints protected | TRUE | `verifyAgentAuth` required for agent endpoints |
| `.env.example` | Present | No secrets; blank values |
| Open redirect | Mitigated | `lib/auth/sanitizeRedirect.ts` allowlists paths |

---

## 9. Docs vs Reality

| Doc Claim | Reality |
|-----------|---------|
| README: "User creates alert rules via `/api/alerts`" | API exists; no UI to create or manage alerts |
| README: "User monitors performance via `/api/analytics` and dashboard UI" | API exists; no analytics UI |
| README: "User alert config dashboard" | No such dashboard |
| docs/agents.md: "Real scraping implementation" | Future enhancement; mock data only |
| README: "Information service, not... transaction intermediary" | Codebase has deals, payouts, referrals, commissions |

---

## 10. Next Build Plan (Post-Audit)

**Minimum pages to build for the locked product (intelligence/monitoring/analytics only):**

1. **Alerts config UI** — Page that calls `GET/POST /api/alerts` to create and manage alert rules. Wire to `/dashboard` or a dedicated `/alerts` route.
2. **Analytics dashboard** — Page that calls `GET /api/analytics` and displays sent/opened metrics and open rate.
3. **Opportunities feed** — Page that calls `GET /api/opportunities/ranked` and displays ranked opportunities for the user.
4. **User preferences** — Page or form to set `user_preferences` (provinces, categories, min/max value, urgency) for personalized ranking.
5. **Remove or deprecate out-of-scope** — `deals`, `offers`, `payouts`, `referrers`, `referral_links`, buyer/referrer portals, and related APIs if product scope remains locked.

**Agent enhancements:**
- Replace mock data in scrape agents with real scraping (GC Surplus, Alberta Surplus).
- Populate `opportunities` from `property_candidates` (or equivalent) for the intelligence pipeline.

---

## Summary

| Category | Count |
|----------|-------|
| App routes | 18 |
| API routes | 15 |
| Agents | 2 (mock) + 1 health |
| DB migrations | 16 |
| Tables aligned with scope | ~10 |
| Tables out-of-scope | ~10 |
| TRUE claims | 15 |
| FALSE claims | 4 |
| PARTIAL claims | 4 |
| Out-of-scope code paths | 8+ |
