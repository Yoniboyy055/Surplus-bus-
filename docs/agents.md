# Listing Agents Documentation

## Overview

The Listing Agents system automatically scrapes surplus property listings from government sources and queues them for operator review. This document covers the automation pipeline, authentication, and monitoring.

## Agent Endpoints

### 1. Alberta Auction Agent
- **Route**: `/api/agents/listing/scrape-alberta`
- **Schedule**: Daily at 06:00 America/Toronto (11:00 UTC)
- **Source**: Alberta Surplus Auction Platform

### 2. GC Surplus Agent
- **Route**: `/api/agents/listing/scrape-gc`
- **Schedule**: Daily at 07:00 America/Toronto (12:00 UTC)
- **Source**: GC Surplus (Government of Canada)

## Authentication

Agent endpoints accept authentication via two methods:

### 1. Operator Session (Manual Testing)
For manual testing and operator-initiated runs:
- User must be authenticated via Supabase Auth
- User must have `role='operator'` in the `profiles` table
- No additional headers required

**Example (using curl):**
```bash
# First, authenticate via browser and get session cookie
# Then use the cookie in your request:
curl -X POST http://localhost:3000/api/agents/listing/scrape-alberta \
  -H "Cookie: your-session-cookie"
```

### 2. Cron Secret (Automated Runs)
For Vercel Cron scheduled runs:
- Set `CRON_SECRET` environment variable in Vercel
- Include `Authorization: Bearer <CRON_SECRET>` header in request
- Vercel Cron automatically includes this header when configured

**Example:**
```bash
curl -X POST https://your-domain.vercel.app/api/agents/listing/scrape-alberta \
  -H "Authorization: Bearer your-cron-secret"
```

## Queue Cap & Safety

To prevent system overload, agents implement a queue cap:

- **Cap**: 100 queued items (`status='queued'`)
- **Behavior**: If queue cap is reached:
  - No new candidates are inserted
  - Agent logs a health event with `status='success'`, `items_found=0`, `items_queued=0`
  - Metadata includes `{reason: 'queue_cap_reached', queued_count: <count>}`
  - Returns HTTP 200 with message "queue cap reached"

This ensures operators can process the backlog before new items are added.

## Health Logging

Each agent run logs metrics to the `agent_health_log` table:

- **agent_type**: `'listing'`
- **agent_name**: `'scrape_alberta_auction'` or `'scrape_gc_surplus'`
- **status**: `'success'` or `'failure'`
- **items_found**: Number of items discovered during scraping
- **items_queued**: Number of items successfully inserted
- **execution_time_ms**: Total execution time in milliseconds
- **error_message**: Error message (if status is 'failure')
- **error_stack**: Stack trace (if available)
- **source_url**: Source platform URL
- **metadata**: Additional context (e.g., queue cap reached)

## Monitoring

### View Health Logs
Access health logs via the operator dashboard or API:

**API Endpoint**: `GET /api/agents/health`
- Requires operator authentication
- Returns recent logs and aggregated metrics

**Operator Dashboard**: `/operator`
- Displays agent health status and recent runs

### Review Queued Properties
View and review queued properties:

**Operator Portal**: `/operator/properties/review`
- Lists all `property_candidates` with `status='queued'`
- Operators can approve or reject candidates
- Approved candidates become available for matching

## Environment Variables

### Required for Production

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Cron Authentication (Server-side only)
CRON_SECRET=your-secure-random-secret
```

### Local Development

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-local-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
CRON_SECRET=dev-secret-for-testing
```

**Note**: `CRON_SECRET` is server-side only (not prefixed with `NEXT_PUBLIC_`). Never expose it to the client.

## Vercel Cron Configuration

Cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/agents/listing/scrape-alberta",
      "schedule": "0 11 * * *"
    },
    {
      "path": "/api/agents/listing/scrape-gc",
      "schedule": "0 12 * * *"
    }
  ]
}
```

**Timezone Note**: Vercel Cron uses UTC. The schedules above convert:
- 06:00 America/Toronto (EST, UTC-5) = 11:00 UTC
- 07:00 America/Toronto (EST, UTC-5) = 12:00 UTC

During daylight saving time (EDT, UTC-4), times will be:
- 06:00 EDT = 10:00 UTC
- 07:00 EDT = 11:00 UTC

Adjust schedules if you need consistent local time year-round.

## Manual Testing

### Test as Operator

1. Log in as an operator user
2. Navigate to `/operator` dashboard
3. Use browser dev tools to trigger POST request, or use curl with session cookie

### Test with Cron Secret

```bash
# Set your secret
export CRON_SECRET="your-secret"

# Test Alberta agent
curl -X POST http://localhost:3000/api/agents/listing/scrape-alberta \
  -H "Authorization: Bearer $CRON_SECRET"

# Test GC Surplus agent
curl -X POST http://localhost:3000/api/agents/listing/scrape-gc \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Verification Checklist

After deployment, verify:

1. ✅ Cron jobs are scheduled in Vercel dashboard
2. ✅ `CRON_SECRET` is set in Vercel environment variables
3. ✅ Agent endpoints return 200 when called with cron secret
4. ✅ Agent endpoints return 401 when called without auth
5. ✅ Queue cap prevents insertion when 100+ items queued
6. ✅ Health logs are created for each run
7. ✅ Queued properties appear in `/operator/properties/review`
8. ✅ Operator dashboard shows agent health metrics

## Troubleshooting

### Agent returns 401 Unauthorized
- Check that `CRON_SECRET` is set in Vercel
- Verify Authorization header format: `Bearer <secret>`
- For manual testing, ensure you're logged in as operator

### Agent returns "queue cap reached"
- Normal behavior when 100+ items are queued
- Process queued items via `/operator/properties/review`
- Agent will resume inserting when queue drops below 100

### No health logs appearing
- Check Supabase connection
- Verify RLS policies allow inserts to `agent_health_log`
- Check server logs for errors

### Cron jobs not running
- Verify `vercel.json` is committed and deployed
- Check Vercel dashboard > Settings > Cron Jobs
- Ensure project is on a plan that supports cron jobs

## Future Enhancements

- Real scraping implementation (currently using mock data)
- Retry logic for failed runs
- Rate limiting per source
- Webhook notifications for failures
- Queue cap configuration via environment variable
