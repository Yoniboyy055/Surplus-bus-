# Surplus Bus Auth Audit & Fix Report

## A) Route Inventory

| URL Path | File Path | Renders | Auth Required | Redirect/Guard Logic |
|----------|-----------|---------|---------------|----------------------|
| `/` | `app/page.tsx` | Public homepage, CTAs to landing/product | No | None |
| `/landing` | `app/landing/page.tsx` | Beta waitlist form | No | None |
| `/product` | `app/product/page.tsx` | Product overview | No | None |
| `/pricing` | `app/pricing/page.tsx` | Pricing surface | No | None |
| `/faq` | `app/faq/page.tsx` | FAQ | No | None |
| `/auth` | `app/auth/page.tsx` | Login (Google OAuth) | No | Layout redirects to /dashboard if already logged in |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth code exchange | No (handler) | Exchanges code, sets cookies, redirects to `next` param |
| `/dashboard` | `app/dashboard/page.tsx` | RBAC router (redirects by role) | Yes | Server: redirect to /auth if no user; redirect to /operator|/buyer|/referrer by role |
| `/operator` | `app/operator/page.tsx` | Operator portal | Yes | Middleware + client useEffect |
| `/operator/payouts` | `app/operator/payouts/page.tsx` | Payouts | Yes | Middleware |
| `/operator/properties/review` | `app/operator/properties/review/page.tsx` | Property review | Yes | Client useEffect |
| `/buyer` | `app/buyer/page.tsx` | Buyer portal | Yes | Middleware + client useEffect |
| `/referrer` | `app/referrer/page.tsx` | Referrer portal | Yes | Middleware + client useEffect |
| `/onboarding/role` | `app/onboarding/role/page.tsx` | Role selection | Yes (client) | Client checks user, redirects to /auth if none |
| `/legal/terms` | `app/legal/terms/page.tsx` | Terms | No | None |
| `/legal/privacy` | `app/legal/privacy/page.tsx` | Privacy | No | None |
| `/legal/anti-spam` | `app/legal/anti-spam/page.tsx` | Anti-spam | No | None |
| `/401` | `app/401/page.tsx` | Unauthorized | No | None |
| `/403` | `app/403/page.tsx` | Forbidden | No | None |

### API Routes

| Path | Auth | Notes |
|------|------|-------|
| `/api/health` | No | Health check |
| `/api/beta-signups` | No | Public beta signup |
| `/api/profile` | Yes (requireUser) | GET/PATCH profile |
| `/api/alerts` | Yes | GET/POST alert rules |
| `/api/analytics` | Yes | Analytics |
| `/api/subscription` | Yes | Subscription |
| `/api/opportunities/ranked` | Yes | Ranked opportunities |
| `/api/opportunities/recompute-scores` | Yes (operator) | Recompute |
| `/api/deals` | Yes | Deals CRUD |
| `/api/referral-links` | Yes | Referral links |
| `/api/payouts` | Yes | Payouts |
| `/api/agents/*` | CRON_SECRET | Agent scrapers |

---

## B) Auth/Redirect Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION LIFECYCLE                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

1. LOGIN START
   └─ UI: app/auth/page.tsx → AuthClient.tsx
   └─ Button: "Continue with Google" → handleGoogleSignIn()
   └─ Library: Supabase Auth (@supabase/ssr, @supabase/supabase-js)

2. OAUTH FLOW
   └─ signInWithOAuth({ provider: "google", options: { redirectTo } })
   └─ redirectTo = /auth/callback?next={callbackUrl|/dashboard}
   └─ User → Google → Supabase → /auth/callback?code=xxx&next=...

3. SESSION CREATION
   └─ app/auth/callback/route.ts
   └─ exchangeCodeForSession(code) → session tokens
   └─ Storage: cookies (Set-Cookie on Response) ← FIX: was not setting cookies
   └─ ensureProfile() → create/update profiles row

4. POST-LOGIN REDIRECT
   └─ NextResponse.redirect(next) with cookies attached
   └─ next = /dashboard (default) or callbackUrl from protected route

5. IS_AUTHENTICATED CHECKS
   └─ Middleware: supabase.auth.getUser() on protected routes
   └─ Server: createClient().auth.getUser() in dashboard, API requireUser
   └─ Client: supabase.auth.getUser() in buyer/operator/referrer useEffect

6. REDIRECT RULES
   └─ Unauthenticated + protected route → /auth?callbackUrl={path}
   └─ Authenticated + /auth → layout redirect to /dashboard
   └─ Role mismatch (e.g. buyer on /operator) → /dashboard
   └─ Owner email → /operator
```

---

## C) Root Cause + Evidence

### Bug: "After successful sign-in, user is returned to / (homepage)"

**Most likely root causes (ranked):**

1. **Session cookies not set in auth callback (PRIMARY)**
   - **Evidence:** `app/auth/callback/route.ts` used `createClient()` from `lib/supabase/server.ts`, which uses `cookies()` from `next/headers`. In Next.js Route Handlers, `cookies().set()` throws and cannot be used. The server client's `setAll` catches the error and silently ignores it (`lib/supabase/server.ts` lines 18–24).
   - **Result:** `exchangeCodeForSession` ran, but session cookies were never written to the response. The redirect to `/dashboard` had no cookies. Dashboard's `getUser()` saw no session → redirected to `/auth`. User perceived a "bounce" (or landed on `/` if layout rendered public shell first).

2. **Supabase Site URL / Redirect URL misconfiguration**
   - If Supabase dashboard "Site URL" is `http://localhost:3000` (root) instead of including `/auth/callback`, OAuth might redirect to `/` with tokens in URL fragment. Server never sees them.

3. **Next.js route prefetching**
   - Supabase docs: prefetch can send requests before browser has cookies. Less likely if the primary fix (cookies) is correct.

### Exact code lines causing the bug

- `lib/supabase/server.ts` lines 18–24: `setAll` catches and ignores `cookieStore.set()` failure.
- `app/auth/callback/route.ts` (before fix): Used that server client; returned `NextResponse.redirect()` without attaching session cookies.

---

## D) Patch Plan (Implemented)

1. **Auth callback route** – Use `createServerClient` with a cookie handler that writes to the redirect `Response` (same pattern as middleware). Create the response first, then pass it to `setAll` so cookies are set on the returned response.
2. **AuthClient** – Read `callbackUrl` or `next` from URL and pass to `redirectTo` so post-login lands on the intended page.
3. **Middleware** – When redirecting unauthenticated users from protected routes to `/auth`, add `callbackUrl` query param.
4. **Auth layout** – Redirect already-authenticated users from `/auth` to `/dashboard`.

---

## E) Code Edits (Diffs)

### 1. `app/auth/callback/route.ts`

- Replaced `createClient()` from server with inline `createServerClient` using request/response cookie handling.
- Create `NextResponse.redirect(next)` before `exchangeCodeForSession`.
- In `setAll`, write cookies to that response.
- Return the same response (with cookies) on success.

### 2. `app/auth/AuthClient.tsx`

- Read `callbackUrl` or `next` from `window.location.search`.
- Build `redirectTo` as `/auth/callback?next={encodeURIComponent(next)}`.
- Pass `redirectTo` to `signInWithOAuth` options.

### 3. `middleware.ts`

- When redirecting unauthenticated users to `/auth`, set `callbackUrl` to the current pathname.

### 4. `app/auth/layout.tsx` (new)

- Server layout that checks `getUser()`.
- If user exists, `redirect("/dashboard")`.

---

## F) UI/Flow Recommendations

### Public flow
- Landing → Pricing → Login
- Nav: Home | Beta | Pricing | FAQ | Login

### Authenticated flow
- Dashboard (role router) → /operator | /buyer | /referrer
- Primary nav: Dashboard | Payouts/Audit (operator) | Submit Criteria | Active Deals (buyer) | Generate Links | My Referrals (referrer)

### First-run onboarding
- New users get a profile via `ensureProfile` with default role `referrer` (or `operator` for owner email).
- Dashboard immediately redirects by role.
- Optional: redirect users with `role = null` to `/onboarding/role` for explicit selection.

### UI checklist
- [x] Auth page: Terms/Privacy links point to `/legal/terms`, `/legal/privacy`
- [x] Buyer empty state: "Start searching surplus" CTA scrolls to criteria form
- [ ] Landing CTA: "Join Beta" and "Login" (if not logged in)
- [ ] Consistent nav between public and app shell
- [ ] Loading states during auth redirect

---

## Verification (see docs/QA_AUTH.md)

### 1. Confirm cookies are written
- **DevTools → Application → Cookies:** Supabase auth cookies (`sb-...`) after login.
- **Network → /auth/callback:** Response must include `Set-Cookie` headers.

### 2. Redirect scenarios
- **A) Clean login:** /auth → sign in → /dashboard (or role portal).
- **B) Protected callbackUrl:** /buyer → /auth?callbackUrl=%2Fbuyer → sign in → /buyer.
- **C) Auth lockout:** Logged in + /auth → /dashboard.

### 3. Open-redirect hardening
- `lib/auth/sanitizeRedirect.ts` allowlists paths: `/dashboard`, `/operator`, `/buyer`, `/referrer`, `/onboarding`, `/settings`.
- Rejects `://`, `//`, `..`, and non-allowlisted paths.

### 4. Middleware explicit routes
- **Protected:** `/dashboard`, `/operator`, `/buyer`, `/referrer`, `/onboarding`.
- **Public:** `/`, `/landing`, `/product`, `/pricing`, `/faq`, `/auth`, `/legal`, `/401`, `/403`.

### 5. Cookie write failure guardrail
- Auth callback: try/catch around `exchangeCodeForSession`; on throw, redirect to `/auth?error=cookie_write_failed`.
- Server client: `console.error` on `setAll` failure (no silent swallow).
