-- -----------------------------------------------------------------------------
-- MIGRATION: 011_profile_bootstrap_fix.sql
-- PURPOSE: Fix 'profile_lookup_failed' by ensuring automatic profile creation
--          and hardening RLS for the bootstrap process.
-- -----------------------------------------------------------------------------

-- 1. Create the Profile Bootstrap Function
-- This function will be triggered on every new user signup in auth.users.
-- It uses SECURITY DEFINER and a fixed search_path for security.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'buyer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Create the Trigger
-- This trigger fires AFTER a new user is created in the auth.users table.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Harden RLS for Profiles
-- Ensure that the 'ensureProfile' function in the app can still act as a fallback
-- if the trigger fails for any reason, while maintaining role-spoofing protection.
DROP POLICY IF EXISTS self_insert_profile ON public.profiles;
CREATE POLICY self_insert_profile ON public.profiles 
FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid() 
  AND (
    -- Allow the user to insert themselves as a buyer
    role = 'buyer'
  )
);

-- 4. Ensure existing users have profiles
-- This backfills any users who might have signed up while the trigger was missing.
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'buyer'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. Verify search_path for all critical functions again
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_operator() SET search_path = public;
ALTER FUNCTION public.add_audit_log(uuid, text, text, text, text, jsonb) SET search_path = public;
