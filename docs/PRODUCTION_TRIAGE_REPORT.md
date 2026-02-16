# Production Triage Report — Surplus Bus Auth + UI Interactivity

**Date:** 2026-02-16  
**Scope:** Auth flow, middleware, callback, UI interactivity

---

## 1. Vercel Env Usage

| Variable | Read At | Location | Status |
|----------|---------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Runtime | `middleware.ts:35`, `callback/route.ts:30`, `lib/env.ts:15`, `client.ts`, `server.ts` | ✅ Inlined at build for client; `process.env` at runtime for middleware/callback |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Runtime | Same | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | `serviceRole.ts:12`, `ensureProfile.ts:82` | ✅ Never in client bundle |
| `CRON_SECRET` | Server only | `verifyAgentAuth.ts:21` | ✅ |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` | Build/runtime | `lib/env.ts:17-19` — fallback chain | ⚠️ Vercel may use `NEXT_PUBLIC_SITE_URL`; fallback added |

**Risk:** If `NEXT_PUBLIC_SUPABASE_*` are missing at Vercel build, client gets `env = null` → `createClient()` returns null → "Authentication is not configured."

---

## 2. Middleware Redirects

| Check | Result | Evidence |
|-------|--------|----------|
| `/auth` NOT protected | ✅ | `PUBLIC_ROUTES` includes `"/auth"`; `isPublic("/auth")` true |
| Protected → unauth redirect | ✅ | `authUrl.searchParams.set("callbackUrl", pathname + search)` |
| Authed user on `/auth` → `/dashboard` | ✅ | `pathname.startsWith("/auth") && !pathname.startsWith("/auth/callback")` |
| Matcher excludes static | ⚠️ | Excludes `_next/static`, `_next/image`, `favicon.ico`, image extensions. **Missing:** `robots.txt` |

**File:** `middleware.ts:102-104`

---

## 3. Auth Callback Route

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Exchange code for session | ✅ | `exchangeCodeForSession(code)` |
| Write cookies to redirect Response | ✅ | `setAll` writes to `response.cookies` |
| Redirect to sanitized `next` | ✅ | `NextResponse.redirect(redirectUrl)` |
| Logging | ✅ | `[Auth] Callback invoked`, `Exchange failed`, `Session exchanged` |
| Error redirect on exchange fail | ✅ | `/auth?error=exchange_failed` (or `cookie_write_failed`, `profile_init_failed`) |

**Update:** Exchange and profile-init failures now redirect to `/auth?error=callback_failed`.

---

## 4. UI Interactivity

| Component | Client? | Handlers | Status |
|-----------|---------|----------|--------|
| Auth page | Server (page) + Client (AuthClient) | `onClick={handleGoogleSignIn}` | ✅ Bound |
| AuthClient | `"use client"` | `handleGoogleSignIn` | ✅ |
| Landing beta signup | `"use client"` | `onSubmit={submit}` | ✅ Bound |
| No `"use server"` | — | — | ✅ None in app |

**Hydration:** AuthClient uses `useSearchParams()` — wrapped in `<Suspense>` in auth page. ✅

---

## 5. Root Cause Hypotheses (Ranked)

### 1. **Supabase redirect URL not allowlisted (HIGH)**
**Evidence:** If OAuth completes but Supabase redirects to wrong URL, app receives no `code` → `missing_code`.  
**Files:** Supabase Dashboard (not in repo), `AuthClient.tsx:36` builds `callbackUrl = ${origin}/auth/callback?next=...`  
**Fix:** Add `https://surplus-bus.vercel.app/auth/callback` to Supabase → Authentication → URL Configuration → Redirect URLs.

### 2. **Env vars missing or wrong at Vercel build (MEDIUM)**
**Evidence:** `lib/env.ts` — if parse fails, `env = null`, `createClient()` returns null, AuthClient shows "not configured."  
**Files:** `lib/env.ts`, `lib/supabase/client.ts`  
**Fix:** Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel → Settings → Environment Variables for Production.

### 3. **Cookie domain / SameSite in production (LOWER)**
**Evidence:** `response.cookies.set()` in callback — if domain/SameSite mismatch, session not persisted.  
**Files:** `app/auth/callback/route.ts:48-50`  
**Fix:** Verify Supabase cookie options; ensure production domain matches.

---

## 6. Patch List

| File | Change |
|------|--------|
| `middleware.ts` | Add `robots.txt` to matcher exclusion |
| `app/auth/callback/route.ts` | Use `callback_failed` for exchange failure; add final redirect target log; explicit 302 |
| `docs/PRODUCTION_TRIAGE_REPORT.md` | This report |

---

## 7. Quick Verification (Production URL)

1. **Unauth → protected:** Open `https://surplus-bus.vercel.app/dashboard` → expect redirect to `/auth?callbackUrl=/dashboard`
2. **Auth page:** Click "Continue with Google" → expect redirect to Google
3. **After Google:** Expect redirect to `/auth/callback?code=...` then `/dashboard` (or `callbackUrl` target)
4. **Error case:** If `missing_code`, check Supabase redirect URLs
5. **Vercel logs:** Deployments → Functions → auth/callback → check `[Auth]` logs
