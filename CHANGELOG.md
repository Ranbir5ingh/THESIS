# THESIS — final hardening pass

## Search
- Fixed stale async search responses overwriting newer queries.
- Enter now opens the Explore results view with the searched query.
- Added deterministic autocomplete fallback for common global/Indian companies when the provider is temporarily unavailable.
- Added server-side response caching to reduce Alpha Vantage request pressure.
- Search results now carry provider match score ordering.

## Market data
- Added BSE fallback for Indian symbols where appropriate.
- Added weekly-history fallback when daily history is unavailable.
- Removed fabricated historical charts for live assets. Live assets now show an honest data-unavailable state instead.
- Asset, chart and news requests are isolated so one failed provider request no longer blanks the entire asset page.

## Simulator
- Replaced the generic quiz-like behavior with an asset-specific scenario engine.
- Scenarios use revenue growth, profit growth, P/E, quality and risk for the selected company.
- Behavioral stress test is now tied to the selected company's modeled drawdown.
- Added explicit interpretation and assumptions so users can understand what drives the result.
- Added a real simulator landing page instead of a hard-coded NVIDIA route.

## Beginner UX
- Explore now starts with a question and explains what THESIS does with a searched company.
- Asset pages clearly label live vs demo data.
- Simulation is explained as a decision stress test rather than a prediction tool.
- Missing data produces explicit, useful UI instead of silent failures.


## Currency + news hardening
- Currency is now inferred from exchange/ticker metadata instead of treating every non-USD asset as INR. Indian `.BSE`/`.NSE` symbols are explicitly normalized to INR.
- Asset, Explore, Watchlist and Simulator monetary displays use the asset currency consistently.
- Alpha Vantage news now tries both exchange-qualified and base tickers (for example `CIANAGRO.BSE` and `CIANAGRO`).
- Added a live Google News RSS fallback for companies where Alpha Vantage returns no ticker-specific articles, without inventing news.
- News cards now show source, date and available Alpha Vantage sentiment.
