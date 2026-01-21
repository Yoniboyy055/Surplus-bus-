-- -----------------------------------------------------------------------------
-- MIGRATION: 012_fix_profile_select_policy.sql
-- PURPOSE: Fix 'profile_lookup_failed' by adding missing SELECT policy for profiles table.
--          Users must be able to read their own profile for authentication to work.
-- -----------------------------------------------------------------------------

-- ISSUE: Migrations 010 and 011 created INSERT policies for profiles, but forgot
-- to create a SELECT policy. This prevents authenticated users from reading their
-- own profile, causing ensureProfile() to fail during authentication callback.

-- SOLUTION: Add a SELECT policy that allows authenticated users to read their own profile.

-- 1. Add SELECT policy for profiles table
DROP POLICY IF EXISTS self_select_profile ON public.profiles;
CREATE POLICY self_select_profile ON public.profiles 
FOR SELECT TO authenticated
USING (id = auth.uid());

-- This policy allows any authenticated user to read their own profile row.
-- It does NOT allow reading other users' profiles (unless they're an operator).

-- 2. Add SELECT policy for operators to view all profiles (needed for admin functions)
DROP POLICY IF EXISTS operator_select_all_profiles ON public.profiles;
CREATE POLICY operator_select_all_profiles ON public.profiles 
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'operator'
  )
);

-- This allows operators to view all profiles for deal management and admin tasks.

-- 3. Verify RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Summary of profiles table policies after this migration:
--    - INSERT: self_insert_profile (from 011) - users can insert themselves as buyer
--    - SELECT: self_select_profile (new) - users can read their own profile
--    - SELECT: operator_select_all_profiles (new) - operators can read all profiles
--    - UPDATE: (not defined yet, may need to add if profile editing is required)
