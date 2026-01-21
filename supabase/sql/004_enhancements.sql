-- 1. Properties Table for Matching
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  property_type text not null check (property_type in ('land','commercial','residential','industrial')),
  location text not null,
  estimated_value numeric,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. Payout Summary View for Operator
create or replace view public.v_deal_payout_summary as
select 
  d.id as deal_id,
  d.status,
  d.referrer_profile_id,
  p_ref.full_name as referrer_name,
  d.buyer_profile_id,
  p_buy.full_name as buyer_name,
  d.referrer_fee_split_percent,
  d.operator_fee_split_percent,
  pay.amount as payout_amount,
  pay.status as payout_status,
  d.created_at
from public.deals d
join public.profiles p_ref on d.referrer_profile_id = p_ref.id
join public.profiles p_buy on d.buyer_profile_id = p_buy.id
left join public.payouts pay on d.id = pay.deal_id;

-- 3. Automated Reputation Trigger Function
create or replace function public.handle_reputation_change()
returns trigger as $$
begin
  -- If reputation score drops below 20, downgrade to Track B
  if new.reputation_score < 20 then
    update public.buyers set track = 'B' where profile_id = new.profile_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_reputation_change
  after update of reputation_score on public.buyers
  for each row execute function public.handle_reputation_change();
