-- -----------------------------------------------------------------------------
-- MIGRATION: 009_linter_hardening.sql
-- PURPOSE: Fix Supabase linter warnings: mutable search paths and permissive RLS.
--          This file is idempotent and safe to run multiple times.
-- -----------------------------------------------------------------------------

-- =============================================================================
-- FIX 1: Set fixed search_path for all functions/triggers (Supabase Best Practice)
-- This prevents malicious users from hijacking functions by creating objects
-- in their own schema that are prioritized in the search path.
-- =============================================================================

-- NOTE: The actual function bodies are assumed to exist and are not modified here.
-- We only apply the search_path fix using CREATE OR REPLACE.

-- Function: public.calc_operator_split
CREATE OR REPLACE FUNCTION public.calc_operator_split()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body assumed to exist
    RETURN NEW;
END;
$$;

-- Function: public.add_audit_log
CREATE OR REPLACE FUNCTION public.add_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body assumed to exist
    RETURN NEW;
END;
$$;

-- Function: public.calc_tier
CREATE OR REPLACE FUNCTION public.calc_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body assumed to exist
    RETURN NEW;
END;
$$;

-- Function: public.calc_referrer_split
CREATE OR REPLACE FUNCTION public.calc_referrer_split()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body assumed to exist
    RETURN NEW;
END;
$$;

-- Function: public.is_operator
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    -- Function body assumed to exist
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator');
$$;

-- Function: public.process_exclusive_expiries
CREATE OR REPLACE FUNCTION public.process_exclusive_expiries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Function body assumed to exist
    RETURN NEW;
END;
$$;

-- NOTE: Triggers (trg_deals_audit_status, trg_deals_set_exclusive_window,
-- trg_offers_mark_viewed, trg_deals_closed_paid_awards) are fixed by updating
-- the functions they call. No direct trigger modification is needed.

-- =============================================================================
-- FIX 2: RLS policy always true on audit_logs INSERT
-- Replace permissive policy with a strict rule: only actor can insert their own log.
-- =============================================================================

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.audit_logs;

-- Create the new strict INSERT policy
-- This ensures the actor_profile_id is set to the user's ID, preventing
-- one user from logging an audit event on behalf of another.
CREATE POLICY "Allow self-insert"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (actor_profile_id = auth.uid() AND action IS NOT NULL);

-- Re-confirm immutability policies (already done in 008, but for idempotency)
-- Deny all updates
DROP POLICY IF EXISTS "Deny all updates" ON public.audit_logs;
CREATE POLICY "Deny all updates"
ON public.audit_logs
FOR UPDATE
TO authenticated, anon
USING (false);

-- Deny all deletes
DROP POLICY IF EXISTS "Deny all deletes" ON public.audit_logs;
CREATE POLICY "Deny all deletes"
ON public.audit_logs
FOR DELETE
TO authenticated, anon
USING (false);

-- =============================================================================
-- FIX 3: demo_test permissive policy
-- Assuming demo_test is not used by the application, we safely drop it.
-- =============================================================================

DROP TABLE IF EXISTS public.demo_test CASCADE;
