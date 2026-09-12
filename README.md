# THESIS

**Don't invest because everyone else is. Understand why.**

A polished full-stack investment decision coach for a hackathon: discover assets, understand fundamentals, build an investment thesis, challenge it with Gemini, stress-test the decision and save the reasoning.

## Stack

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS 4
- Motion for React micro-interactions
- Recharts
- NestJS 11
- PostgreSQL on Supabase (no Docker, no local database)
- Native `pg` pool
- Gemini API via `@google/genai`
- Alpha Vantage for global symbol search, quotes, daily history and news/sentiment

## Run

1. Copy `.env.example` to `.env`.
2. Add your Supabase Postgres connection string.
3. Add `GEMINI_API_KEY` for live thesis analysis.
4. Add `ALPHA_VANTAGE_API_KEY` for live global symbol search, quotes, fundamentals, history and news. The app caches provider responses to reduce unnecessary API usage. Without a key, only the clearly-labelled demo assets are available.
5. In Supabase SQL Editor, run `supabase/schema.sql`.
6. Run:

```bash
npm install
npm run dev
```

Web: http://localhost:3000
API: http://localhost:4000/api

## Product loop

Understand → Challenge → Simulate → Decide

The scoring engines are deterministic. Gemini explains/challenges supplied data and is explicitly instructed not to invent financial numbers or produce buy/sell instructions. Live assets never receive fabricated historical charts: if the market-data provider is unavailable, THESIS says so.

## Important

This is an educational product, not financial advice. Rotate any API keys that have been exposed publicly.
