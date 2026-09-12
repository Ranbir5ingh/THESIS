-- Persistent market-provider response cache.
-- Payloads are raw Yahoo Finance responses and are never shown directly to users.
create table if not exists market_data_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists market_data_cache_expires_idx
  on market_data_cache(expires_at);

delete from market_data_cache
where expires_at < now();
