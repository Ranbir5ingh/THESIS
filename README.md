# THESIS

**Don't invest because everyone else is. Understand why.**

THESIS is a full-stack educational investment decision coach. It uses live market data, a real anonymous browser profile, deterministic risk/hype/fit engines and Gemini to help a user move through **Understand → Challenge → Simulate → Decide**.

## What is real

- **Live market data:** Yahoo Finance symbol search and historical market prices, with best-effort fundamentals where Yahoo exposes them. Google News RSS supplies current news because THESIS does not fabricate news or sentiment.
- **News fallback:** Google News RSS is used as the news source; no stories are fabricated and missing sentiment remains unavailable.
- **Investor DNA:** each browser gets a cryptographically random UUID stored locally; the profile is persisted in Supabase.
- **Risk / Hype / Fit:** deterministic calculations use the returned market data. Missing inputs remain missing and are surfaced to the user.
- **AI challenge:** Gemini is required for thesis analysis. There is no deterministic fake AI response fallback.
- **Simulation:** scenarios are generated from the selected asset's verified historical price return, volatility and maximum drawdown. Fundamentals are context only and are never fabricated. Scenarios are explicitly educational, not forecasts.
- **Persistence:** watchlists, theses and simulations are stored in Supabase and scoped to the anonymous browser user.
- **No seeded assets or demo account:** the app starts empty and searches the live provider universe.

## Stack

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS 4
- Motion for React
- Recharts
- NestJS 11
- Supabase PostgreSQL + native `pg`
- Gemini via `@google/genai`
- Yahoo Finance + Google News RSS

## Run

1. Copy `.env.example` to `.env`.
2. Add a Supabase Postgres connection string.
3. Add `GEMINI_API_KEY` and optionally set `GEMINI_MODEL`.
5. Run `npm run db:setup` to apply the schema to Supabase.
6. Run `npm install` and `npm run dev`.

Web: http://localhost:3000  
API: http://localhost:4000/api

## Data provider and caching
Yahoo Finance is the primary market-data provider. THESIS uses its public web data endpoints for symbol search and daily historical prices, with best-effort company fundamentals when Yahoo exposes them. Indian NSE/BSE instruments are normalized to Yahoo Finance symbols such as `RELIANCE.NS` and `RELIANCE.BO`.

The default setup requires **no market-data API key**. This makes the hackathon build independent of a paid credit counter. Yahoo Finance is an unofficial/community-accessed data source and does not provide an SLA for this usage, so THESIS treats it as a best-effort provider rather than claiming exchange-grade real-time data.

THESIS uses layered caching to reduce upstream requests:
- in-memory cache for hot requests
- Supabase/Postgres cache for persistence across API restarts
- historical daily prices cached for 12 hours
- fundamentals cached for 24 hours
- search results cached for 24 hours
- in-flight request deduplication prevents concurrent duplicate upstream calls

If Yahoo Finance is unavailable or does not expose a field, THESIS shows that data as unavailable. The application never substitutes fake prices, fundamentals, charts or scores.

## Product loop

**Understand → Challenge → Simulate → Decide**

Risk combines historical volatility, maximum drawdown, leverage, earnings instability, valuation and market sensitivity. Hype combines price acceleration, news volume, sentiment intensity, abnormal volume and fundamental-vs-price divergence. Personal Fit uses the saved Investor DNA. Gemini receives the verified analysis and profile and is instructed not to invent numbers or issue buy/sell instructions.

## Database

`supabase/schema.sql` is the current schema. If you are upgrading an older THESIS install, review the migration in `supabase/migrations/` and then apply the current schema. The old demo identity and seeded market data are no longer part of the product.

## Important

THESIS is an educational product, not financial advice, and it does not execute trades.


