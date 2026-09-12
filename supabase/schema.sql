-- THESIS Supabase schema
-- Run this once in Supabase SQL Editor. No Docker or local PostgreSQL is required.

create table if not exists investor_profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  goal text not null,
  risk_tolerance text not null,
  time_horizon text not null,
  knowledge_level text not null,
  growth_preference text not null,
  income_preference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  symbol text unique not null,
  exchange text not null,
  name text not null,
  sector text not null,
  asset_type text not null default 'stock',
  created_at timestamptz not null default now()
);

create table if not exists asset_snapshots (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  price double precision not null,
  pe double precision not null,
  market_cap double precision not null,
  revenue_growth double precision not null,
  profit_growth double precision not null,
  debt_to_equity double precision not null,
  volatility double precision not null,
  max_drawdown double precision not null,
  risk_score integer not null,
  hype_score integer not null,
  quality_score integer not null,
  personal_fit integer not null,
  updated_at timestamptz not null default now()
);
create index if not exists asset_snapshots_asset_updated_idx on asset_snapshots(asset_id, updated_at desc);

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  asset_id uuid not null references assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(email, asset_id)
);

create table if not exists theses (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  asset_id uuid not null references assets(id) on delete cascade,
  thesis_text text not null,
  thesis_score integer not null,
  bias_score integer not null,
  decision text not null,
  analysis_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists theses_email_created_idx on theses(email, created_at desc);
create index if not exists theses_asset_created_idx on theses(asset_id, created_at desc);

insert into investor_profiles(email, goal, risk_tolerance, time_horizon, knowledge_level, growth_preference, income_preference)
values ('demo@thesis.local', 'long-term wealth', 'moderate', '5–10 years', 'basics', 'balanced', 'growth')
on conflict (email) do nothing;
