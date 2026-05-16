# Money — UK personal finance dashboard

A self-hosted UK personal-finance web app: net-worth dashboard, budget on
clear surplus, recurring-expense tracking, 12-month cash-flow forecast,
mortgage amortisation, and a credit-card balance-transfer optimiser.

All data lives in one local SQLite file (`./data/money.db`). Built as a
Next.js PWA so it installs to an iPhone home screen.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3`
- Recharts (forecast charts)
- papaparse (CSV) + a minimal OFX parser
- vitest unit tests
- Money stored as signed `Int` pence everywhere

## Setup

```bash
cp .env.example .env
npm install
npm run db:migrate     # apply schema
npm run db:seed        # populate with realistic test data
npm run dev            # http://localhost:3000
```

## Scripts

| Script               | Purpose                          |
| -------------------- | -------------------------------- |
| `npm run dev`        | Dev server with Turbopack        |
| `npm run build`      | Production build                 |
| `npm run start`      | Run production build             |
| `npm run lint`       | ESLint                           |
| `npm test`           | Vitest unit tests                |
| `npm run db:migrate` | Apply Prisma migrations          |
| `npm run db:seed`    | Reset and seed dev data          |
| `npm run db:studio`  | Open Prisma Studio               |

## Features (Phase 1 MVP)

- **Dashboard** — net worth, liquid cash, total debt, clear surplus, recent
  transactions, promo-rate-ending alerts.
- **Accounts** — current / savings / credit card / mortgage. Manual entry,
  CSV/OFX import, recalculated cached balances.
- **CSV import** with per-bank profiles for Monzo, Starling, Barclays, HSBC,
  Amex. Dedupe via `(date + amount + description)` hash; re-importing the
  same file is a no-op.
- **OFX import** with FITID-based dedupe.
- **Recurring expenses** — daily / weekly / monthly / annually with day-of-
  month clamping (Feb 30 → Feb 28/29).
- **"Budget on clear"** — cleared spending balance minus all committed
  outflows (recurring + scheduled one-offs + pending) before the horizon.
- **12-month forecast** with per-account projections, aggregated
  total-liquid trajectory, and lowest-balance-day annotation.
- **Credit-card offers** — balance-transfer, purchase, and money-transfer
  types tracked separately. Greedy BT optimiser ranks moves by saved
  interest net of fees. Promo-expiry warnings in <60 days.
- **Mortgage** — amortisation schedule with overpayment what-if.
- **PWA** — manifest + icons so it installs from Safari "Add to Home
  Screen".

## Roadmap

See the full plan at `/root/.claude/plans/new-app-take-information-warm-peacock.md`
for Phase 2-5 work and world-class extensions: assets & liabilities,
goals & sinking funds, UK tax allowances, smart alerts, subscription
tracker, what-if scenarios, rewards/cashback, PDF imports, encrypted
storage at rest, GoCardless Open Banking integration.

## Data model

Single SQLite file. Every `Account` has a `provider` field (`MANUAL | CSV
| OFX | GOCARDLESS`) plus a `providerMeta` JSON blob, so Open Banking via
GoCardless Bank Account Data API can be added later with no schema
change.

## Self-host

Intended to run on the local network only — there is no auth layer. Bind
to `127.0.0.1` or sit behind Tailscale; never expose the unauthenticated
server to the public internet.
