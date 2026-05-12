# Handoff to next Claude Code session

Paste the block below into the next session as the first user message. Update the **Phase** field when handing off later phases.

---

You're picking up the **CD Smart Campus** project — a Next.js 16 + React 19 + Supabase prototype for the Chitralada 2026 smart-campus app. Phases 0 (foundation), 1 (shells), 2 (static page port — sub-phases 2a–2e), and **3a (Supabase auth foundation)** are merged on `main`. Your job is to execute **Phase 3b — Schema** of the Supabase migration.

## Read first, before doing anything

1. `CLAUDE.md` (auto-loaded — imports `AGENTS.md`) — Next 16 / React 19 traps, project conventions, don'ts.
2. `docs/superpowers/specs/2026-05-12-supabase-migration-design.md` — full spec for the Supabase migration. §3b is your target.
3. `docs/migration-plan.md` — original phased plan (Phase 3 entry is now superseded by the Supabase spec).
4. `docs/design-system.md` — color tokens, typography, halftone patterns, bilingual rules.
5. `prototype/cd-smart-campus.html` — source-of-truth visual prototype.
6. The current `app/` skeleton + `lib/supabase/*` (auth foundation from 3a).

## Critical: Next.js 16 has breaking changes

- App Router only — no `pages/`, no `_app.tsx`, no `_document.tsx`, no `getServerSideProps` / `getStaticProps`.
- `fetch()` is **not cached** by default in 16 — wrap with `'use cache'` + `cacheLife()` when you want caching.
- Dynamic route params arrive as `Promise<{...}>` — `await` them.
- `searchParams` in pages also arrive as `Promise<{...}>` — `await` them too.
- Tailwind 4 is **CSS-first** — tokens in `@theme` inside `app/globals.css`. **Do not create `tailwind.config.js`.**
- `next/font/google` self-hosts fonts — no `<link>` tags.
- **`middleware.ts` is deprecated** — use `proxy.ts` with `export async function proxy(...)` instead. (We already migrated; don't recreate `middleware.ts`.)

## Already shipped

### Phases 0–2 — Static prototype port
14 child routes (7 student + 7 admin) rendering prototype-faithful markup from typed mock arrays in `data/*.ts`. All Server Components, no client JS for content. Phase 2 detail in earlier handoff revisions.

### Phase 3a — Supabase auth foundation (NEW)
- Installed `@supabase/supabase-js`, `@supabase/ssr`, `server-only`.
- `.env.example` documents `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ALLOW_SEED`. Real values live in `.env.local` (gitignored; `.env.example` is whitelisted).
- `lib/supabase/server.ts` — RSC + Server Action client with cookie bridge.
- `lib/supabase/client.ts` — browser client (unused so far; available for future client widgets).
- `lib/supabase/serviceRole.ts` — server-only service-role client. Starts with `import 'server-only'`.
- `proxy.ts` (top-level, NOT `middleware.ts`) — refreshes the Supabase session every request and gates `/admin/**` on a valid session, redirecting unauthenticated traffic to `/login?next=<path>`.
- `app/login/page.tsx` + `app/login/actions.ts` — zine-styled email+password form + `signIn` Server Action with path-traversal-safe `next` redirect.
- `app/auth/signout/actions.ts` — `signOut` Server Action.
- `components/layout/AdminSidebar.tsx` — bottom-of-sidebar Sign-out form.
- A real Supabase project exists; root admin user was invited via the dashboard.

### What 3a did NOT do
- No `admins` table yet — that lands in 3b. Right now **any authenticated Supabase Auth user can reach `/admin`**, not just rows in `admins`. The root/normal tier distinction starts in 3b.
- No data tables. All pages still read from `data/*.ts`.
- No Server Actions for content writes.

## Your task — Phase 3b (Schema)

Per the spec (§3b):
- Author `supabase/migrations/0001_init.sql` — 9 enums + 11 tables (admins, houses, events, sport_results, rooms, bookings, projects, pshare_posts, carelin_requests, carelin_replies, site_config).
- Author `supabase/migrations/0002_rls.sql` — three `security definer` helper functions (`current_admin_id()`, `is_admin()`, `is_root_admin()`) + per-table RLS policies (full table in spec).
- Author `supabase/seed.sql` — single bootstrap row inserting the root admin (you'll paste your `auth.users.id` UUID once).
- Author `supabase/seed/index.ts` — TS script that imports the existing `data/*.ts` arrays via the service-role client and upserts into all tables in dependency order. Idempotent. Gated on `SUPABASE_ALLOW_SEED === '1'`.
- **Move** `data/*.ts` → `supabase/seed/data/*.ts` so the source-of-truth shift is explicit (the app still imports from the new path until 3c swaps reads).
- Update `package.json` with a `seed` script (`tsx supabase/seed/index.ts` or similar — `tsx` may need to be installed).
- `supabase login`, `supabase link --project-ref <ref>`, `supabase db push`, `supabase gen types typescript --linked > lib/supabase/database.types.ts`. Commit the generated types.

### 3b exit criteria (per spec)
- Schema applied to hosted DB (visible in Supabase Studio).
- Generated TS types compile.
- Seed script populates all tables idempotently when run with `SUPABASE_ALLOW_SEED=1`.
- The app still renders identically to Phase 2 (because it still reads from the moved seed-data files, not from the DB yet — that's 3c).

### Stop after 3b for review

The user reviews each sub-phase before the next one. When 3b is done, summarize what shipped and ask whether to continue to 3c.

## Open questions to flag if they come up

- The Carelin form has 4 fields in the prototype but the admin desk view shows a `ม.X/Y` class label. Per spec, we'll add a 5th nullable `klass` field to the form when 3d wires the Server Action. The `carelin_requests` table already includes the column — but the form change isn't until 3d. Don't add the form field in 3b; just include the column.

## Conventions

- Default to React Server Components; `'use client'` only at interactive leaves.
- Bilingual EN/TH everywhere user-visible.
- Class composition via `lib/cn.ts`.
- One logical change per commit. No `Co-Authored-By` unless asked.
- Don't add `tailwind.config.js`.
- Heed deprecation notices (e.g. `middleware.ts` → `proxy.ts`).

## Don't

- Don't drop or recreate `proxy.ts`.
- Don't touch `lib/supabase/*` unless you're adding `database.types.ts` (generated by `supabase gen types`).
- Don't remove the `import 'server-only'` from `serviceRole.ts`.
- Don't add `lucide-react`, `zod`, `react-hook-form`, `swr`, or `@tanstack/react-query` — out of scope.
- Don't enable Supabase Realtime or Storage in 3b — both deferred per spec.
- Don't touch student-facing pages in 3b. Only admin/auth + new `supabase/` directory.

## Suggested execution mode

Follow the same pattern as 3a: write a sub-phase plan at `docs/superpowers/plans/<date>-supabase-3b-schema.md` via `superpowers:writing-plans`, then execute via `superpowers:subagent-driven-development`. Per-task commits on `main`.
