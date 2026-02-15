create table if not exists public.user_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  timezone text default 'UTC',
  digest_frequency text not null default 'daily' check (digest_frequency in ('realtime','daily','weekly')),
  marketing_opt_in boolean not null default false,
  sms_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  region text,
  min_price numeric,
  max_price numeric,
  channel text not null check (channel in ('email','sms','in_app')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.alert_delivery_events (
  id uuid primary key default gen_random_uuid(),
  alert_rule_id uuid references public.alert_rules(id) on delete set null,
  event_type text not null check (event_type in ('sent','opened','clicked','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','pro')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','canceled')),
  renews_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  use_case text,
  invited_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  source_url text not null,
  status text not null check (status in ('running','success','failure')),
  items_found int not null default 0,
  items_queued int not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ingestion_failures (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ingestion_runs(id) on delete set null,
  error_message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
