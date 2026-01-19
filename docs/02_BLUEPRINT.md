# Surplus Referral Platform – Blueprint (Locked)

## Level 0 – Foundation
- One public landing page.
- Share referral links to friends/family.
- Anyone can refer a buyer.
- Attribution is single-level: last-touch wins.

## Level 1 – End-to-End Workflow
1) Landing entry (buyer or referrer)
2) Unified form submission
3) Deal record created automatically
4) Operator qualification (Reject / Needs Info / Qualified)
5) Mandate confirmed (buyer agrees fee + verification + urgency rules)
6) Matching
7) Offer sent
8) Offer viewed (tracked)
9) Exclusive window active (72 hours)
10) Buyer commits → bid placed
11) Outcome: won / lost / withdrawn / on hold
12) Won → verification → Closed & Paid triggers fee + payouts

## Level 2 – Core Rules
- Buyer Tracks:
  - Track A: ready/serious
  - Track B: warm/slower
- Exclusive window:
  - 72 hours default
  - reset cap = 3 per deal
  - after cap: downgrade buyer to Track B + reputation penalty
- Success fee model:
  - buyer-paid success fee = 5% of winning bid
  - no win = no fee
- Referral tiers (split from 5%):
  - starter 20%, proven 25%, elite 30%
- Privacy boundaries:
  - referrers only see status list + points/tier
  - no buyer identity to referrers; no referrer identity to buyers
- Governance:
  - operator final authority
  - objective proof required for CLOSED_PAID

## Level 3 – Interfaces (future app)
- Landing
- Unified form
- Operator dashboard
- Buyer portal
- Referrer portal

## Step 3 – Data Model (Supabase/Postgres)
Tables:
- profiles (auth mapping)
- referrers, referrer_tier_history
- referral_links
- buyers, buyer_reputation_events
- deals (source of truth)
- offers
- messages
- audit_logs
- payouts

## Step 4 – SQL
- 001_schema.sql: tables + constraints + indexes
- 002_rls.sql: RLS + policies
- 003_automation.sql: automations
