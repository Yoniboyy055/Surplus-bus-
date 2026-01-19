# Troubleshooting Guide

Common deployment and runtime issues with solutions.

## Table of Contents
- [Deployment Issues](#deployment-issues)
- [Extension Issues](#extension-issues)
- [Authentication Issues](#authentication-issues)
- [Permission Issues](#permission-issues)
- [Cron Job Issues](#cron-job-issues)
- [Performance Issues](#performance-issues)

---

## Deployment Issues

### Issue: SQL execution fails with "relation already exists"
**Symptom**: Error when running migration files

**Cause**: Tables already exist from previous deployment attempt

**Solution**:
```sql
-- Option 1: Drop specific table
DROP TABLE IF EXISTS table_name CASCADE;

-- Option 2: Complete cleanup (WARNING: deletes all data)
-- See DEPLOYMENT.md rollback section
```

### Issue: Migrations run in wrong order
**Symptom**: Foreign key errors, missing functions in triggers

**Cause**: SQL files executed out of order

**Solution**:
1. Run complete rollback (see DEPLOYMENT.md)
2. Re-run migrations in correct order:
   - 001_schema.sql
   - 002_rls.sql
   - 003_automation.sql

### Issue: "syntax error" in SQL
**Symptom**: SQL parser errors

**Cause**: Copy-paste issues, encoding problems

**Solution**:
- Ensure file encoding is UTF-8
- Re-download SQL files from repository
- Use Supabase SQL Editor (not external tools)
- Check for hidden characters

---

## Extension Issues

### Issue: "extension pg_cron does not exist"
**Symptom**: Error when running 003_automation.sql

**Cause**: pg_cron only available on Supabase Pro plan and higher

**Solution**: This is EXPECTED on Free tier. Two options:

#### Option A: Upgrade to Pro (Recommended)
1. Upgrade Supabase project to Pro plan
2. Re-run 003_automation.sql
3. Verify cron job: `SELECT * FROM cron.job;`

#### Option B: Use External Cron (Free tier workaround)
See DEPLOYMENT.md section "Cron Job Setup" for detailed instructions.

Quick setup with GitHub Actions:
```yaml
# .github/workflows/process-expiries.yml
name: Process Expiries
on:
  schedule:
    - cron: '*/10 * * * *'
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/rest/v1/rpc/process_exclusive_expiries" \
            -H "apikey: ${{ secrets.SERVICE_ROLE_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SERVICE_ROLE_KEY }}"
```

### Issue: "permission denied to create extension"
**Symptom**: Cannot install extensions

**Cause**: Insufficient database privileges

**Solution**:
- Use Supabase dashboard to enable extensions (Database > Extensions)
- Contact Supabase support if issue persists
- For pg_cron: Only available via Pro plan upgrade

---

## Authentication Issues

### Issue: Cannot create users
**Symptom**: User signup fails

**Cause**: Auth settings misconfigured

**Solution**:
1. Check Supabase Auth settings:
   - Authentication > Settings
   - Ensure "Enable signup" is ON
2. Verify email settings if using email confirmation
3. Check for domain restrictions

### Issue: Users created but no profile record
**Symptom**: User exists in auth.users but not in public.profiles

**Cause**: No automatic profile creation trigger

**Solution**: Manually create profile after signup:
```sql
INSERT INTO public.profiles (id, role, email, full_name)
VALUES (
  '[user-id-from-auth]',
  'buyer', -- or 'referrer' or 'operator'
  'user@example.com',
  'User Name'
);
```

Better solution: Create a trigger or use your application to create profile on signup.

### Issue: "JWT expired" errors
**Symptom**: Users logged out unexpectedly

**Cause**: Default session timeout

**Solution**:
- Configure session timeout in Supabase Auth settings
- Implement token refresh in your application
- Default is 1 week - may need adjustment

---

## Permission Issues

### Issue: "permission denied for table"
**Symptom**: Users cannot read/write data

**Cause**: Row Level Security (RLS) blocking access

**Diagnosis**:
```sql
-- Check if user has profile
SELECT * FROM public.profiles WHERE id = auth.uid();

-- Check user's role
SELECT role FROM public.profiles WHERE id = auth.uid();

-- View active policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

**Solution**:
1. Ensure user has profile record in `public.profiles`
2. Verify role is correct (operator/referrer/buyer)
3. For buyers: Ensure profile exists in `public.buyers` table
4. For referrers: Ensure profile exists in `public.referrers` table
5. Re-run 002_rls.sql if policies are missing

### Issue: Operator cannot access data
**Symptom**: User with operator role denied access

**Cause**: Profile role not set correctly

**Solution**:
```sql
-- Verify operator role
SELECT id, role FROM public.profiles WHERE id = auth.uid();

-- Fix if needed
UPDATE public.profiles 
SET role = 'operator' 
WHERE id = '[user-id]';
```

### Issue: Referrer sees buyer personal data
**Symptom**: Privacy boundary violation

**Cause**: RLS policy too permissive

**Solution**: This should NOT happen with correct policies. Investigate:
```sql
-- Check what referrer can see
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'buyers';
```

If policies are wrong, re-run 002_rls.sql immediately.

---

## Cron Job Issues

### Issue: Exclusive windows not expiring
**Symptom**: Deals stuck in EXCLUSIVE_WINDOW_ACTIVE past deadline

**Cause**: Cron job not running or not scheduled

**Diagnosis**:
```sql
-- Check if pg_cron installed
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check if job scheduled (if pg_cron exists)
SELECT * FROM cron.job WHERE jobname = 'process_exclusive_expiries_every_10m';

-- Check job run history (if pg_cron exists)
SELECT * FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'process_exclusive_expiries_every_10m'
)
ORDER BY start_time DESC 
LIMIT 10;
```

**Solution**:

If using pg_cron:
```sql
-- Reschedule job
SELECT cron.unschedule('process_exclusive_expiries_every_10m');

-- Re-run the scheduling block from 003_automation.sql
```

If using external cron:
- Check external service logs
- Verify endpoint URL is correct
- Verify API key is valid
- Test manual execution:
```bash
curl -X POST "https://[project].supabase.co/rest/v1/rpc/process_exclusive_expiries" \
  -H "apikey: [service-role-key]" \
  -H "Authorization: Bearer [service-role-key]"
```

### Issue: Cron job running but not processing deals
**Symptom**: Job executes but deals not updated

**Cause**: Function error or logic issue

**Diagnosis**:
```sql
-- Manual test
SELECT public.process_exclusive_expiries();

-- Check for expired deals
SELECT id, status, exclusive_ends_at
FROM public.deals
WHERE status = 'EXCLUSIVE_WINDOW_ACTIVE'
  AND exclusive_ends_at IS NOT NULL
  AND exclusive_ends_at <= now();
```

**Solution**: Check error logs, may need to re-run 003_automation.sql

---

## Performance Issues

### Issue: Slow queries
**Symptom**: Application sluggish, timeouts

**Diagnosis**:
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solution**:
1. Verify indexes exist:
```sql
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

2. Add missing indexes if needed
3. Run ANALYZE:
```sql
ANALYZE;
```

4. Consider archiving old audit_logs

### Issue: Connection limit reached
**Symptom**: "too many clients" error

**Cause**: Connection pool exhausted

**Solution**:
- Configure connection pooling in your application
- Use Supabase connection pooler
- Review and close idle connections
- Upgrade Supabase plan for more connections

### Issue: Database storage full
**Symptom**: Cannot insert new records

**Cause**: Storage limit reached

**Solution**:
1. Check current usage in Supabase dashboard
2. Archive or delete old data:
```sql
-- Archive old audit logs (older than 90 days)
DELETE FROM public.audit_logs 
WHERE created_at < now() - interval '90 days';
```
3. Upgrade plan if needed

---

## Data Issues

### Issue: Tier not updating after CLOSED_PAID
**Symptom**: Referrer points increase but tier stays same

**Cause**: Trigger not firing or calculation wrong

**Diagnosis**:
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'deals_closed_paid_awards';

-- Test calculation manually
SELECT public.calc_tier(0);  -- should be 'starter'
SELECT public.calc_tier(3);  -- should be 'proven'
SELECT public.calc_tier(7);  -- should be 'elite'

-- Check specific referrer
SELECT points_closed_paid, tier, commission_rate
FROM public.referrers
WHERE profile_id = '[referrer-id]';
```

**Solution**: Re-run 003_automation.sql if trigger or function missing

### Issue: Payouts not created
**Symptom**: Deal reaches CLOSED_PAID but no payout record

**Cause**: Trigger not firing

**Solution**: Same as tier issue above - verify trigger exists and is firing

---

## Getting Help

If issue not listed here:

1. **Check Supabase Logs**: Dashboard > Logs
2. **Run Verification**: Execute `verify_deployment.sql`
3. **Review Documentation**:
   - DEPLOYMENT.md
   - supabase/sql/README.md
   - docs/02_BLUEPRINT.md

4. **Contact Support**:
   - Supabase: https://supabase.com/support
   - Project Issues: GitHub repository

5. **Provide Context**:
   - Error message (exact text)
   - Steps to reproduce
   - Supabase plan (Free/Pro/Team)
   - Which SQL files were run
   - Results of verify_deployment.sql
