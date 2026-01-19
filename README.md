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
See .env.example
