-- -----------------------------------------------------------------------------
-- MIGRATION: 010_supabase_hardening.sql
-- PURPOSE: Comprehensive Supabase layer hardening.
--          - Fixes mutable search_path for all functions.
--          - Tightens RLS policies for all tables.
--          - Enforces financial and audit integrity.
--          - Prevents role spoofing and privilege escalation.
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 1. FUNCTION HARDENING (Fixed search_path & Security Definer)
-- =============================================================================

-- is_operator: Central authority check
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'operator'
  );
$$;

-- calc_tier: Pure logic
CREATE OR REPLACE FUNCTION public.calc_tier(points int)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
IMMUTABLE
AS $$
  SELECT CASE
    WHEN points >= 7 THEN 'elite'
    WHEN points >= 3 THEN 'proven'
    ELSE 'starter'
  END;
$$;

-- calc_referrer_split: Pure logic
CREATE OR REPLACE FUNCTION public.calc_referrer_split(tier text)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
IMMUTABLE
AS $$
  SELECT CASE
    WHEN tier = 'elite' THEN 30
    WHEN tier = 'proven' THEN 25
    ELSE 20
  END;
$$;

-- calc_operator_split: Pure logic
CREATE OR REPLACE FUNCTION public.calc_operator_split(referrer_split int)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
IMMUTABLE
AS $$
  SELECT 100 - referrer_split;
$$;

-- add_audit_log: Audit integrity
CREATE OR REPLACE FUNCTION public.add_audit_log(
  p_deal_id uuid,
  p_actor_role text,
  p_action text,
  p_from_status text,
  p_to_status text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (deal_id, actor_profile_id, actor_role, action, from_status, to_status, metadata)
  VALUES (
    p_deal_id,
    CASE WHEN public.is_operator() THEN auth.uid() ELSE NULL END,
    p_actor_role,
    p_action,
    p_from_status,
    p_to_status,
    p_metadata
  );
END;
$$;

-- handle_reputation_change: Trigger function
CREATE OR REPLACE FUNCTION public.handle_reputation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reputation_score < 20 THEN
    UPDATE public.buyers SET track = 'B' WHERE profile_id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$;

-- process_exclusive_expiries: Cron function
CREATE OR REPLACE FUNCTION public.process_exclusive_expiries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT id, buyer_profile_id, exclusive_reset_count
    FROM public.deals
    WHERE status = 'EXCLUSIVE_WINDOW_ACTIVE'
      AND exclusive_ends_at IS NOT NULL
      AND exclusive_ends_at <= now()
  LOOP
    UPDATE public.deals
    SET status = 'MATCHING',
        exclusive_reset_count = rec.exclusive_reset_count + 1,
        exclusive_ends_at = NULL
    WHERE id = rec.id;

    INSERT INTO public.buyer_reputation_events(buyer_profile_id, deal_id, event_type, delta)
    VALUES (rec.buyer_profile_id, rec.id, 'window_expired', -10);

    UPDATE public.buyers
    SET reputation_score = greatest(0, reputation_score - 10)
    WHERE profile_id = rec.buyer_profile_id;

    IF (rec.exclusive_reset_count + 1) >= 3 THEN
      UPDATE public.buyers SET track = 'B' WHERE profile_id = rec.buyer_profile_id;
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- 2. RLS TIGHTENING (Zero-Trust Policies)
-- =============================================================================

-- Profiles: Prevent role spoofing
DROP POLICY IF EXISTS self_insert_profile ON public.profiles;
CREATE POLICY self_insert_profile ON public.profiles 
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() AND role = 'buyer'); -- Default to buyer, operator must be set manually

-- Deals: Referrer sees own deals but only specific columns (handled by view or API, but RLS must be safe)
DROP POLICY IF EXISTS deals_referrer_select_own ON public.deals;
CREATE POLICY deals_referrer_select_own ON public.deals 
FOR SELECT TO authenticated
USING (referrer_profile_id = auth.uid());

-- Audit Logs: Immutability (Re-enforcing 008/009)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.audit_logs;
CREATE POLICY "Allow authenticated select" ON public.audit_logs
FOR SELECT TO authenticated
USING (public.is_operator() OR actor_profile_id = auth.uid());

-- Payouts: Referrer can see their own payouts
DROP POLICY IF EXISTS referrer_select_own_payouts ON public.payouts;
CREATE POLICY referrer_select_own_payouts ON public.payouts
FOR SELECT TO authenticated
USING (referrer_profile_id = auth.uid());

-- Properties: Authenticated users can view properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.properties;
CREATE POLICY "Allow authenticated select" ON public.properties
FOR SELECT TO authenticated
USING (true);

-- =============================================================================
-- 3. FINANCIAL & DATA INTEGRITY
-- =============================================================================

-- Fee Split Correctness: Must sum to 100%
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS fee_split_sum_check;
ALTER TABLE public.deals ADD CONSTRAINT fee_split_sum_check 
CHECK (referrer_fee_split_percent + operator_fee_split_percent = 100);

-- Terminal State Locking: Prevent changes to closed deals
CREATE OR REPLACE FUNCTION public.trg_lock_terminal_deals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('CLOSED_PAID', 'LOST', 'WITHDRAWN') THEN
    RAISE EXCEPTION 'Cannot modify a deal in a terminal state (%)', OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_terminal_deals ON public.deals;
CREATE TRIGGER lock_terminal_deals 
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.trg_lock_terminal_deals();

-- =============================================================================
-- 4. GOVERNANCE & AUDIT
-- =============================================================================

-- Ensure mandatory audit for status changes (already in trigger, but ensuring function is safe)
-- The trg_deals_audit_status function is already defined in 003.

-- =============================================================================
-- 5. CLEANUP
-- =============================================================================
-- Remove any remaining demo tables if they exist
DROP TABLE IF EXISTS public.demo_test CASCADE;
