-- Run this migration if THESIS was previously installed with the old email-based schema.
-- Existing demo rows are intentionally not carried forward.

begin;

drop table if exists simulations;
drop table if exists theses;
drop table if exists watchlists;
drop table if exists asset_snapshots;
drop table if exists assets;
drop table if exists investor_profiles;

commit;

-- Re-run ../schema.sql after this migration.
