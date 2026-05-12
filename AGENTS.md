<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Quick reminders for Next 16 / React 19 (don't trust your training data):

- Default to **Server Components**. Add `'use client'` only at interactive leaves.
- App Router lives in `app/`. There is no `pages/`.
- `getServerSideProps`, `getStaticProps`, `getStaticPaths`, `_app.tsx`, `_document.tsx` are **gone**. Don't suggest them.
- Dynamic route params arrive as `Promise<{...}>` — `await` them. Same for `searchParams`.
- `fetch()` is **not cached by default** in 16. Wrap with `'use cache'` + `cacheLife()` when you want caching. Phase 3 opts out of caching entirely.
- Fonts: `next/font/google` (e.g. `Instrument_Serif`, `IBM_Plex_Sans_Thai`, `IBM_Plex_Mono`). Self-hosted automatically — no `<link>` tags.
- Tailwind 4 is **CSS-first**. Tokens live in `@theme` inside `app/globals.css`; there is no `tailwind.config.js`.
- **`middleware.ts` is deprecated** — use `proxy.ts` with `export async function proxy(...)`. Already migrated. Don't recreate `middleware.ts`.

## Read first

- [`docs/design-system.md`](./docs/design-system.md) — color tokens, typography, components, halftone usage, bilingual rules.
- [`docs/superpowers/specs/2026-05-12-supabase-migration-design.md`](./docs/superpowers/specs/2026-05-12-supabase-migration-design.md) — the Supabase migration design (supersedes the original Phase 3 in `migration-plan.md`).
- [`docs/migration-plan.md`](./docs/migration-plan.md) — original phased plan + route map (Phase 3 entry is superseded; keep for context on Phases 0–2).
- `prototype/cd-smart-campus.html` — single-file source-of-truth visual prototype. When in doubt, match the prototype.

## Routes

- Student: `app/student/...` → mobile phone mockup shell.
- Admin: `app/admin/...` → desktop sidebar shell (gated by `proxy.ts`).
- Auth: `app/login/...` + `app/auth/signout/`.
- Each role group has its own `layout.tsx`. Don't mix them.

## Components

Default to React Server Components. Mark `'use client'` only at interactive leaves (forms, toggles, controlled inputs). Active nav state is derived from `usePathname()` in tiny client wrappers — don't drag whole layouts client-side.

When a server-rendered subtree has to live inside a client component, pass it as `props.children` so it isn't re-bundled.

## Styling

- **Tailwind 4 utilities first.** The zine palette is already defined in `@theme` — use `bg-blue`, `text-yellow`, `font-display italic`, etc.
- **Halftone backgrounds** stay as global utility classes (`.halftone-bk`, `.halftone-bl`, `.halftone-soft`) in `app/globals.css` because they use `radial-gradient()`.
- **Class composition** — use `lib/cn.ts` (clsx + tailwind-merge), not inline string concatenation.

## Bilingual content

Thai and English live side-by-side in the UI. Don't strip one. The pattern is mono-caps English eyebrow + italic display Thai headline (or vice versa). Body copy stays in IBM Plex Sans Thai, which covers both scripts.

## Data layer (post-3c)

- **Types** live in `lib/types.ts`. Shared across pages, components, and seed-data files.
- **Reads** go through thin per-entity helpers in `lib/queries/<entity>.ts` (e.g. `getScoreboard`, `getStudentMonth`, `getAdminTodayBookings`). Pages call them via `await getX()` and become dynamic automatically — the Supabase server client reads `cookies()`, which marks the route dynamic in Next 16.
- **Static UI config** that intentionally lives outside the DB (calendar chips, booking tabs/periods, day-grid skeletons, demo room-status overlay, sport hero label, placement-rank colors) lives in `lib/ui/<topic>.ts`.
- **Seed-only fixtures** live in `supabase/seed/data/` and are consumed only by `supabase/seed/*.ts`. **Don't import them from `app/` or `components/`.**
- **Schema + RLS** in `supabase/migrations/`. Regenerate TS types with `npm run gen:types`; commit the output (`lib/supabase/database.types.ts`).
- **Seed** via `npm run seed` (gated by `SUPABASE_ALLOW_SEED=1` in `.env.local` only — never on Vercel). Idempotent.

## Writes (Phase 3d)

Server Actions are co-located with the page that owns them (`app/.../actions.ts`). Hand-rolled validation — no Zod, no `react-hook-form`. The Carelin request form is the only **public** (anon) write surface, gated by the Postgres `student_id_4 ~ '^[0-9]{4}$'` check constraint and a hand-rolled validator. All other writes require an authenticated admin; root-only writes (creating other admins, deleting rooms) check `is_root_admin()` via the helper SQL function or use the service-role client. See spec §3d for the minimum write set.

## Auth

- `proxy.ts` (top-level — **not** `middleware.ts`) refreshes Supabase session cookies and gates `/admin/**`. Unauthenticated traffic redirects to `/login?next=<path>` (path-traversal safe).
- Service-role client (`lib/supabase/serviceRole.ts`) starts with `import "server-only"` — never reach for it from a client component or pass its return value across a boundary.

## Don't

- Don't use `getServerSideProps` / `getStaticProps` / `_app` / `_document` — gone in App Router.
- Don't reach for state libraries (Redux, Zustand, Jotai) at this scale.
- Don't bundle `markdown-it` / `showdown` / `marked` — `react-markdown` + `remark-gfm` is the choice.
- Don't add `tailwind.config.js` — Tailwind 4 is CSS-first via `@theme`.
- Don't use `<img>` for project assets — use `next/image` with files in `public/`.
- Don't write multi-paragraph JSDoc on components. Names + types do the explaining.
- Don't import from `@/supabase/seed/data/` in `app/` or `components/` — those files only feed the seed script.
- Don't import `lib/supabase/serviceRole.ts` from anything client-side.
- Don't recreate `middleware.ts` — `proxy.ts` is the Next 16 convention.
- Don't add caching in Phase 3 (`'use cache'` / `cacheLife()`). Pages are intentionally dynamic.

## Commits

- Conventional-ish, lowercase ("add", "fix", "update", "refactor").
- One logical change per commit.
- Skip the `Co-Authored-By` trailer unless explicitly asked.
