# Database Migration Order

This document specifies the exact order in which SQL migration files must be executed.

## Migration Files

The SQL files in this directory must be run in the following order:

### 1. `001_schema.sql` - Database Schema
**Purpose**: Creates all database tables, constraints, and indexes

**Creates**:
- Tables: profiles, referrers, referrer_tier_history, referral_links, buyers, buyer_reputation_events, deals, offers, messages, audit_logs, payouts
- Indexes for optimal query performance
- Foreign key constraints
- Check constraints for data validation

**Dependencies**: None (this is the foundation)

**Required Extensions**:
- `pgcrypto` - for `gen_random_uuid()` function

### 2. `002_rls.sql` - Row Level Security
**Purpose**: Implements security policies and access control

**Creates**:
- RLS helper functions (e.g., `is_operator()`)
- Enables RLS on all tables
- Security policies for operators, referrers, and buyers
- Data isolation rules

**Dependencies**: 
- `001_schema.sql` must be run first
- All tables from schema must exist

### 3. `003_automation.sql` - Triggers & Automation
**Purpose**: Implements business logic automation and scheduled tasks

**Creates**:
- Calculation functions (tier, fee splits)
- Audit logging functions
- Database triggers for:
  - Status change auditing
  - Exclusive window management
  - Offer view tracking
  - Payout creation
  - Tier progression
- Scheduled job for expiry processing (if pg_cron available)

**Dependencies**:
- `001_schema.sql` must be run first (requires tables)
- `002_rls.sql` should be run first (uses `is_operator()` function)

**Optional Extensions**:
- `pg_cron` - for automated expiry processing (Pro plan and higher only)

## Execution Instructions

### Via Supabase Dashboard (Recommended)
1. Go to your Supabase project
2. Navigate to: SQL Editor
3. Copy the contents of `001_schema.sql` and execute
4. Wait for completion
5. Copy the contents of `002_rls.sql` and execute
6. Wait for completion
7. Copy the contents of `003_automation.sql` and execute

### Via Supabase CLI (Local Development)
```bash
# Ensure you're in the project root
cd /path/to/Surplus-bus-

# Run migrations in order
supabase db reset  # This will run all migrations in order

# Or run individually
supabase db execute --file supabase/sql/001_schema.sql
supabase db execute --file supabase/sql/002_rls.sql
supabase db execute --file supabase/sql/003_automation.sql
```

### Via psql (Advanced)
```bash
psql "$DATABASE_URL" -f supabase/sql/001_schema.sql
psql "$DATABASE_URL" -f supabase/sql/002_rls.sql
psql "$DATABASE_URL" -f supabase/sql/003_automation.sql
```

## Verification

After running all migrations, verify the deployment:

### Check Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables: audit_logs, buyer_reputation_events, buyers, deals, messages, offers, payouts, profiles, referral_links, referrer_tier_history, referrers

### Check RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Should show multiple policies for each table.

### Check Triggers
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

Expected triggers: deals_audit_status, deals_set_exclusive_window, deals_closed_paid_awards, offers_mark_viewed

### Check Extensions
```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pgcrypto', 'pg_cron');
```

Expected: pgcrypto (required), pg_cron (optional)

### Check Cron Job (if pg_cron is available)
```sql
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname = 'process_exclusive_expiries_every_10m';
```

If pg_cron is not available, this query will fail - that's expected on Free tier.

## Rollback

To rollback all migrations:

```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS public.payouts CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.buyer_reputation_events CASCADE;
DROP TABLE IF EXISTS public.buyers CASCADE;
DROP TABLE IF EXISTS public.referral_links CASCADE;
DROP TABLE IF EXISTS public.referrer_tier_history CASCADE;
DROP TABLE IF EXISTS public.referrers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Unschedule cron if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('process_exclusive_expiries_every_10m');
  END IF;
END $$;
```

## Notes

- **Never skip migrations** - always run in order
- **Test in development** first before running in production
- **Backup your database** before running migrations in production
- **pg_cron limitation**: Only available on Supabase Pro plan and higher. The automation file handles this gracefully.
- **Idempotent**: Most migrations can be re-run safely (they use `IF NOT EXISTS` checks)
