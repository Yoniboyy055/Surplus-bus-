create or replace function public.is_operator()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'operator'
  );
$$;

alter table public.profiles enable row level security;
alter table public.referrers enable row level security;
alter table public.referrer_tier_history enable row level security;
alter table public.referral_links enable row level security;
alter table public.buyers enable row level security;
alter table public.buyer_reputation_events enable row level security;
alter table public.deals enable row level security;
alter table public.offers enable row level security;
alter table public.audit_logs enable row level security;
alter table public.messages enable row level security;
alter table public.payouts enable row level security;

-- Drop existing policies if any
do $$
declare r record;
begin
  for r in (select schemaname, tablename, policyname from pg_policies where schemaname='public') loop
    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
  end loop;
end $$;

-- Operator full access
create policy operator_all_profiles on public.profiles for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_referrers on public.referrers for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_referrer_tier_history on public.referrer_tier_history for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_referral_links on public.referral_links for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_buyers on public.buyers for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_buyer_rep_events on public.buyer_reputation_events for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_deals on public.deals for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_offers on public.offers for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_audit_logs on public.audit_logs for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_messages on public.messages for all to authenticated
using (public.is_operator()) with check (public.is_operator());

create policy operator_all_payouts on public.payouts for all to authenticated
using (public.is_operator()) with check (public.is_operator());

-- Self access basics
create policy self_select_profile on public.profiles for select to authenticated
using (id = auth.uid());

create policy self_update_profile on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy self_insert_profile on public.profiles for insert to authenticated
with check (id = auth.uid() and role = 'buyer');

-- Referrer: see own record only
create policy referrer_select_self on public.referrers for select to authenticated
using (profile_id = auth.uid());

create policy referrer_select_own_links on public.referral_links for select to authenticated
using (referrer_profile_id = auth.uid());

-- Buyer: see own record only
create policy buyer_select_self on public.buyers for select to authenticated
using (profile_id = auth.uid());

-- Deals: buyer sees own; referrer sees own (but UI must show status-only)
create policy deals_buyer_select_own on public.deals for select to authenticated
using (buyer_profile_id = auth.uid());

create policy deals_referrer_select_own on public.deals for select to authenticated
using (referrer_profile_id = auth.uid());

-- Offers: buyer sees offers for their deals
create policy offers_buyer_select on public.offers for select to authenticated
using (
  exists (select 1 from public.deals d where d.id = offers.deal_id and d.buyer_profile_id = auth.uid())
);

-- Messages: buyer reads and writes within their deals
create policy messages_buyer_select on public.messages for select to authenticated
using (
  exists (select 1 from public.deals d where d.id = messages.deal_id and d.buyer_profile_id = auth.uid())
);

create policy messages_buyer_insert on public.messages for insert to authenticated
with check (
  sender_role = 'buyer'
  and sender_profile_id = auth.uid()
  and exists (select 1 from public.deals d where d.id = messages.deal_id and d.buyer_profile_id = auth.uid())
);

-- Audit logs are operator-only (no buyer/referrer select policies)
-- Payouts are operator-only (no buyer/referrer select policies)
-- Buyer reputation events are operator-only
