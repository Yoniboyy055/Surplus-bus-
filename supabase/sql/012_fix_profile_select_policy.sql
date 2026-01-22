-- -----------------------------------------------------------------------------
-- MIGRATION: 012_fix_profile_select_policy.sql
-- PURPOSE: Fix 'profile_lookup_failed' / 'profile_init_failed' bugs.
--          Authenticated users MUST be able to SELECT their own profile row.
-- -----------------------------------------------------------------------------

-- 1. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to view their own profile
--    This is critical for ensureProfile() to work (it checks if profile exists)
--    and for middleware/dashboard routing to work.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- 3. Allow operators to view all profiles
--    Required for the Operator Portal to list deals/buyers.
DROP POLICY IF EXISTS "Operators can view all profiles" ON public.profiles;
CREATE POLICY "Operators can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'operator'
  )
);

-- 4. Allow users to insert their own profile (Idempotency check)
--    Likely covered in 011, but ensuring it here guarantees the flow works.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

-- 5. Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (id = auth.uid());
