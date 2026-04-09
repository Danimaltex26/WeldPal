# WeldPal

AI field companion for welders, fabricators, and Certified Welding Inspectors. Mobile-first PWA.

## Stack
- React 19 + Vite (client) — `client/`
- Express + Anthropic SDK + Supabase (server) — `server/`
- Supabase Postgres + Storage + Auth
- Anthropic Claude (sonnet-4-6) for vision + text
- Mirrors SplicePal architecture; brand new Supabase project

## Setup
1. Create a new Supabase project
2. Run migrations in order (`supabase/migrations/001..008`) via the SQL editor or CLI
3. Copy `.env.example` → `.env` at the repo root and fill in:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY` (can reuse the SplicePal key)
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (same values, prefixed for Vite)
4. Install:
   ```
   npm install
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```
5. Run dev:
   ```
   npm run dev
   ```
   - Server on `http://localhost:3002`
   - Client on `http://localhost:5174`

## Features
- **Weld Photo Analyzer** — vision AI for visual surface defects (POST /api/weld/analyze)
- **Troubleshoot Guide** — structured form → ranked causes + step-by-step fix
- **Reference** — self-growing WPS / code / filler / defect lookup
- **Cert Prep** — AWS CW / CAWI / CWI question bank, AI generates more on demand
- **Profile + History** — processes, certs, past analyses & sessions

## Subscription gating
All gates run server-side in routes (`// SUBSCRIPTION GATE:`). During development the auth middleware hardcodes every user to `pro` — remove the stub line in `server/middleware/auth.js` when billing is wired up.

## TODO (v2)
- NDT checklist module
- Job documentation export (PDF reports)
- Team / inspection-firm features
- Robotic welding (CRAW) cert prep
- RevenueCat / Stripe billing
- App icons (currently placeholders) — drop `icon-192.png` and `icon-512.png` into `client/public/`

## Scope boundary
WeldPal analyzes **visual surface defects only**. It is not a replacement for NDT (UT, RT, MT, PT) by qualified inspectors. This disclaimer is enforced in the system prompt and shown on every weld analysis result.
