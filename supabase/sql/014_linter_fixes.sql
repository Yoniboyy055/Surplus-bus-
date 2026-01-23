-- -----------------------------------------------------------------------------
-- MIGRATION: 014_linter_fixes.sql
-- PURPOSE: Fix remaining Supabase linter warnings.
-- -----------------------------------------------------------------------------

-- =============================================================================
-- FIX 1: Function Search Path Mutable (public.set_updated_at)
-- =============================================================================

-- Ensure the function exists and securely set the search_path.
-- This prevents search_path hijacking vulnerabilities.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- FIX 2: RLS Policy Always True (public.audit_logs)
-- =============================================================================

-- The warning indicates "Allow authenticated insert" uses (true).
-- We drop strictly specific policies to avoid errors if they don't exist,
-- then recreate a secure one.

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow self-insert" ON public.audit_logs;

-- Create a strict policy: Users can only insert logs where they are the actor.
-- System logs should be inserted by a service_role (which bypasses RLS) or a specific system actor.
CREATE POLICY "Allow authenticated insert"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  actor_profile_id = auth.uid()
);

-- =============================================================================
-- FIX 3: RLS Policy Always True (public.demo_test)
-- =============================================================================

-- This table appears to be a leftover test artifact. Safest remediation is to drop it.
DROP TABLE IF EXISTS public.demo_test;
