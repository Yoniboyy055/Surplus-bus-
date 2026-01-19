# Quick Start Guide

This guide will help you get the Surplus Referral Platform deployed and running in under 15 minutes.

## Prerequisites Checklist

- [ ] Supabase account created at [supabase.com](https://supabase.com)
- [ ] New Supabase project created
- [ ] Project credentials ready (URL and API keys)

## 5-Minute Deployment

### Step 1: Configure Environment (1 minute)
```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your Supabase credentials
# Get these from: Supabase Dashboard > Settings > API
```

### Step 2: Run Database Migrations (3 minutes)

Open your Supabase Dashboard and navigate to the SQL Editor, then run these files in order:

1. **Copy and run** `supabase/sql/001_schema.sql`
   - ✅ Creates all database tables
   
2. **Copy and run** `supabase/sql/002_rls.sql`
   - ✅ Sets up security policies
   
3. **Copy and run** `supabase/sql/003_automation.sql`
   - ✅ Enables business logic automation

### Step 3: Verify Deployment (1 minute)

Run this in the SQL Editor to verify:

```sql
-- Check tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Expected: 11 tables

-- Check RLS is enabled
SELECT COUNT(*) FROM pg_policies 
WHERE schemaname = 'public';
-- Expected: 15+ policies

-- Check triggers exist
SELECT COUNT(*) FROM pg_trigger 
WHERE tgisinternal = false;
-- Expected: 4+ triggers
```

### Step 4: Handle pg_cron (if needed)

**If you see a notice about pg_cron not being available:**

This is normal on Supabase Free tier. You have two options:

#### Option A: Upgrade to Pro (Recommended for production)
- Upgrade your Supabase project to Pro plan
- Re-run `003_automation.sql` to activate cron

#### Option B: Use External Cron (Free tier workaround)
Set up an external service to call this endpoint every 10 minutes:
```
POST https://[your-project].supabase.co/rest/v1/rpc/process_exclusive_expiries
Headers:
  apikey: [your-service-role-key]
  Authorization: Bearer [your-service-role-key]
```

Popular services:
- GitHub Actions (free for public repos)
- Vercel Cron Jobs
- cron-job.org

## What Just Happened?

You've deployed:
- ✅ Complete database schema with all business logic
- ✅ Row-level security protecting all data
- ✅ Automated triggers for deal workflow
- ✅ Tier progression system for referrers
- ✅ Audit logging for all critical actions

## Next Steps

### 1. Create Your First Operator User
Use Supabase Auth UI to create a user, then add them as operator:

```sql
-- After creating user via Auth UI, get their ID and run:
INSERT INTO public.profiles (id, role, email, full_name)
VALUES 
  ('[user-id-from-auth]', 'operator', 'admin@example.com', 'Admin User');
```

### 2. Test the System
Create test users for each role:
- Operator (admin access)
- Referrer (can create referral links)
- Buyer (can submit deal requests)

### 3. Build Your Frontend
The database is ready. Now build your application using:
- Next.js (recommended)
- Supabase JS Client
- Any framework that works with PostgreSQL

## Architecture Overview

```
┌─────────────────┐
│   Application   │
│  (Your Code)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Supabase      │
│   - Auth        │
│   - Database    │
│   - RLS         │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │
│   - Schema      │
│   - Triggers    │
│   - Automation  │
└─────────────────┘
```

## Key Features Enabled

### For Operators
- Full admin access to all data
- Deal qualification and matching
- Payout verification
- System oversight

### For Referrers
- Track referral performance
- See points and tier status
- View commission rates
- Access referral links

### For Buyers
- Submit deal criteria
- Receive exclusive offers
- 72-hour exclusive windows
- Track-based reputation system

## Business Logic Enforced

The database automatically handles:
- ✅ Tier progression (Starter → Proven → Elite)
- ✅ Commission splits (20% / 25% / 30%)
- ✅ Exclusive window expiry
- ✅ Reputation scoring
- ✅ Audit logging
- ✅ Payout creation on successful deals

## Troubleshooting

### "Permission denied" errors
- Check RLS policies are active
- Verify user has profile in correct role
- Ensure using correct API key (anon vs service_role)

### Tables not created
- Re-run `001_schema.sql`
- Check for error messages in SQL Editor
- Verify pgcrypto extension is enabled

### Triggers not firing
- Confirm all three SQL files ran successfully
- Check `SELECT * FROM pg_trigger` to see active triggers

## Need Help?

- 📖 Full details: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- 📋 Migration info: See [supabase/sql/README.md](./supabase/sql/README.md)
- 🔧 Business rules: See [docs/02_BLUEPRINT.md](./docs/02_BLUEPRINT.md)

## Security Reminders

- 🔒 Never commit `.env` to git
- 🔑 Keep service_role_key secret (server-side only)
- 👤 Use anon_key for client-side code
- 🛡️ RLS policies protect all data access
- 📝 All critical actions are logged in audit_logs

---

**You're all set!** The database is deployed and ready to power your Surplus Referral Platform.
