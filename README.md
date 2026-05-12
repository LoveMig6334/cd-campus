# CD Smart Campus

A Next.js prototype for the **Chitralada 2026** smart-campus app — a single workspace tying together the school's calendar, room bookings, sport-day live ops, alumni portfolios, peer-led knowledge sharing (**P'share N'sure**), and the **CD Carelin** care line.

The static HTML mockup at `prototype/cd-smart-campus.html` is being progressively migrated into this Next.js 16 + React 19 app. See [`docs/migration-plan.md`](./docs/migration-plan.md) for the phased plan, and [`docs/design-system.md`](./docs/design-system.md) for the visual language.

## Stack

- **Next.js** 16.2.6 — App Router, React Server Components
- **React** 19.2.4
- **TypeScript** 5
- **Tailwind CSS** 4 — CSS-first via `@theme` (no `tailwind.config.js`)
- **ESLint** 9 + `eslint-config-next`

To be added during the migration:

- `react-markdown` ^10 + `remark-gfm` ^4 — P'share post bodies
- `clsx` ^2 + `tailwind-merge` ^3 — class composition

## Two role views

| View | URL | Shape |
| ---- | --- | ----- |
| **Student** | `/student` | Mobile phone mockup with sticky header, 4-tab bottom nav (Home / Calendar / Booking / Sport) |
| **Admin** | `/admin` | Desktop with sticky sidebar (Overview / Calendar / Sport / Bookings / Portfolios / P'share Studio / Carelin Desk) |

Landing at `/` offers a toggle to either view.

## Project layout

```
app/                     # Next.js App Router
  student/               # Student mobile shell + pages
  admin/                 # Admin desktop shell + pages
  layout.tsx             # Root html, fonts, theme
  page.tsx               # Landing / view toggle
  globals.css            # Tailwind import + @theme tokens + halftone utilities
components/              # Layout shells, role widgets, ui primitives
data/                    # Typed mock data (no DB yet)
lib/                     # Helpers (cn, date, fonts)
docs/
  design-system.md       # Color, typography, components, motifs
  migration-plan.md      # Phased plan from prototype HTML → Next.js
  access_design/         # Reference image assets
prototype/
  cd-smart-campus.html   # Source-of-truth visual prototype
public/                  # Static assets (brand mark, og)
```

## Quick start

```bash
npm install
npm run dev
```

Visit <http://localhost:3000> — landing routes to `/student` or `/admin`.

```bash
npm run build      # production build
npm run start      # serve production build
npm run lint       # eslint
```

## Design language

Editorial zine + bilingual Thai/English. Cream paper, blue / yellow / pink accents, hard 1.5px borders, offset shadows with no blur, halftone dot patterns, Instrument Serif italic display + IBM Plex Sans Thai + IBM Plex Mono. Full guide: [`docs/design-system.md`](./docs/design-system.md).

## Conventions

- AI agents: read [`AGENTS.md`](./AGENTS.md) first.
- Default to React Server Components. `'use client'` only at interactive leaves.
- All visible UI strings are bilingual EN/TH wherever possible.
- Mock data lives in `data/`, typed in `data/types.ts`.
- Don't hand-edit `package-lock.json`; use `npm install`.
