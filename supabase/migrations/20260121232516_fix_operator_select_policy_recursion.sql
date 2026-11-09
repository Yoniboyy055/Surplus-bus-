-- Migration 013: Fix operator SELECT policy to use is_operator() function
-- This avoids recursive table access issues

DROP POLICY IF EXISTS operator_select_all_profiles ON public.profiles;
CREATE POLICY operator_select_all_profiles ON public.profiles 
FOR SELECT TO authenticated
USING (public.is_operator());
