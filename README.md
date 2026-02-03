# Surplus Bus

## What Surplus Bus Is

Surplus Bus is an intelligence platform that monitors, aggregates, and analyzes surplus property and auction data from government sources. It functions as a monitoring system, alerting engine, and analytics platform.

## What Surplus Bus Does

Surplus Bus provides three core capabilities:

1. **Construction / RFP Alerts** - Monitors and alerts on construction projects and request-for-proposal opportunities from government sources.

2. **Auction & Surplus Alerts** - Tracks surplus property listings and auction opportunities, providing timely notifications to subscribers.

3. **Auction Intelligence / Analytics** - Aggregates historical and current auction data to provide analytical insights, trend analysis, and market intelligence.

## What Surplus Bus Does NOT Do

Surplus Bus does NOT:
- facilitate transactions between parties
- negotiate on behalf of users
- bid on behalf of users
- introduce buyers to sellers
- earn success fees or commissions
- provide recovery or wholesaling services
- act as a broker, agent, or marketplace
- represent users in any capacity
- guarantee outcomes or results

## Mental Model

Surplus Bus helps users see opportunities and data. Users act independently based on the information provided. The platform is a data source and intelligence tool, not a transactional intermediary.

## Audience

Surplus Bus serves:
- **Subscribers** - Users who receive alerts and access intelligence data
- **Analysts** - Users who analyze aggregated data and trends
- **Operators** - Internal users who manage data ingestion, quality, and system operations

Surplus Bus does NOT serve buyers, sellers, referrers, or any transactional parties.

## Legal & Structural Positioning

Surplus Bus provides information only. The platform:
- makes no representations about data accuracy or completeness
- provides no guarantees about outcomes
- has no transactional involvement
- does not represent users in any capacity
- operates as an information service only

## Internal Rule (Agent Lock)

If a feature implies transaction facilitation, buyer/seller matching, fee collection, or any form of intermediation, it is out of scope.

## Technical Overview

### Architecture
- Next.js 14 App Router + TypeScript
- Supabase for data storage and authentication
- Vercel for hosting and cron scheduling
- Tailwind CSS for styling

### Data Ingestion
Listing agents automatically collect surplus property and auction data from government sources:
- `/api/agents/listing/scrape-alberta` - Daily at 11:00 UTC
- `/api/agents/listing/scrape-gc` - Daily at 12:00 UTC

See `/docs/agents.md` for agent documentation.

### Environment Variables
Create a `.env.local` file (see `.env.example`) with:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `CRON_SECRET` - Secret for agent endpoint authentication (server-side only)

### Local Development
1. Install dependencies: `npm install`
2. Configure `.env.local`
3. Run the dev server: `npm run dev`
4. Visit `http://localhost:3000`

### Deployment
1. Set environment variables in Vercel
2. Add production redirect URL in Supabase: `https://<your-domain>/auth/callback`
3. Deploy from repository root

### Supabase Setup
- Enable Email auth (magic link)
- Add redirect URL: `http://localhost:3000/auth/callback`
- Apply SQL migrations from `supabase/sql/` directory
