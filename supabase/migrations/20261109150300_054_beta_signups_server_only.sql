-- =============================================================================
-- 054_beta_signups_server_only  -- APPLY ONLY AFTER the branch is deployed.
-- The deployed main still inserts beta_signups with the anon key; the branch
-- writes server-side (service role) with a consent record. Once the branch is
-- live, close the anon INSERT path so no email can be stored without consent.
-- Rollback: GRANT INSERT ON public.beta_signups TO anon; recreate the policy.
-- =============================================================================
BEGIN;
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'beta_signups' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.beta_signups', p.policyname);
  END LOOP;
END $$;
REVOKE ALL ON public.beta_signups FROM anon, authenticated;
GRANT ALL ON public.beta_signups TO service_role;
COMMIT;
