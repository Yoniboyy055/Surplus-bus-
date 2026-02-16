# Production Environment Variables

All env vars required for Surplus Bus in production (Vercel).

---

## Public (exposed to client bundle)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | No | App base URL (default: `http://localhost:3000`). Vercel may use `NEXT_PUBLIC_SITE_URL` instead. |

---

## Server-only (never exposed to client)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service role key. Required for profile bootstrap, agent writes. **App will throw at boot if missing in production.** |
| `CRON_SECRET` | Yes (for cron) | Bearer token for `/api/agents/listing/scrape-*` cron routes |
| `OWNER_EMAIL` | No | Email that gets operator role automatically |

---

## Where to set (Vercel)

1. Project → **Settings** → **Environment Variables**
2. Add each variable for **Production** (and Preview if needed)
3. Redeploy after changing env vars

---

## Validation

- **Boot (Vercel only):** Server throws if `SUPABASE_SERVICE_ROLE_KEY` is missing when running on Vercel (`VERCEL=1`). Local builds skip this check.
- **Profile bootstrap:** `ensureProfile` throws with env var name if service role key is missing.
