create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text,
  source_url text,
  province text not null,
  category text,
  title text not null,
  description text,
  estimated_value numeric,
  closing_date timestamptz,
  buyer_agency text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, external_id)
);

create table if not exists public.opportunity_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  scraped_at timestamptz not null default now(),
  status text,
  value_snapshot numeric
);

create table if not exists public.opportunity_features (
  opportunity_id uuid primary key references public.opportunities(id) on delete cascade,
  demand_score numeric not null default 0,
  value_score numeric not null default 0,
  urgency_score numeric not null default 0,
  base_score numeric not null default 0,
  normalized_score int not null default 0,
  computed_at timestamptz not null default now()
);

alter table public.user_preferences
  add column if not exists provinces text[] default '{}'::text[],
  add column if not exists categories text[] default '{}'::text[],
  add column if not exists min_value numeric,
  add column if not exists max_value numeric,
  add column if not exists urgency_days int default 7;

create index if not exists idx_opportunities_province on public.opportunities(province);
create index if not exists idx_opportunities_category on public.opportunities(category);
create index if not exists idx_opportunities_closing_date on public.opportunities(closing_date);
create index if not exists idx_opportunity_features_score on public.opportunity_features(normalized_score desc);
