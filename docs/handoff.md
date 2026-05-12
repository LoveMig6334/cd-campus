# Handoff to next Claude Code session

Paste the block below into the next session as the first user message. Update the **Phase** field when handing off later phases.

---

You're picking up the **CD Smart Campus** project — a Next.js 16 + React 19 prototype for the Chitralada 2026 smart-campus app. Phases 0 (foundation) and 1 (shells) are merged on `main`. Your job is to execute **Phase 2 — Static page port** of the migration plan.

## Read first, before doing anything

1. `CLAUDE.md` (auto-loaded — imports `AGENTS.md`) — Next 16 / React 19 traps, project conventions, don'ts.
2. `docs/design-system.md` — color tokens, typography, components, halftone patterns, bilingual rules.
3. `docs/migration-plan.md` — full phased plan, route map, library choices, server/client boundary guidance.
4. `prototype/cd-smart-campus.html` — source-of-truth visual prototype. Skim the `<style>` block for tokens; the `<body>` for component patterns.
5. The current `app/` skeleton (`layout.tsx`, `page.tsx`, `globals.css`) and `package.json`.

## Critical: Next.js 16 has breaking changes

Read `node_modules/next/dist/docs/01-app/01-getting-started/` before writing any Next-specific code. Do **not** assume your training-data conventions hold. Quick traps to watch for:

- App Router only — no `pages/`, no `_app.tsx`, no `_document.tsx`, no `getServerSideProps` / `getStaticProps`.
- `fetch()` is **not cached** by default in 16 — wrap with `'use cache'` + `cacheLife()` when you want caching.
- Dynamic route params arrive as `Promise<{...}>` — `await` them.
- Tailwind 4 is **CSS-first** — tokens in `@theme` inside `app/globals.css`. **Do not create `tailwind.config.js`.**
- `next/font/google` self-hosts fonts — no `<link>` tags.

## Already shipped

- **Phase 0 (Foundation)** — libs (`react-markdown`, `remark-gfm`, `clsx`, `tailwind-merge`), `lib/fonts.ts`, `lib/cn.ts`, zine `@theme` palette + halftone utilities in `app/globals.css`, root `app/layout.tsx` with bilingual `lang="th"`, the bilingual landing at `app/page.tsx`, `components/layout/BrandMark.tsx`, `public/brand/profile.png`.
- **Phase 1 (Shells)** — `lib/date.ts` bilingual date formatter, `components/layout/PhoneShell.tsx`, `StudentHeader.tsx`, `StudentBottomNav.tsx` (4 tabs via `usePathname`), `AdminSidebar.tsx` (7 nav items via `usePathname`), `AdminTopbar.tsx`, and a `StubCard.tsx`. `app/student/layout.tsx` and `app/admin/layout.tsx` are wired, and all 14 child routes (`student/{calendar,sport,booking,portfolio,pshare,carelin}` and `admin/{calendar,sport,bookings,portfolio,pshare,carelin}`) plus the role roots exist as stubs returning HTTP 200. Active states verified.

## Your task — Phase 2 (Static page port)

Port one section per PR, preserving prototype markup pattern-by-pattern. Sub-phases:

- **2a** — Student Home (`HeroCard`, `MenuGrid`, `MenuTile`).
- **2b** — Student Calendar + Sport + Booking (read-only).
- **2c** — Student Portfolio + P'share grid + Carelin board (read-only).
- **2d** — Admin Overview + Calendar + Sport.
- **2e** — Admin Bookings + Portfolio + Carelin Desk (read-only table).

Mock data lives in `data/*.ts`, typed via `data/types.ts`. Pages are Server Components and import data directly. Add `data/types.ts` first, then per-entity files as you go.

## Exit criteria for Phase 2

- [ ] All 14 child pages have prototype-faithful markup (no client JS yet; interactivity is Phase 3).
- [ ] All 14 pages are reachable via nav with no hydration warnings.
- [ ] `npm run lint` and `npm run build` both pass.
- [ ] Each sub-phase ships as its own commit / PR — don't batch them.

## Stop after each Phase 2 sub-phase

Let the user review each sub-phase before moving to the next. When you're done with one, summarize what shipped and ask whether to continue.

## Open questions to raise with the user

These are listed in `docs/migration-plan.md` § "Open questions". Surface them when they actually block you, not preemptively:

1. Landing-only view toggle vs persistent toggle in each shell.
2. Profile system: confirm it stays out of the migration (the prototype already removed it).
3. Brand assets `Bg.png` and `Menu.png` — used in the app or shelved?
4. Notification badge "3" — keep static or wire to mock data?

## Conventions (from AGENTS.md)

- Default to React Server Components; `'use client'` only at interactive leaves.
- Bilingual EN/TH everywhere user-visible.
- Class composition via `lib/cn.ts`, not template literals.
- One logical change per commit. No `Co-Authored-By` unless asked.
- Don't add `tailwind.config.js`.

Your first action should be to read the four docs above and the existing shell components in `components/layout/`, then start sub-phase 2a (Student Home).
