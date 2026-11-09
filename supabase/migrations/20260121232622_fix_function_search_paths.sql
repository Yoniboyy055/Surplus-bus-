-- Migration 017: Set search_path on functions to prevent SQL injection
-- This ensures functions always use the correct schema

ALTER FUNCTION public.calc_operator_split(integer) SET search_path TO 'public';
ALTER FUNCTION public.calc_tier(integer) SET search_path TO 'public';
ALTER FUNCTION public.calc_referrer_split(text) SET search_path TO 'public';
ALTER FUNCTION public.trg_deals_audit_status() SET search_path TO 'public';
ALTER FUNCTION public.trg_deals_set_exclusive_window() SET search_path TO 'public';
ALTER FUNCTION public.trg_offers_mark_viewed() SET search_path TO 'public';
ALTER FUNCTION public.trg_deals_closed_paid_awards() SET search_path TO 'public';
ALTER FUNCTION public.process_exclusive_expiries() SET search_path TO 'public';
