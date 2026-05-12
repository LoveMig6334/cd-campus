# CD Smart Campus

A Next.js prototype for the **Chitralada 2026** smart-campus app — a single workspace tying together the school's calendar, room bookings, sport-day live ops, alumni portfolios, peer-led knowledge sharing (**P'share N'sure**), and the **CD Carelin** care line.

The static HTML mockup at `prototype/cd-smart-campus.html` was progressively migrated into this Next.js 16 + React 19 app. **Phase 3 is complete**: Supabase Auth + schema + RLS, all reads, and the minimum-write-set Server Actions (admin management, Carelin requests + replies, scoreboard, calendar events, P'share studio) are live. See [`docs/migration-plan.md`](./docs/migration-plan.md) for the original phased plan, [`docs/superpowers/specs/2026-05-12-supabase-migration-design.md`](./docs/superpowers/specs/2026-05-12-supabase-migration-design.md) for the Supabase migration design, and [`docs/design-system.md`](./docs/design-system.md) for the visual language.

## Stack

- **Next.js** 16.2.6 — App Router, React Server Components, Server Actions
- **React** 19.2.4
- **TypeScript** 5
- **Tailwind CSS** 4 — CSS-first via `@theme` (no `tailwind.config.js`)
- **Supabase** — Postgres + Auth via `@supabase/ssr` + `@supabase/supabase-js`; schema lives in `supabase/migrations/`, idempotent TS seed in `supabase/seed/`
- **ESLint** 9 + `eslint-config-next`
- `react-markdown` + `remark-gfm` — P'share post bodies
- `clsx` + `tailwind-merge` (via `lib/cn.ts`) — class composition

## Two role views

| View        | URL        | Shape                                                                                                             |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| **Student** | `/student` | Mobile phone mockup with sticky header, 4-tab bottom nav (Home / Calendar / Booking / Sport)                      |
| **Admin**   | `/admin`   | Desktop with sticky sidebar (Overview / Calendar / Sport / Bookings / Portfolios / P'share Studio / Carelin Desk) |

Landing at `/` offers a toggle to either view.

## Project layout

```
app/                     # Next.js App Router
  student/               # Student mobile shell + pages
  admin/                 # Admin desktop shell + pages (+ co-located actions.ts files)
  login/                 # Sign-in page + signIn action
  auth/signout/          # signOut action
  layout.tsx             # Root html, fonts, theme
  page.tsx               # Landing / view toggle
  globals.css            # Tailwind import + @theme tokens + halftone utilities
components/              # Layout shells, role widgets, ui primitives
lib/
  cn.ts                  # clsx + tailwind-merge wrapper
  types.ts               # Shared UI/domain types
  auth.ts                # requireAdmin / requireRootAdmin (server-only)
  actions.ts             # Shared ActionResult type
  queries/               # Per-entity Supabase read helpers (RSC consumers)
  ui/                    # Static UI config (chips, tabs, calendar skeletons, …)
  supabase/              # server / browser / service-role clients + generated DB types
supabase/
  migrations/            # 0001_init.sql (tables + enums), 0002_rls.sql (policies + helpers)
  seed/                  # idempotent TS seed (npm run seed)
  seed/data/             # seed-only fixtures — never imported from app/ or components/
proxy.ts                 # Refreshes Supabase session + gates /admin/**
docs/
  design-system.md       # Color, typography, components, motifs
  migration-plan.md      # Original phased plan (Phase 3 superseded by the Supabase spec)
  handoff.md             # Per-phase handoff briefing for the next session
  superpowers/specs/     # Living design specs (Supabase migration design lives here)
  superpowers/plans/     # Implementation plans for each sub-phase
prototype/
  cd-smart-campus.html   # Source-of-truth visual prototype
public/                  # Static assets (brand mark, og)
```

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase keys
npm run dev
```

Visit <http://localhost:3000> — landing routes to `/student` or `/admin`. `/admin/**` requires an admin login; bootstrap the first root admin via the Supabase dashboard + `supabase/seed.sql` (one-time, documented in the migration spec).

```bash
npm run build       # production build
npm run start       # serve production build
npm run lint        # eslint
npm run seed        # idempotent reseed (gated on SUPABASE_ALLOW_SEED=1 in .env.local only)
npm run gen:types   # regenerate lib/supabase/database.types.ts from the linked Supabase project
```

### Env vars

| Variable                        | Where it lives                                                            |
| ------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `.env.local` + Vercel                                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel                                                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | `.env.local` + Vercel (server-only — never `NEXT_PUBLIC_`)                |
| `SUPABASE_ALLOW_SEED`           | `.env.local` only — **never on Vercel** (prevents accidental prod reseed) |

## Design language

Editorial zine + bilingual Thai/English. Cream paper, blue / yellow / pink accents, hard 1.5px borders, offset shadows with no blur, halftone dot patterns, Instrument Serif italic display + IBM Plex Sans Thai + IBM Plex Mono. Full guide: [`docs/design-system.md`](./docs/design-system.md).

## Conventions

- AI agents: read [`AGENTS.md`](./AGENTS.md) first.
- Default to React Server Components. `'use client'` only at interactive leaves.
- All visible UI strings are bilingual EN/TH wherever possible.
- Reads go through `lib/queries/<entity>.ts`; writes are Server Actions co-located with the page (`app/.../actions.ts`).
- Shared types live in `lib/types.ts`. Generated DB types live in `lib/supabase/database.types.ts` (regenerate via `npm run gen:types`).
- Don't hand-edit `package-lock.json`; use `npm install`.
