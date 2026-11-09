-- Migration 012: Fix missing SELECT policy for profiles table
-- This allows authenticated users to read their own profile

DROP POLICY IF EXISTS self_select_profile ON public.profiles;
CREATE POLICY self_select_profile ON public.profiles 
FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS operator_select_all_profiles ON public.profiles;
CREATE POLICY operator_select_all_profiles ON public.profiles 
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'operator'
  )
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
