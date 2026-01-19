# Surplus Referral Platform (Standalone)

This repo contains the locked blueprint + governance rules + Supabase SQL for a surplus property sourcing/advisory platform.

**Important:** This project is standalone. Do NOT mix with Ark Engine.

## Purpose
- Buyers submit criteria (directly or via referrers)
- Operator qualifies + matches deals
- Offers sent with exclusivity + urgency
- Buyer-paid success fee is earned only on successful acquisition
- Referrers are paid from the operator success fee based on tier

## Locked Key Facts
- Fee model: Buyer-paid success fee (government/public surplus)
- Success fee: 5% of winning bid, payable only when verified and proceeding to close
- Referral tiers (split from 5% fee): Starter 20%, Proven 25%, Elite 30%
- Exclusive window default: 72 hours
- Reset cap: 3 → downgrade buyer to Track B + reputation penalty
- States include: ON_HOLD, OFFER_VIEWED
- CLOSED_PAID: verified close + funds received
- Operator has final authority via governance rules + audit logs

## Docs
- docs/00_GOVERNANCE_PROTECTION_LAYER.md
- docs/01_DECISIONS_LOCKED.md
- docs/02_BLUEPRINT.md
- docs/03_STATUS_ENUMS.md
- docs/04_MANDATE_TEXT.md

## Environment
Create a `.env.local` file (see `.env.example`) with:
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=
If env vars are missing, the app runs in disabled mode and skips Supabase calls.

## MVP Scaffold (Current)
- Next.js 14 App Router + TypeScript
- Tailwind CSS styling
- Supabase Auth (magic link email)
- Role bootstrap: first login inserts a `profiles` row with `role='buyer'`
- Basic routes (`/`, `/auth`, `/dashboard`) and `/api/health` check

## Local Development
1) Install dependencies: `npm install`
2) Configure `.env.local`
3) Run the dev server: `npm run dev`
4) Visit `http://localhost:3000`

## Vercel Deployment
1) Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars.
2) Add production redirect URL in Supabase: `https://<your-domain>/auth/callback`.
3) Deploy the project from the repo root.

## Supabase Manual Setup
- Enable Email auth (magic link).
- Add redirect URL: `http://localhost:3000/auth/callback`
- Ensure the SQL in `supabase/sql` is applied (schema + RLS + automation).
