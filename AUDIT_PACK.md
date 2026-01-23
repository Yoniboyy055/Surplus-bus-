# AUDIT PACK - Surplus Referral Platform
**Generated:** 2026-01-23  
**Auditor:** Repository Audit Agent  
**Commit Branch:** `cursor/repository-audit-pack-2860`

---

## 1) Repo Overview

### Framework & Stack
| Item | Value | Source |
|------|-------|--------|
| Framework | Next.js **14.2.35** | `/package.json` |
| Router | **App Router** (all routes under `/app`) | `/app/*` |
| Language | TypeScript **5.4.5** (strict mode) | `/tsconfig.json` |
| Package Manager | **npm** (lockfile v3) | `/package-lock.json` |
| CSS | Tailwind CSS **3.4.1** | `/tailwind.config.ts` |
| Auth | **Supabase Auth** (OAuth with Google) | `/app/auth/AuthClient.tsx` |
| Database | **Supabase** (PostgreSQL) | `/lib/supabase/*` |

### Key Scripts
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

### Deployment Target
- **Target:** Vercel (implicit via Next.js defaults)
- **Adapter:** None required (Next.js native)
- **`next.config.js`:** Empty config (no custom settings)
- **Build Status:** ✅ Compiles successfully (with env var warnings expected)

---

## 2) Route Map (App Router)

### Complete Route Listing

| Route Path | File Location | Type | Protected |
|------------|---------------|------|-----------|
| `/` | `/app/page.tsx` | Static | ❌ Public |
| `/auth` | `/app/auth/page.tsx` | Dynamic | ❌ Public |
| `/auth/callback` | `/app/auth/callback/route.ts` | API Route | ❌ Public |
| `/dashboard` | `/app/dashboard/page.tsx` | Dynamic (redirect hub) | ✅ Yes |
| `/operator` | `/app/operator/page.tsx` | Dynamic | ✅ Yes (operator only) |
| `/operator/payouts` | `/app/operator/payouts/page.tsx` | Dynamic | ✅ Yes (operator only) |
| `/operator/properties/review` | `/app/operator/properties/review/page.tsx` | Dynamic | ✅ Yes (operator only) |
| `/buyer` | `/app/buyer/page.tsx` | Dynamic | ✅ Yes (buyer only) |
| `/referrer` | `/app/referrer/page.tsx` | Dynamic | ✅ Yes (referrer only) |
| `/onboarding/role` | `/app/onboarding/role/page.tsx` | Dynamic | ⚠️ Auth required (no role check) |
| `/401` | `/app/401/page.tsx` | Static | ❌ Public |
| `/403` | `/app/403/page.tsx` | Static | ❌ Public |

### API Routes

| Route Path | File Location | Methods | Auth |
|------------|---------------|---------|------|
| `/api/health` | `/app/api/health/route.ts` | GET | ❌ Public |
| `/api/deals` | `/app/api/deals/route.ts` | POST, PUT, PATCH | ✅ Auth |
| `/api/referral-links` | `/app/api/referral-links/route.ts` | POST | ✅ Referrer only |
| `/api/payouts` | `/app/api/payouts/route.ts` | PATCH | ✅ Operator only |
| `/api/agents/health` | `/app/api/agents/health/route.ts` | GET | ✅ Auth |
| `/api/agents/listing/scrape-alberta` | `/app/api/agents/listing/scrape-alberta/route.ts` | POST | ✅ Auth |
| `/api/agents/listing/scrape-gc` | `/app/api/agents/listing/scrape-gc/route.ts` | POST | ✅ Auth |

### Dashboard Inventory

| Role | Dashboard Route | Status |
|------|-----------------|--------|
| **Owner** | `/operator` | ✅ EXISTS (shared with operator) |
| **Operator** | `/operator` | ✅ EXISTS |
| **Buyer** | `/buyer` | ✅ EXISTS |
| **Referrer** | `/referrer` | ✅ EXISTS |

**Note:** There is NO separate "owner" dashboard. Owner is treated as an operator with elevated privileges via email matching.

### Route Protection Implementation

Protection is implemented in **two layers**:

**Layer 1: Middleware** (`/middleware.ts`)
- Checks if user is authenticated for protected routes
- Redirects to `/auth` if no session
- Implements role-based access control
- Has special hardening for OWNER_EMAIL

**Layer 2: Page-level checks**
- Each portal page (`/operator`, `/buyer`, `/referrer`) verifies role client-side
- Redirects to `/dashboard` if role mismatch

---

## 3) Auth & Role System

### Auth Provider
**Supabase Auth** with Google OAuth provider.

| Component | File |
|-----------|------|
| Auth Client UI | `/app/auth/AuthClient.tsx` |
| Auth Callback | `/app/auth/callback/route.ts` |
| Browser Client | `/lib/supabase/client.ts` |
| Server Client | `/lib/supabase/server.ts` |

### Session Check Locations

| Location | How |
|----------|-----|
| `/middleware.ts` | `supabase.auth.getUser()` |
| `/app/dashboard/page.tsx` | `supabase.auth.getUser()` |
| `/app/layout.tsx` | `supabase.auth.getUser()` |
| Each portal page | Client-side `supabase.auth.getUser()` |

### Role Storage

**Primary:** `profiles` table in Supabase
```sql
-- /supabase/sql/001_schema.sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('operator','referrer','buyer')),
  ...
);
```

**Role Values:** `'operator'`, `'referrer'`, `'buyer'`

**Note:** There is NO `'owner'` role value. Owner is determined by email matching.

### Current Behavior After Login

**Flow:**
1. User signs in with Google → redirected to `/auth/callback`
2. `/auth/callback/route.ts` exchanges code for session
3. Calls `ensureProfile()` to create/update profile
4. Redirects to `/dashboard` (or `next` param)
5. `/dashboard/page.tsx` reads profile role and redirects:
   - If `isOwnerEmail(email)` → `/operator` (bypasses role check)
   - If role = `'operator'` → `/operator`
   - If role = `'buyer'` → `/buyer`
   - If role = `'referrer'` → `/referrer`
   - Default → `/referrer`

### Owner Email Hardening (ALREADY IMPLEMENTED)

**File:** `/lib/auth/ownerEmail.ts`
```typescript
const HARDCODED_OWNER = "nohabe056@gmail.com";

export const OWNER_EMAIL = (process.env.OWNER_EMAIL || HARDCODED_OWNER).toLowerCase().trim();

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === OWNER_EMAIL || normalized === HARDCODED_OWNER.toLowerCase();
}
```

**Implementation points:**
- `/middleware.ts` lines 51-58: Owner is ALWAYS allowed into `/operator` and blocked from `/buyer`, `/referrer`
- `/app/dashboard/page.tsx` lines 25-33: Owner is force-redirected to `/operator`
- `/lib/auth/ensureProfile.ts` lines 18-28: Owner profile is auto-upgraded to `'operator'` role

### REQUIRED CHANGE: Owner Dashboard Routing

**STATUS: ✅ ALREADY IMPLEMENTED**

The email `nohabe056@gmail.com` is:
1. Hardcoded in `/lib/auth/ownerEmail.ts`
2. Checked in middleware to force `/operator` access
3. Auto-assigned `'operator'` role via `ensureProfile()`

**No changes required** for owner routing. The system already routes owner email to the operator dashboard.

---

## 4) Database / Supabase

### Schema Files Location
All migrations are in `/supabase/sql/`:

| File | Purpose |
|------|---------|
| `001_schema.sql` | Core tables |
| `002_rls.sql` | RLS policies |
| `003_automation.sql` | Triggers, cron jobs |
| `004_enhancements.sql` | Properties table, views |
| `005_abuse_fixes_r1.sql` | Security fixes |
| `006_abuse_fixes_r2.sql` | Security fixes |
| `007_abuse_fixes_r3.sql` | Security fixes |
| `008_security_hardening.sql` | Payout double-dip prevention, audit immutability |
| `009_linter_hardening.sql` | Linter fixes |
| `010_supabase_hardening.sql` | Additional hardening |
| `011_profile_bootstrap_fix.sql` | Auto-profile creation trigger |
| `012_fix_profile_select_policy.sql` | RLS policy fixes |
| `013_dual_agent_system.sql` | Agent tables (property_candidates, buyer_leads, agent_health_log) |
| `014_linter_fixes.sql` | Final linter fixes |

### Tables Inventory

| Table | Status | Source File |
|-------|--------|-------------|
| `profiles` | ✅ EXISTS | `001_schema.sql` |
| `referrers` | ✅ EXISTS | `001_schema.sql` |
| `referrer_tier_history` | ✅ EXISTS | `001_schema.sql` |
| `referral_links` | ✅ EXISTS | `001_schema.sql` |
| `buyers` | ✅ EXISTS | `001_schema.sql` |
| `buyer_reputation_events` | ✅ EXISTS | `001_schema.sql` |
| `deals` | ✅ EXISTS | `001_schema.sql` |
| `offers` | ✅ EXISTS | `001_schema.sql` |
| `messages` | ✅ EXISTS | `001_schema.sql` |
| `audit_logs` | ✅ EXISTS | `001_schema.sql` |
| `payouts` | ✅ EXISTS | `001_schema.sql` |
| `properties` | ✅ EXISTS | `004_enhancements.sql` |
| `property_candidates` | ✅ EXISTS | `013_dual_agent_system.sql` |
| `buyer_leads` | ✅ EXISTS | `013_dual_agent_system.sql` |
| `agent_health_log` | ✅ EXISTS | `013_dual_agent_system.sql` |

### Missing Tables
| Table | Status |
|-------|--------|
| `buyer_criteria` | ❌ NOT FOUND (criteria is stored as JSONB in `deals.criteria`) |
| `property_matches` | ❌ NOT FOUND (matching is implicit via deals) |

**Note:** `buyer_criteria` is not a separate table; criteria is stored inline in `deals.criteria` as JSONB.

### Key Table Schemas

**profiles:**
```sql
id uuid PRIMARY KEY REFERENCES auth.users(id)
role text NOT NULL CHECK (role IN ('operator','referrer','buyer'))
email text UNIQUE
phone text
full_name text
created_at timestamptz
```

**deals:**
```sql
id uuid PRIMARY KEY
status text NOT NULL -- 16 possible states
referrer_profile_id uuid REFERENCES referrers
buyer_profile_id uuid REFERENCES buyers
buyer_track_snapshot text ('A' or 'B')
confidence text ('high','medium','low')
exclusive_ends_at timestamptz
referrer_fee_split_percent int
operator_fee_split_percent int
criteria jsonb
... (many more columns)
```

**property_candidates:**
```sql
id uuid PRIMARY KEY
source_platform text ('gc_surplus','alberta_auction','bc_auction','sasksurplus','manual')
source_url text
property_data jsonb
quality_score int (0-100)
bucket text ('approve','junk')
status text ('queued','approved','rejected','expired')
reviewed_by uuid
reviewed_at timestamptz
```

### RLS Policies Summary

**Location:** `/supabase/sql/002_rls.sql`, with updates in `008`, `011`, `012`, `014`

| Table | Operator | Self/Owner | Notes |
|-------|----------|------------|-------|
| `profiles` | Full access | Select/Update own | Insert restricted to buyer role |
| `referrers` | Full access | Select own | - |
| `referral_links` | Full access | Select own | - |
| `buyers` | Full access | Select own | - |
| `deals` | Full access | Buyer/Referrer see own | - |
| `offers` | Full access | Buyer sees deal's offers | - |
| `messages` | Full access | Buyer read/write own | - |
| `audit_logs` | Full access | Insert only (immutable) | No UPDATE/DELETE |
| `payouts` | Full access | None | - |
| `property_candidates` | Full access | None | - |
| `buyer_leads` | Full access | None | - |
| `agent_health_log` | Select + Insert | None | - |

**Key Security Feature:** `is_operator()` function checks if current user has operator role.

---

## 5) Agents / Ingestion Layer

### Agent API Routes

| Route | Purpose | Status |
|-------|---------|--------|
| `/api/agents/listing/scrape-alberta` | Scrape Alberta auctions | ⚠️ STUB (mock data) |
| `/api/agents/listing/scrape-gc` | Scrape GC Surplus | ⚠️ STUB (mock data) |
| `/api/agents/health` | Get agent health metrics | ✅ FUNCTIONAL |

### Agent Implementation Details

**scrape-alberta** (`/app/api/agents/listing/scrape-alberta/route.ts`):
- Returns **mock data** (not actual scraping)
- Creates `property_candidates` records
- Logs to `agent_health_log`
- Auth required (operator)

**scrape-gc** (`/app/api/agents/listing/scrape-gc/route.ts`):
- Same pattern as Alberta - **mock data**
- Auth required (operator)

**health** (`/app/api/agents/health/route.ts`):
- Queries `agent_health_log` for last 50 records
- Calculates success rate
- Returns health status (healthy/degraded/critical)

### UI Wiring

| UI Component | Agent Integration | Status |
|--------------|-------------------|--------|
| `/operator/page.tsx` | Fetches `/api/agents/health` | ✅ WIRED |
| `/operator/page.tsx` | Shows queue count from `property_candidates` | ✅ WIRED |
| `/operator/properties/review/page.tsx` | Fetches `property_candidates` (queued) | ✅ WIRED |
| `/operator/properties/review/page.tsx` | Approve/Reject candidates | ✅ WIRED |

### Edge Functions / Cron

| Item | Status |
|------|--------|
| Supabase Edge Functions | ❌ NOT FOUND (no `/supabase/functions` directory) |
| Vercel Cron | ❌ NOT FOUND (no `vercel.json` with cron config) |
| pg_cron (DB-level) | ✅ EXISTS (`003_automation.sql` - `process_exclusive_expiries` every 10 min) |

### TODOs / Stubs Identified

1. **Scraper routes are mocks** - No actual HTTP scraping implemented
2. **No automated trigger** for scraper routes (manual POST only)
3. **No buyer agent implemented** - `buyer_leads` table exists but no API routes to populate it

---

## 6) Environment Variables

### Required Variables

| Variable | Build/Runtime | Required | Source |
|----------|---------------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Both | ✅ YES | `/lib/env.ts`, `/middleware.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Both | ✅ YES | `/lib/env.ts`, `/middleware.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime | ✅ YES (for profile bootstrap) | `/lib/auth/ensureProfile.ts` |
| `OWNER_EMAIL` | Runtime | ⚠️ Optional (has hardcoded fallback) | `/lib/auth/ownerEmail.ts` |
| `NEXT_PUBLIC_APP_URL` | Runtime | ⚠️ Optional (defaults to localhost) | `/lib/env.ts` |

### .env.example Contents
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OWNER_EMAIL=
```

### Build vs Runtime

**Build-time required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Runtime-only:**
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `OWNER_EMAIL` (has fallback)
- `NEXT_PUBLIC_APP_URL` (has fallback)

---

## 7) Build Health

### Lint Check
```
✅ No ESLint warnings or errors
```

### TypeScript Check
```
✅ No type errors (tsc --noEmit passes)
```

### Build Output
```
✅ Build successful
- 22 routes generated
- No compile errors
- Middleware: 73.4 kB
```

### Potential Risks

| Risk | Severity | Location | Notes |
|------|----------|----------|-------|
| `any` types in portal pages | Low | `/app/operator/page.tsx`, `/app/buyer/page.tsx`, `/app/referrer/page.tsx` | Type safety reduced |
| Non-null assertions on env vars | Medium | `/middleware.ts:15-16` | `process.env.X!` - will throw at runtime if missing |
| External images unoptimized | Low | `/app/operator/properties/review/page.tsx:98` | `unoptimized` flag used for external images |

### Server/Client Boundary Compliance

| File | Directive | Status |
|------|-----------|--------|
| `/app/auth/AuthClient.tsx` | `'use client'` | ✅ Correct |
| `/app/operator/page.tsx` | `'use client'` | ✅ Correct |
| `/app/buyer/page.tsx` | `'use client'` | ✅ Correct |
| `/app/referrer/page.tsx` | `'use client'` | ✅ Correct |
| `/app/operator/properties/review/page.tsx` | `'use client'` | ✅ Correct |
| `/app/onboarding/role/page.tsx` | `'use client'` | ✅ Correct |
| `/components/AppShell.tsx` | `'use client'` | ✅ Correct |
| `/app/dashboard/page.tsx` | (none - Server Component) | ✅ Correct |
| `/app/layout.tsx` | (none - Server Component) | ✅ Correct |

---

## 8) Gap List (Prioritized)

### P0: Critical - Must Fix for Core Functionality

| # | Issue | Status | Action Required |
|---|-------|--------|-----------------|
| 1 | Owner dashboard routing | ✅ DONE | Already implemented with email hardening |
| 2 | Owner role gating | ✅ DONE | Middleware blocks owner from `/buyer`, `/referrer` |
| 3 | Profile bootstrap | ✅ DONE | DB trigger + `ensureProfile()` fallback |

**P0 Summary: No blocking issues found for owner dashboard routing.**

### P1: Must Fix for Ingestion Agents Phase 1

| # | Issue | File(s) | Action Required |
|---|-------|---------|-----------------|
| 1 | Scraper routes are mocks | `/app/api/agents/listing/*.ts` | Implement actual scraping logic (cheerio, puppeteer, etc.) |
| 2 | No cron/scheduler for agents | N/A | Add Vercel cron config or external scheduler to trigger scraper routes |
| 3 | No buyer agent routes | N/A | Implement `/api/agents/buyer/*` routes if buyer lead scraping is needed |
| 4 | Agent auth is basic | `/app/api/agents/listing/*.ts` | Add API key / cron secret verification for production |

### P2: Nice-to-Have / Technical Debt

| # | Issue | File(s) | Notes |
|---|-------|---------|-------|
| 1 | Replace `any` types | Portal pages | Add proper TypeScript interfaces for deals, profiles, etc. |
| 2 | Add `vercel.json` | Root | Configure cron jobs, redirects if needed |
| 3 | Onboarding flow unused | `/app/onboarding/role/page.tsx` | Page exists but not linked from auth flow |
| 4 | Missing property-to-deal conversion | `/app/operator/properties/review/page.tsx` | "Approve" updates candidate status but doesn't create a deal |
| 5 | No referral link landing page | N/A | `/ref/[code]` route does not exist for referral tracking |
| 6 | `buyer_criteria` not normalized | N/A | Criteria stored in `deals.criteria` JSONB, not separate table |
| 7 | No test suite | N/A | No Jest/Vitest/Playwright tests found |
| 8 | Vulnerable dependencies | `/package.json` | 3 high severity vulnerabilities (run `npm audit`) |

---

## Summary

### What Exists ✅
- Complete Next.js 14 App Router structure
- Supabase Auth with Google OAuth
- Four role-based dashboards (operator, buyer, referrer) - owner uses operator dashboard
- Owner email hardening with hardcoded fallback (`nohabe056@gmail.com`)
- Comprehensive database schema with 15+ tables
- RLS policies for all tables
- Agent health monitoring
- Property candidate review queue UI
- Deal lifecycle management (Kanban board)
- Payout management UI

### What's Missing ❌
- Real scraper implementations (current routes return mock data)
- Automated agent scheduling (cron jobs)
- Buyer agent/lead scraping
- Referral link landing page (`/ref/[code]`)
- Test suite
- Separate `buyer_criteria` table (using JSONB in deals instead)

### What's Working ✅
- Lint: Clean
- TypeScript: Clean
- Build: Passes
- Auth flow: Complete
- Owner routing: Implemented
- Role gating: Implemented

---

*End of Audit Pack*
