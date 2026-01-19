# Deployment Guide - Surplus Referral Platform

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Project Created**: Create a new Supabase project
3. **Database Access**: Ensure you have admin access to your Supabase database

## Deployment Steps

### 1. Environment Setup

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` with your project details:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (found in Project Settings > API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key (found in Project Settings > API)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (found in Project Settings > API > service_role secret)

### 2. Database Migration

Execute the SQL files in the following **strict order** using the Supabase SQL Editor:

#### Step 1: Schema Creation
```sql
-- Run: supabase/sql/001_schema.sql
```
This creates:
- All tables (profiles, referrers, buyers, deals, etc.)
- Indexes for performance
- Database constraints

#### Step 2: Row Level Security (RLS)
```sql
-- Run: supabase/sql/002_rls.sql
```
This sets up:
- Security policies for all tables
- Role-based access control
- Data isolation between users

#### Step 3: Automation & Triggers
```sql
-- Run: supabase/sql/003_automation.sql
```
This creates:
- Trigger functions for deal status changes
- Tier calculation logic
- Automated payout creation
- Cron job for exclusive window expiry (if pg_cron is available)

### 3. Extension Requirements

#### Required Extensions
- **pgcrypto**: Used for UUID generation (usually pre-installed)

#### Optional Extensions
- **pg_cron**: For automated expiry processing
  - **Note**: Only available on Supabase Pro plan and higher
  - **Alternative**: If not available, set up external cron service (see below)

### 4. Cron Job Setup (If pg_cron is not available)

If you're on the Supabase Free tier or pg_cron is not available, you need to set up an external cron service to call the `process_exclusive_expiries()` function every 10 minutes.

#### Option A: Vercel Cron Jobs
Create an API endpoint that calls the function and configure Vercel Cron.

#### Option B: GitHub Actions
```yaml
name: Process Exclusive Expiries
on:
  schedule:
    - cron: '*/10 * * * *'
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/rest/v1/rpc/process_exclusive_expiries' \
            -H "apikey: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

#### Option C: External Cron Service
Use services like:
- cron-job.org
- EasyCron
- AWS EventBridge

### 5. Verification Checklist

After deployment, verify the following:

- [ ] All tables created successfully
- [ ] RLS policies are active (check with `SELECT * FROM pg_policies WHERE schemaname = 'public'`)
- [ ] Triggers are installed (check with `SELECT * FROM pg_trigger WHERE tgisinternal = false`)
- [ ] Extensions are loaded (check with `SELECT * FROM pg_extension`)
- [ ] Cron job scheduled OR external cron configured
- [ ] Test user creation in each role (operator, referrer, buyer)
- [ ] Test deal lifecycle flow

### 6. Post-Deployment Setup

#### Create Initial Operator User
```sql
-- Insert a profile for the operator
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'operator@example.com');

-- Get the user ID
SELECT id FROM auth.users WHERE email = 'operator@example.com';

-- Create operator profile (replace <user-id> with actual ID)
INSERT INTO public.profiles (id, role, email, full_name)
VALUES ('<user-id>', 'operator', 'operator@example.com', 'System Operator');
```

**Important**: You should create the operator user through Supabase Auth UI or your application's signup flow instead of direct SQL for production.

### 7. Security Considerations

- [ ] Never commit `.env` file to version control
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` regularly
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only
- [ ] Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side operations
- [ ] Enable email confirmation in Supabase Auth settings
- [ ] Configure custom SMTP for production emails

### 8. Monitoring

Set up monitoring for:
- Failed cron executions (check `process_exclusive_expiries()` logs)
- Database performance (query execution times)
- RLS policy effectiveness (unauthorized access attempts)
- Audit log growth (archive old logs periodically)

## Rollback Instructions

If you need to rollback the deployment:

### Complete Rollback
```sql
-- Drop all tables (this will delete all data!)
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

-- Unschedule cron job if it exists
SELECT cron.unschedule('process_exclusive_expiries_every_10m');
```

### Partial Rollback (Automation only)
```sql
-- Remove triggers
DROP TRIGGER IF EXISTS deals_audit_status ON public.deals;
DROP TRIGGER IF EXISTS deals_set_exclusive_window ON public.deals;
DROP TRIGGER IF EXISTS offers_mark_viewed ON public.offers;
DROP TRIGGER IF EXISTS deals_closed_paid_awards ON public.deals;

-- Unschedule cron
SELECT cron.unschedule('process_exclusive_expiries_every_10m');
```

## Troubleshooting

### Issue: "extension pg_cron does not exist"
**Solution**: This is expected on Supabase Free tier. Set up external cron service as described in step 4.

### Issue: "permission denied to create extension"
**Solution**: Contact Supabase support or use Supabase's built-in extension management UI.

### Issue: RLS policies blocking access
**Solution**: Verify user role in `public.profiles` table. Ensure authenticated users have proper profile records.

### Issue: Triggers not firing
**Solution**: 
1. Check if triggers exist: `SELECT * FROM pg_trigger WHERE tgname LIKE 'deals%'`
2. Verify trigger functions exist: `SELECT * FROM pg_proc WHERE proname LIKE 'trg_%'`
3. Re-run `003_automation.sql`

## Support

For issues specific to:
- **Supabase Platform**: [Supabase Support](https://supabase.com/support)
- **This Project**: Open an issue in the repository

## Important Notes

- This is a Supabase-only deployment. **Do NOT mix with Ark Engine or other platforms.**
- The platform uses a buyer-paid success fee model (5% of winning bid)
- Referral tiers: Starter 20%, Proven 25%, Elite 30%
- All business rules are locked and enforced at the database level
- See documentation in `docs/` folder for detailed business rules
