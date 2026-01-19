# Surplus Referral Platform (Standalone)

This repo contains the locked blueprint + governance rules + Supabase SQL for a surplus property sourcing/advisory platform.

**Important:** This project is standalone. Do NOT mix with Ark Engine.

## Quick Links

- 🚀 **[Quick Start Guide](QUICKSTART.md)** - Deploy in 5 minutes
- 📖 **[Full Deployment Guide](DEPLOYMENT.md)** - Complete deployment instructions
- 🗄️ **[Database Migrations](supabase/sql/README.md)** - Migration order and verification

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

## Deployment

### Prerequisites
- Supabase account (free tier supported)
- Database admin access

### Quick Deploy
```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 2. Run SQL migrations in order via Supabase SQL Editor:
#    - supabase/sql/001_schema.sql
#    - supabase/sql/002_rls.sql
#    - supabase/sql/003_automation.sql
```

See [QUICKSTART.md](QUICKSTART.md) for step-by-step instructions.

## Documentation

### Business Rules
- docs/00_GOVERNANCE_PROTECTION_LAYER.md - Legal and operational rules
- docs/01_DECISIONS_LOCKED.md - Locked design decisions
- docs/02_BLUEPRINT.md - System architecture blueprint
- docs/03_STATUS_ENUMS.md - Deal status definitions
- docs/04_MANDATE_TEXT.md - Mandate agreement text

### Technical Documentation
- [QUICKSTART.md](QUICKSTART.md) - 5-minute deployment guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment documentation
- [supabase/sql/README.md](supabase/sql/README.md) - Database migration guide

## Database Schema

The platform uses PostgreSQL (via Supabase) with the following core tables:
- `profiles` - User authentication mapping
- `referrers` - Referrer data and tier tracking
- `buyers` - Buyer data and reputation
- `deals` - Core deal workflow and status
- `offers` - Property offers to buyers
- `payouts` - Commission payouts
- `audit_logs` - Complete audit trail

All tables include Row Level Security (RLS) for data protection.

## Key Features

- ✅ Automated tier progression for referrers
- ✅ 72-hour exclusive windows with auto-expiry
- ✅ Reputation-based buyer tracking (Track A/B)
- ✅ Complete audit logging
- ✅ Automated payout creation
- ✅ Role-based security (Operator, Referrer, Buyer)

## Environment

See `.env.example` for required configuration:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Audit logging for all critical actions
- Service role key must remain server-side only
- See [DEPLOYMENT.md](DEPLOYMENT.md) for security checklist

## Support

For deployment issues, see [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section.
