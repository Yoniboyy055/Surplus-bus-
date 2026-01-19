create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('operator','referrer','buyer')),
  email text unique,
  phone text,
  full_name text,
  created_at timestamptz not null default now()
);
create index if not exists idx_profiles_role on public.profiles(role);

create table if not exists public.referrers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  points_closed_paid int not null default 0 check (points_closed_paid >= 0),
  tier text not null default 'starter' check (tier in ('starter','proven','elite')),
  commission_rate int not null default 20 check (commission_rate in (20,25,30)),
  created_at timestamptz not null default now()
);

create table if not exists public.referrer_tier_history (
  id uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references public.referrers(profile_id) on delete cascade,
  from_tier text,
  to_tier text not null,
  changed_at timestamptz not null default now(),
  reason text
);

create table if not exists public.referral_links (
  id uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references public.referrers(profile_id) on delete cascade,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.buyers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  buyer_type text not null check (buyer_type in ('investor','developer','individual')),
  track text not null default 'B' check (track in ('A','B')),
  reputation_score int not null default 50 check (reputation_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.buyer_reputation_events (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid not null references public.buyers(profile_id) on delete cascade,
  deal_id uuid,
  event_type text not null,
  delta int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null check (status in (
    'NEW_SUBMISSION','NEEDS_CLARIFICATION','REJECTED','QUALIFIED','MANDATE_CONFIRMED','MATCHING',
    'OFFER_SENT','OFFER_VIEWED','EXCLUSIVE_WINDOW_ACTIVE','BUYER_COMMITTED','BID_PLACED',
    'WON_PENDING_CLOSE','CLOSED_PAID','LOST','WITHDRAWN','ON_HOLD'
  )),
  referrer_profile_id uuid not null references public.referrers(profile_id),
  buyer_profile_id uuid not null references public.buyers(profile_id),
  referral_link_id uuid references public.referral_links(id),
  buyer_track_snapshot text not null check (buyer_track_snapshot in ('A','B')),
  confidence text not null default 'medium' check (confidence in ('high','medium','low')),
  exclusive_ends_at timestamptz,
  exclusive_reset_count int not null default 0 check (exclusive_reset_count >= 0),
  on_hold_reason text,
  internal_notes text,

  -- Buyer-paid success fee pool is 5% of winning bid; we store only the split here.
  -- Referral tiers split the 5% pool: 20/25/30. Operator gets remainder.
  referrer_fee_split_percent int not null check (referrer_fee_split_percent in (20,25,30)),
  operator_fee_split_percent int not null check (operator_fee_split_percent in (70,75,80)),

  criteria jsonb not null default '{}'::jsonb,
  mandate_confirmed_at timestamptz,
  mandate_confirmed_by uuid references public.buyers(profile_id),

  won_proof_url text,
  won_confirmed_at timestamptz,
  operator_verified_close_at timestamptz
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  viewed_at timestamptz,
  property_data jsonb not null default '{}'::jsonb
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  sender_role text not null check (sender_role in ('operator','buyer')),
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id),
  actor_role text not null check (actor_role in ('system','operator','buyer','referrer')),
  action text not null,
  from_status text,
  to_status text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  referrer_profile_id uuid not null references public.referrers(profile_id) on delete cascade,
  amount numeric,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_deals_status on public.deals(status);
create index if not exists idx_deals_referrer on public.deals(referrer_profile_id);
create index if not exists idx_deals_buyer on public.deals(buyer_profile_id);
create index if not exists idx_deals_exclusive_ends_at on public.deals(exclusive_ends_at);
