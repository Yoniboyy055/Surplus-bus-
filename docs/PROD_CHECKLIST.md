# Production Checklist

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only. Profile bootstrap, agents, dashboard/status source_runs |
| `CRON_SECRET` | Yes | Bearer token for agent cron. Must match Vercel cron requests |
| `NEXT_PUBLIC_SITE_URL` | Optional | App URL for redirects |
| `OWNER_EMAIL` | Optional | Owner email → redirect to /ops |

**Never expose `SUPABASE_SERVICE_ROLE_KEY` or `CRON_SECRET` to the client.**

---

## Verify UI

1. **Logged out:** Visit `/dashboard` → redirect to `/auth`
2. **Logged in:** Visit `/dashboard` → KPIs, recent opportunities, data status pill
3. **Feed:** `/feed` → last 50 events (or empty state)
4. **Opportunities:** `/opportunities` → list with province/category/search filters
5. **Detail:** Click opportunity → `/opportunities/[id]` → full details + activity

---

## Verify Agent Cron

**Scheduling:** Vercel cron only (daily). No interval-based runners.

| parser_key | Path | UTC |
|------------|------|-----|
| gc_buyandsell | /api/agents/run?parser_key=gc_buyandsell | 11:00 |
| canadabuys | /api/agents/run?parser_key=canadabuys | 12:00 |
| ab_surplus | /api/agents/run?parser_key=ab_surplus | 13:00 |
| on_surplus | /api/agents/run?parser_key=on_surplus | 14:00 |
| city_toronto_surplus | /api/agents/run?parser_key=city_toronto_surplus | 15:00 |
| city_ottawa_surplus | /api/agents/run?parser_key=city_ottawa_surplus | 16:00 |
| city_calgary_surplus | /api/agents/run?parser_key=city_calgary_surplus | 17:00 |
| city_edmonton_surplus | /api/agents/run?parser_key=city_edmonton_surplus | 18:00 |

1. **Vercel crons:** Check `vercel.json` — daily schedules only
2. **Manual run:**
   ```powershell
   $env:CRON_SECRET = "your-secret"
   Invoke-WebRequest -Uri "https://YOUR_DOMAIN/api/agents/run?parser_key=gc_buyandsell" -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }
   ```
3. **Expected:** 200 JSON with `ok: true`, `runs`, `total_duration_ms`

---

## Troubleshooting

| Symptom | Where to look |
|---------|---------------|
| 404 on `/api/_ping` | Middleware matcher (exclude `api`), Vercel root directory |
| 401 on agent run | CRON_SECRET mismatch, Bearer header |
| Empty opportunities | Run agents; check `source_runs` for success; check `opportunities` table |
| Profile init failed | `SUPABASE_SERVICE_ROLE_KEY` in Vercel; `ensureProfile` logs |
| Data status always amber | Last `source_runs` success > 24h ago; run agent manually |
| Recent failures | Dashboard shows "Recent failures (24h)" from `source_runs` where status='failure' |

**Tables:**
- `source_runs` — agent run history (status, items_found, items_upserted, error_message)
- `opportunities` — ingested listings
- `opportunity_events` — feed timeline
- `ingestion_failures` — legacy; agents now use `source_runs.error_message`

**Logs:** API routes log `api_start` / `api_end` with requestId, userId, durationMs. Check Vercel function logs.
