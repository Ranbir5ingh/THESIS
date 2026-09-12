# THESIS — AI Investment Decision Coach

**Don't invest because everyone else is. Understand why.**

A hackathon-ready full-stack product for first-time investors. THESIS turns market data into understandable insights, detects hype and behavioral biases, challenges a user's investment thesis, and runs transparent educational scenarios before a decision.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui-style local components
- NestJS 11
- Supabase PostgreSQL
- `pg` connection pooling (no local database, no Docker)
- Gemini API via `@google/genai`
- Alpha Vantage market data with deterministic demo fallback
- Recharts + Motion

The project intentionally does **not** use Docker or a local PostgreSQL server.

## Requirements

- Node.js 22+ for the app stack
- npm 11+
- A Supabase project
- Gemini API key for AI challenge/translation
- Alpha Vantage key for live market data (optional; demo data works without it)

## Setup

1. Copy `.env.example` to `.env`.
2. Put your Supabase **Postgres connection string** in `DATABASE_URL`. Do not paste the Supabase dashboard HTTPS URL there.
3. Run the SQL in `supabase/schema.sql` in Supabase SQL Editor.
4. Install packages:

```bash
npm install
```

5. Start both apps:

```bash
npm run dev
```

Web: `http://localhost:3000`
API: `http://localhost:4000/api`

## Supabase connection

For a persistent NestJS server, Supabase's pooler or a direct TCP connection can be used. The app uses an application-side `pg` pool and prefers the `DATABASE_URL` you provide. Keep `DIRECT_URL` separate for administrative/SQL tooling if desired.

## Demo mode

The UI is designed to remain useful even when external APIs are not configured. The API falls back to deterministic demo data for RELIANCE, TCS, NVIDIA, APPLE and a small set of additional assets. Gemini explanations gracefully fall back to deterministic educational copy if `GEMINI_API_KEY` is missing.

## Architecture

```text
Next.js 16
   │
   │ REST
   ▼
NestJS 11
   ├── Market Service ── Alpha Vantage / demo data
   ├── Analysis Engine ─ deterministic quality/risk/hype/fit scores
   ├── Thesis Service ── Gemini reasoning layer
   ├── Simulation Service ─ transparent scenarios
   └── Data Service ───── Supabase PostgreSQL via pg
```

## Important safety/product boundary

THESIS is an educational decision coach, not a broker or a promise of returns. Simulation outputs are scenarios, not predictions. The LLM is explicitly instructed to use supplied data and avoid inventing quantitative facts.
