# Surplus Bus

Surplus Bus is a public-sector opportunity intelligence platform. It monitors surplus listings and procurement-style opportunities, then delivers targeted alerts and trend analytics so users can act faster than competitors.

> **Positioning:** Surplus Bus is an information service, not a broker, marketplace, or transaction intermediary.

## Value & Purpose
- Detect opportunities early.
- Filter noisy public data into actionable alert streams.
- Provide analytics and trend context for better decision-making.

## Product Foundations Implemented
- Auth flow and role-aware onboarding (`/auth`, `/dashboard`).
- Beta landing page with email capture (`/landing`).
- User-facing product overview (`/product`).
- Freemium pricing surface (`/pricing`).
- Legal and policy pages (`/legal/*`).
- API routes for analytics, alerts, profiles, and beta signups.

## Architecture Diagram
```text
[Public Data Sources]
   |  (scheduled cron + ingestion agents)
   v
[Next.js API Agents] ---> [ingestion_runs / ingestion_failures logs]
   |                          |
   v                          v
[Supabase tables: property_candidates, alert_rules, subscriptions, profiles]
   |
   +--> [/api/alerts] ---> User alert config dashboard
   +--> [/api/analytics] -> Trend + engagement views
   +--> [/api/profile] ---> User preferences/profile management
   +--> [/api/beta-signups] -> Invitation-based beta funnel
```

## Onboarding Walkthrough
1. User joins beta waitlist via `/landing`.
2. User signs in via `/auth`.
3. Profile and preferences are initialized.
4. User creates alert rules via `/api/alerts`.
5. User monitors performance via `/api/analytics` and dashboard UI.

## Success Metrics Targets
- Beta signups: `>= 100` in first 2 weeks.
- DAU: `>= 30%` of beta list.
- Alert engagement rate: `>= 25%`.
- Paid conversion post-beta: `>= 5%`.

## Daily Status Update Format
```text
[YYYY-MM-DD]

🔹 Work completed
🔹 Tasks in progress
🔹 Blockers & risks
🔹 Next 3 tasks
🔹 Metrics update (if available)
```

## Local Development
1. `npm install`
2. Configure `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET`).
3. `npm run dev`
4. Open `http://localhost:3000`

## SQL Migrations
Apply SQL in `supabase/sql/` in order, including `015_public_launch_foundation.sql` for launch-readiness tables.

## Opportunity Intelligence Engine (Phase 1)
- New canonical data model: `opportunities`, `opportunity_history`, `opportunity_features`.
- Scoring formula combines demand, value, and urgency signals and normalizes to 0–100.
- Personalized ranking API: `GET /api/opportunities/ranked`.
- Operator-only recompute endpoint: `POST /api/opportunities/recompute-scores`.

## Security Hardening Updates
- API profile, alerts, and subscription endpoints now enforce authenticated-user ownership (no arbitrary profile_id writes).
- Middleware now gracefully handles missing Supabase env values and avoids crashing local runtime.
