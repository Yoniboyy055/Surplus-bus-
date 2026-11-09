-- Migration 014: Make is_operator() SECURITY DEFINER to avoid RLS recursion
-- This allows the function to bypass RLS when checking operator status

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'operator'
  );
$$;
