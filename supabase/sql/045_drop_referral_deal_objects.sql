-- 045: Drop legacy referral / matching / fee objects.
-- DO NOT auto-apply. Requires backup + dry-run + Yonatan's explicit approval (PR #28 review).
-- Product is an information service only (no broker, matching, or success fees).
-- Never edit applied migrations; this is additive and idempotent where possible.
-- Safe to run on environments that still have the 001 marketplace schema.

-- Views that depend on deals / payouts
drop view if exists public.v_deal_payout_summary cascade;

-- Dependent tables (order matters)
drop table if exists public.payouts cascade;
-- audit_logs intentionally NOT dropped (retention / shared audit data; needs owner decision).
drop table if exists public.messages cascade;
drop table if exists public.offers cascade;
drop table if exists public.deals cascade;
drop table if exists public.buyer_reputation_events cascade;
drop table if exists public.buyers cascade;
drop table if exists public.referral_links cascade;
drop table if exists public.referrer_tier_history cascade;
drop table if exists public.referrers cascade;

-- Fee split helpers
drop function if exists public.calc_referrer_split() cascade;
drop function if exists public.calc_referrer_split(text) cascade;
drop function if exists public.calc_operator_split(int) cascade;

-- Profiles: keep operator; map legacy marketplace roles to member
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    alter table public.profiles drop constraint if exists profiles_role_check;
    update public.profiles
      set role = 'member'
      where role in ('referrer', 'buyer');
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('operator', 'member'));
  end if;
end $$;
