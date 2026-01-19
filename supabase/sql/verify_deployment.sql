-- Deployment Verification Script
-- Run this in Supabase SQL Editor after completing all migrations
-- to verify everything is deployed correctly

-- ============================================================================
-- SECTION 1: Check Tables
-- ============================================================================
DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'audit_logs',
    'buyer_reputation_events', 
    'buyers',
    'deals',
    'messages',
    'offers',
    'payouts',
    'profiles',
    'referral_links',
    'referrer_tier_history',
    'referrers'
  ];
  actual_count INT;
  missing_tables TEXT := '';
  tbl TEXT;
BEGIN
  RAISE NOTICE '=== CHECKING TABLES ===';
  
  SELECT COUNT(*) INTO actual_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
  
  RAISE NOTICE 'Found % tables in public schema', actual_count;
  
  FOREACH tbl IN ARRAY expected_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      missing_tables := missing_tables || tbl || ', ';
    END IF;
  END LOOP;
  
  IF missing_tables = '' THEN
    RAISE NOTICE '✓ All expected tables exist';
  ELSE
    RAISE WARNING '✗ Missing tables: %', missing_tables;
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: Check Extensions
-- ============================================================================
DO $$
DECLARE
  has_pgcrypto BOOLEAN;
  has_pg_cron BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CHECKING EXTENSIONS ===';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) INTO has_pgcrypto;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO has_pg_cron;
  
  IF has_pgcrypto THEN
    RAISE NOTICE '✓ pgcrypto extension installed (REQUIRED)';
  ELSE
    RAISE WARNING '✗ pgcrypto extension NOT installed - THIS IS REQUIRED!';
  END IF;
  
  IF has_pg_cron THEN
    RAISE NOTICE '✓ pg_cron extension installed (OPTIONAL)';
  ELSE
    RAISE NOTICE '⚠ pg_cron extension not installed (optional - only on Pro plan)';
    RAISE NOTICE '  → Set up external cron to call process_exclusive_expiries() every 10 minutes';
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: Check RLS Policies
-- ============================================================================
DO $$
DECLARE
  policy_count INT;
  tables_without_rls TEXT := '';
  tbl TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CHECKING ROW LEVEL SECURITY ===';
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Found % RLS policies', policy_count;
  
  -- Check each table has RLS enabled
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = tbl 
        AND rowsecurity = true
    ) THEN
      tables_without_rls := tables_without_rls || tbl || ', ';
    END IF;
  END LOOP;
  
  IF tables_without_rls = '' THEN
    RAISE NOTICE '✓ RLS enabled on all tables';
  ELSE
    RAISE WARNING '✗ RLS not enabled on: %', tables_without_rls;
  END IF;
  
  IF policy_count >= 15 THEN
    RAISE NOTICE '✓ RLS policies configured';
  ELSE
    RAISE WARNING '✗ Expected at least 15 policies, found %', policy_count;
  END IF;
END $$;

-- ============================================================================
-- SECTION 4: Check Triggers
-- ============================================================================
DO $$
DECLARE
  trigger_count INT;
  expected_triggers TEXT[] := ARRAY[
    'deals_audit_status',
    'deals_set_exclusive_window',
    'offers_mark_viewed',
    'deals_closed_paid_awards'
  ];
  trg TEXT;
  missing_triggers TEXT := '';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CHECKING TRIGGERS ===';
  
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgisinternal = false;
  
  RAISE NOTICE 'Found % triggers', trigger_count;
  
  FOREACH trg IN ARRAY expected_triggers
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = trg
    ) THEN
      missing_triggers := missing_triggers || trg || ', ';
    END IF;
  END LOOP;
  
  IF missing_triggers = '' THEN
    RAISE NOTICE '✓ All expected triggers exist';
  ELSE
    RAISE WARNING '✗ Missing triggers: %', missing_triggers;
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: Check Functions
-- ============================================================================
DO $$
DECLARE
  expected_functions TEXT[] := ARRAY[
    'is_operator',
    'calc_tier',
    'calc_referrer_split',
    'calc_operator_split',
    'add_audit_log',
    'process_exclusive_expiries'
  ];
  func TEXT;
  missing_functions TEXT := '';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CHECKING FUNCTIONS ===';
  
  FOREACH func IN ARRAY expected_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = func AND pronamespace = 'public'::regnamespace
    ) THEN
      missing_functions := missing_functions || func || ', ';
    END IF;
  END LOOP;
  
  IF missing_functions = '' THEN
    RAISE NOTICE '✓ All expected functions exist';
  ELSE
    RAISE WARNING '✗ Missing functions: %', missing_functions;
  END IF;
END $$;

-- ============================================================================
-- SECTION 6: Check Indexes
-- ============================================================================
DO $$
DECLARE
  index_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CHECKING INDEXES ===';
  
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey';
  
  RAISE NOTICE 'Found % custom indexes', index_count;
  
  IF index_count >= 5 THEN
    RAISE NOTICE '✓ Performance indexes configured';
  ELSE
    RAISE WARNING '⚠ Expected at least 5 indexes, found %', index_count;
  END IF;
END $$;

-- ============================================================================
-- SECTION 7: Check Cron Jobs (if pg_cron available)
-- ============================================================================
DO $$
DECLARE
  has_pg_cron BOOLEAN;
  cron_job_exists BOOLEAN := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CHECKING CRON JOBS ===';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO has_pg_cron;
  
  IF has_pg_cron THEN
    SELECT EXISTS (
      SELECT 1 FROM cron.job 
      WHERE jobname = 'process_exclusive_expiries_every_10m'
    ) INTO cron_job_exists;
    
    IF cron_job_exists THEN
      RAISE NOTICE '✓ Cron job scheduled for exclusive expiries';
    ELSE
      RAISE WARNING '✗ Cron job not scheduled - run 003_automation.sql again';
    END IF;
  ELSE
    RAISE NOTICE '⚠ pg_cron not available - using external cron service (OK)';
  END IF;
END $$;

-- ============================================================================
-- SECTION 8: Test Function Calculations
-- ============================================================================
DO $$
DECLARE
  tier_starter TEXT;
  tier_proven TEXT;
  tier_elite TEXT;
  split_starter INT;
  split_proven INT;
  split_elite INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTING BUSINESS LOGIC FUNCTIONS ===';
  
  -- Test tier calculations
  tier_starter := public.calc_tier(0);
  tier_proven := public.calc_tier(3);
  tier_elite := public.calc_tier(7);
  
  IF tier_starter = 'starter' AND tier_proven = 'proven' AND tier_elite = 'elite' THEN
    RAISE NOTICE '✓ Tier calculation working correctly';
  ELSE
    RAISE WARNING '✗ Tier calculation incorrect: starter=%, proven=%, elite=%', 
      tier_starter, tier_proven, tier_elite;
  END IF;
  
  -- Test split calculations
  split_starter := public.calc_referrer_split('starter');
  split_proven := public.calc_referrer_split('proven');
  split_elite := public.calc_referrer_split('elite');
  
  IF split_starter = 20 AND split_proven = 25 AND split_elite = 30 THEN
    RAISE NOTICE '✓ Commission split calculation working correctly';
  ELSE
    RAISE WARNING '✗ Split calculation incorrect: starter=%, proven=%, elite=%',
      split_starter, split_proven, split_elite;
  END IF;
END $$;

-- ============================================================================
-- SECTION 9: Summary
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION COMPLETE ===';
  RAISE NOTICE 'Review the output above for any warnings or errors.';
  RAISE NOTICE '';
  RAISE NOTICE 'Legend:';
  RAISE NOTICE '  ✓ = Success';
  RAISE NOTICE '  ✗ = Error (must fix)';
  RAISE NOTICE '  ⚠ = Warning (may be OK depending on setup)';
  RAISE NOTICE '';
  RAISE NOTICE 'If you see any ✗ errors, re-run the corresponding migration file.';
  RAISE NOTICE 'For ⚠ warnings about pg_cron, see DEPLOYMENT.md for alternatives.';
END $$;
