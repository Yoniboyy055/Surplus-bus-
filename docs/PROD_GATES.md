# Production Verification Gates

Run these checks before deploying to production.

---

## 1. Auth Gates

### Protected routes redirect to /auth with callbackUrl
- Unauthenticated user visits `/dashboard` → redirect to `/auth?callbackUrl=/dashboard`
- After login → redirect to `/dashboard` (or original path)

### Return to intended page after login
- User lands on `/auth?callbackUrl=/opportunities` → after OAuth → lands on `/opportunities`

### Cookie Set-Cookie verification for /auth/callback
- OAuth callback must write session cookies to the Response
- Verify: after login, `sb-*-auth-token` cookies are set
- If cookie write fails → redirect to `/auth?error=cookie_write_failed`

---

## 2. RLS Verification Queries

Run in Supabase SQL editor (or psql):

```sql
-- Logged out: opportunities unreadable
-- (Use anon key, no session)
SELECT * FROM public.opportunities LIMIT 1;
-- Expected: 0 rows (RLS blocks)

-- Logged in: opportunities readable
-- (Use authenticated role with valid JWT)
SELECT * FROM public.opportunities LIMIT 1;
-- Expected: rows if any exist
```

---

## 3. Agent Verification

### Cron routes succeed only with CRON_SECRET
- `POST /api/agents/listing/scrape-alberta` without `Authorization: Bearer <CRON_SECRET>` → **401 Unauthorized**
- `POST /api/agents/listing/scrape-gc` without header → **401**
- With valid Bearer token → **200** + writes to `ingestion_runs`, `agent_health_log`, `property_candidates`

### Writes via service_role
- Agent routes use `createServiceRoleClient()` for all DB writes
- No RLS write failures possible (service_role bypasses RLS)

---

## 4. Out-of-Scope Scan

Repo must NOT contain these strings in routes, nav, or APIs:
- `buyer` (as route/path)
- `referrer` (as route/path)
- `deals`
- `payouts`
- `commission`
- `escrow`
- `marketplace`

Run: `npm run audit:scope`

---

## 5. Build & Scripts

```bash
npm run build        # Must pass
npm run audit:scope  # Must pass (no out-of-scope strings)
npm run audit:routes # Prints route inventory
```

---

## 6. Runtime Checks (Manual)

| Check | Expected |
|-------|----------|
| Unauth → /dashboard | Redirect to /auth?callbackUrl=/dashboard |
| Login → /dashboard | Land on /dashboard |
| Open /feed | Shows events (or empty state) |
| Cron without header | 401 |
| Cron with Bearer secret | 200 + writes |
