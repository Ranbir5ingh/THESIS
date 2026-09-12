-- THESIS production schema.
-- No demo users or seeded market data are inserted.
-- Each browser receives an anonymous UUID and all user-owned records are scoped to it.

create extension if not exists pgcrypto;

create table if not exists investor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
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
  asset_type text not null default 'Equity',
  created_at timestamptz not null default now()
);

create table if not exists asset_snapshots (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  user_id uuid references investor_profiles(user_id) on delete set null,
  price double precision not null,
  pe double precision,
  market_cap double precision,
  revenue_growth double precision,
  profit_growth double precision,
  debt_to_equity double precision,
  volatility double precision,
  max_drawdown double precision,
  beta double precision,
  risk_score integer,
  hype_score integer,
  quality_score integer,
  personal_fit integer,
  created_at timestamptz not null default now()
);
create index if not exists asset_snapshots_asset_created_idx on asset_snapshots(asset_id, created_at desc);

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references investor_profiles(user_id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, asset_id)
);
create index if not exists watchlists_user_created_idx on watchlists(user_id, created_at desc);

create table if not exists theses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references investor_profiles(user_id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  thesis_text text not null,
  thesis_score integer,
  bias_score integer,
  decision text not null,
  analysis_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists theses_user_created_idx on theses(user_id, created_at desc);
create index if not exists theses_asset_created_idx on theses(asset_id, created_at desc);

create table if not exists simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references investor_profiles(user_id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  investment_amount double precision not null,
  horizon_years integer not null,
  bull_value double precision not null,
  base_value double precision not null,
  bear_value double precision not null,
  behavior_response text,
  created_at timestamptz not null default now()
);
create index if not exists simulations_user_created_idx on simulations(user_id, created_at desc);


-- Provider-response cache. This stores raw Yahoo Finance responses temporarily so
-- repeated pages and API restarts do not repeatedly hit the upstream provider.
create table if not exists market_data_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists market_data_cache_expires_idx on market_data_cache(expires_at);
