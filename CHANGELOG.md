# Changelog

## v7 — Yahoo Finance fundamentals reliability fix

- Fixed Yahoo Finance `quoteSummary` authentication using the required session cookie + crumb handshake.
- Fixed a parsing bug where Yahoo values wrapped as `{ raw, fmt }` were flattened to the `raw` leaf and therefore never matched metric names.
- P/E, revenue growth, profit growth, debt/equity, beta and market cap can now populate from Yahoo Finance when the provider exposes them.
- Added automatic crumb/session refresh on Yahoo authorization or invalid-crumb responses.
- Versioned Yahoo cache keys so stale v6 empty/error fundamentals responses cannot mask the corrected provider path.
- Generic fundamentals warning is now shown only when at least one requested fundamental is actually missing.
- Preserved the no-fabrication rule: unavailable fields stay unavailable.

## 2026-09-13 — v6 Yahoo Finance market-data architecture
- Replaced previous credit-based market provider as the required market-data provider with Yahoo Finance.
- Removed the previous credit-based market provider API-key dependency from the default setup.
- Added Yahoo Finance search and daily historical chart ingestion.
- Added best-effort Yahoo Finance fundamentals; missing fields remain null.
- Added NSE/BSE normalization: `.NSE` → `.NS`, `.BSE` → `.BO`.
- Kept layered in-memory + Supabase caching and in-flight request deduplication.
- Removed credit-limit-specific UI and messaging.
- Updated simulation methodology and documentation to identify Yahoo Finance historical data.
- Preserved the no-fake-data rule: unavailable market/fundamental data remains unavailable.

# Changelog

## 2026-09-13 — Real data + UX polish

- Removed seeded/demo market assets and the demo account.
- Replaced email-based demo scoping with anonymous per-browser UUIDs persisted in Supabase.
- Removed fake market fallback values and fake AI thesis fallback responses.
- Live asset pages now fail clearly when the provider does not return enough verified data.
- Removed automatic placeholder simulation results.
- Added a dedicated `/thesis/[symbol]/result` page for AI challenge results.
- Added a full-screen morphing AI reasoning overlay while Gemini is generating a challenge.
- Added desktop sidebar collapse/expand behavior with persistent preference.
- Added a modern slide-in mobile navigation drawer with backdrop and close interaction.
- Refined cards with layered glass surfaces, sheen, depth and motion.
- Dashboard now reflects only the user's real watchlist and saved theses.
- Simulator home now searches the live provider instead of listing seeded assets.
- Investor DNA no longer falls back to a fictional profile.
- Final decision requires a real completed thesis challenge and a real simulation; it never invents a missing simulation.
- Removed the old demo database seed script.


## 2026-09-13 — Market data provider migration

- Replaced previous market-data provider with previous credit-based market provider across search, quote, historical series and fundamentals.
- Added exchange-aware normalization for NSE/BSE symbols.
- Added persistent Supabase/Postgres provider-response caching plus hot in-memory caching.
- Added graceful quote fallback to the latest verified historical close when the quote endpoint is unavailable.
- Removed all previous market-data provider environment variables and documentation.
- Kept Google News RSS as the news source; missing sentiment remains null rather than fabricated.


## 2026-09-13 — v5.1 credit-safe previous credit-based market provider pass

- Removed automatic `/statistics` calls from every asset load; the endpoint currently costs 50 credits per symbol.
- Asset analysis now uses one cached `/time_series` request as its core market-data source.
- Latest verified close and daily change are derived from the same historical series.
- Added provider in-flight request deduplication.
- Added stale Supabase cache fallback when previous credit-based market provider quota is exhausted.
- Asset page now uses one combined `/bundle` request instead of separately requesting analysis, chart, and news.
- Search debounce increased and minimum query length raised to reduce unnecessary symbol-search calls.
- Missing fundamentals remain explicitly unavailable instead of being represented by zero/default data.
