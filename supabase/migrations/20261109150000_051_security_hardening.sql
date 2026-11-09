-- =============================================================================
-- 051_security_hardening  (follows live 050 / 20260316025652)
-- Written against the LIVE schema of project nycsuizssbpaqyhxxxup as read on
-- 2026-11-09 (read-only catalog queries). Forward-only, idempotent, no data
-- deleted. Preserves audit_logs, referrals/deals and all source data.
--
-- Fixes (evidence: docs_local/live/BEFORE_exploits.txt, Supabase advisors):
--   A. profiles SELECT policy recursion (every authenticated profiles query
--      fails with 42P17 on live today)
--   B. profiles role/email self-escalation (latent behind A)
--   C. profiles_role_check missing 'member' (role used by the app branch)
--   D. 21 anon/authenticated-executable SECURITY DEFINER functions
--   E. 8 functions with a mutable search_path
--   F. 2 SECURITY DEFINER views readable by anon (+ 2 more definer views)
--   G. RLS-on/no-policy tables: explicit policies where the app reads with a
--      user session; explicit server-only deny elsewhere
--   H. beta_signups consent record columns (CASL)
-- NOT in this file (ordering): beta_signups anon INSERT stays until the branch
-- code (server-side insert) is deployed -> see 054.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. profiles policy recursion
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator');
$$;

DROP POLICY IF EXISTS "Operators can view all profiles" ON public.profiles;
CREATE POLICY "Operators can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_operator());

-- ---------------------------------------------------------------------------
-- B. profiles self-escalation
-- ---------------------------------------------------------------------------
-- Duplicate permissive policies that defeat the role restriction (OR-ed):
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;   -- any role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;   -- no WITH CHECK
-- Kept: self_select_profile, "Users can view own profile", self_update_profile,
--       operator_all_profiles (is_operator()), profile_delete.

DROP POLICY IF EXISTS self_insert_profile ON public.profiles;
CREATE POLICY self_insert_profile ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role IN ('buyer', 'member'));

-- Column privileges: end users may edit only their own name and phone.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;

-- Defence in depth: role cannot be changed/chosen by end-user roles even if a
-- future grant re-opens the column. SECURITY INVOKER so current_user = caller.
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' AND NEW.role NOT IN ('buyer', 'member') THEN
      RAISE EXCEPTION 'profiles.role is managed by the server' USING ERRCODE = '42501';
    ELSIF TG_OP = 'UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.email IS DISTINCT FROM OLD.email OR NEW.id IS DISTINCT FROM OLD.id) THEN
      RAISE EXCEPTION 'profiles.role/email/id are managed by the server' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
CREATE TRIGGER trg_guard_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- C. allow 'member' (additive; legacy buyer/referrer/admin rows untouched)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['buyer', 'operator', 'referrer', 'admin', 'member']));

-- ---------------------------------------------------------------------------
-- D. EXECUTE on public functions: server-only by default.
--    Client inventory (rg .rpc in app/lib/scripts): last_run_per_parser,
--    acquire_parser_lock, release_parser_lock, upsert_source_record_by_urlhash,
--    get_project_fingerprint -- all called with the service-role client.
--    Policies call is_operator(); invoker trigger functions on deals call
--    add_audit_log(uuid,...), is_operator(), calc_referrer_split(text),
--    calc_tier(int) -> those keep EXECUTE for authenticated only.
--    Trigger functions do not need EXECUTE at fire time.
-- ---------------------------------------------------------------------------
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      -- skip extension-owned functions (pgcrypto etc.)
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.is_operator() TO authenticated;
DO $$
BEGIN
  IF to_regprocedure('public.add_audit_log(uuid,text,text,text,text,jsonb)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.add_audit_log(uuid,text,text,text,text,jsonb) TO authenticated;
  END IF;
  IF to_regprocedure('public.calc_referrer_split(text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.calc_referrer_split(text) TO authenticated;
  END IF;
  IF to_regprocedure('public.calc_tier(integer)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.calc_tier(integer) TO authenticated;
  END IF;
END $$;

-- New functions created later by the migration owner are not client-callable
-- unless granted explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- E. pin search_path on functions flagged as mutable (advisor 0011)
--    'extensions' kept for pgcrypto digest() used by promote_intake_*.
-- ---------------------------------------------------------------------------
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname IN ('enforce_snapshot_traceability','promote_intake_to_source_records',
        'guard_terminal_fields','guard_production_source_writes','ingest_gsa_lot_snapshot',
        'block_canonical_from_unqualified_source','upsert_source_record_by_urlhash')
      AND (p.proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', f.sig);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- F. views run with the caller's rights; no anon access
-- ---------------------------------------------------------------------------
DO $$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['latest_lot_snapshots','v_source_recovery_status','source_health','v_deal_payout_summary']
  LOOP
    IF to_regclass('public.' || v) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', v);
    END IF;
  END LOOP;
END $$;
-- v_source_recovery_status / latest_lot_snapshots / source_health: ops-only.
DO $$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['latest_lot_snapshots','v_source_recovery_status']
  LOOP
    IF to_regclass('public.' || v) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', v);
      EXECUTE format('GRANT SELECT ON public.%I TO service_role', v);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- G. RLS-on/no-policy tables
-- ---------------------------------------------------------------------------
-- G1. Read by the app with a user session:
REVOKE INSERT, UPDATE, DELETE ON public.alert_delivery_events FROM anon, authenticated;
REVOKE ALL ON public.alert_delivery_events FROM anon;
DROP POLICY IF EXISTS alert_delivery_events_select_own ON public.alert_delivery_events;
CREATE POLICY alert_delivery_events_select_own ON public.alert_delivery_events
  FOR SELECT TO authenticated
  USING (public.is_operator() OR EXISTS (
    SELECT 1 FROM public.alert_rules r
    WHERE r.id = alert_delivery_events.alert_rule_id AND r.profile_id = auth.uid()));

REVOKE ALL ON public.ingestion_runs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ingestion_runs FROM authenticated;
DROP POLICY IF EXISTS ingestion_runs_operator_read ON public.ingestion_runs;
CREATE POLICY ingestion_runs_operator_read ON public.ingestion_runs
  FOR SELECT TO authenticated USING (public.is_operator());

-- G2. Server-only pipeline tables (service_role bypasses RLS). Make the intent
--     explicit and remove client table grants (defence in depth).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['alert_profiles','asset_identity_nodes','canonical_auctions',
    'canonical_lot_source_records','canonical_lots','ingestion_failures','lot_snapshots',
    'opportunity_intelligence','source_qualification_log','source_recon_log','source_records',
    'source_records_audit','source_run_failures','source_terminal_capabilities','vendor_families']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
      EXECUTE format('DROP POLICY IF EXISTS server_only_no_client_access ON public.%I', t);
      EXECUTE format('CREATE POLICY server_only_no_client_access ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- H. beta_signups consent record (written server-side by the branch route)
-- ---------------------------------------------------------------------------
ALTER TABLE public.beta_signups
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_source text;
ALTER TABLE public.beta_signups DROP CONSTRAINT IF EXISTS beta_signups_consent_record_chk;
ALTER TABLE public.beta_signups ADD CONSTRAINT beta_signups_consent_record_chk
  CHECK (marketing_consent = false OR (consent_text IS NOT NULL AND consent_at IS NOT NULL));
REVOKE UPDATE, DELETE ON public.beta_signups FROM anon, authenticated;

COMMIT;

-- ROLLBACK (manual; only if a regression is found):
--   DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
--   GRANT UPDATE ON public.profiles TO authenticated;
--   GRANT EXECUTE ON FUNCTION <sig> TO anon, authenticated;  -- per function, from docs_local/live/03_functions.txt
--   ALTER VIEW public.<view> RESET (security_invoker);
--   DROP POLICY server_only_no_client_access ON public.<table>;
--   (consent columns and the 'member' role value are additive: leave them)
