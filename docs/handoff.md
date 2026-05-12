# Handoff to next Claude Code session

Paste the block below into the next session as the first user message. Update the **Phase** field when handing off later phases.

---

You're picking up the **CD Smart Campus** project — a Next.js 16 + React 19 + Supabase prototype for the Chitralada 2026 smart-campus app. Phases 0 (foundation), 1 (shells), 2 (static page port — sub-phases 2a–2e), **3a (Supabase auth foundation)**, **3b (Supabase schema)**, and **3c (read swap)** are merged on `main`. Your job is to execute **Phase 3d — Writes** of the Supabase migration.

## Read first, before doing anything

1. `CLAUDE.md` (auto-loaded — imports `AGENTS.md`) — Next 16 / React 19 traps, project conventions, don'ts.
2. `docs/superpowers/specs/2026-05-12-supabase-migration-design.md` — full spec for the Supabase migration. **§3d is your target.** Pay attention to the "Write pattern" and "Phase 3d minimum write set" sections.
3. `docs/migration-plan.md` — original phased plan (Phase 3 entry is superseded by the Supabase spec).
4. `docs/design-system.md` — color tokens, typography, halftone patterns, bilingual rules.
5. `prototype/cd-smart-campus.html` — source-of-truth visual prototype (Carelin form, P'share studio, scoreboard edit, calendar Add Event).
6. The current `lib/queries/*`, `lib/ui/*`, `lib/supabase/*` and `app/` skeleton.

## Critical: Next.js 16 has breaking changes

- App Router only — no `pages/`, no `_app.tsx`, no `_document.tsx`, no `getServerSideProps` / `getStaticProps`.
- `fetch()` is **not cached** by default in 16. Phase 3 deliberately uses no caching.
- Dynamic route params arrive as `Promise<{...}>` — `await` them. Same for `searchParams`.
- Tailwind 4 is **CSS-first** — tokens in `@theme` inside `app/globals.css`. **Do not create `tailwind.config.js`.**
- `next/font/google` self-hosts fonts — no `<link>` tags.
- **`middleware.ts` is deprecated** — use `proxy.ts` with `export async function proxy(...)`. (Already migrated; don't recreate `middleware.ts`.)

## Already shipped

### Phases 0–2 — Static prototype port
14 child routes (7 student + 7 admin) rendering prototype-faithful markup from typed arrays. All Server Components, no client JS for content.

### Phase 3a — Supabase auth foundation
- `@supabase/supabase-js`, `@supabase/ssr`, `server-only` installed.
- `.env.example` documents `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ALLOW_SEED`. Real values live in `.env.local` (gitignored).
- `lib/supabase/server.ts` — RSC + Server Action server client with cookie bridge.
- `lib/supabase/client.ts` — browser client.
- `lib/supabase/serviceRole.ts` — `import "server-only"` service-role client.
- `proxy.ts` (top-level) — refreshes Supabase session every request and gates `/admin/**`; redirects unauthenticated traffic to `/login?next=<path>` (path-traversal safe).
- `app/login/page.tsx` + `app/login/actions.ts` (`signIn`).
- `app/auth/signout/actions.ts` (`signOut`).
- `components/layout/AdminSidebar.tsx` Sign-out form.
- A real Supabase project exists; root admin user was invited via the dashboard.

### Phase 3b — Supabase schema
- `supabase/migrations/0001_init.sql` — 9 enums + 11 tables (admins, houses, events, sport_results, rooms, bookings, projects, pshare_posts, carelin_requests, carelin_replies, site_config), with triggers, indexes, and constraints (e.g. `student_id_4 ~ '^[0-9]{4}$'`, `array_length(placements, 1) = 4`).
- `supabase/migrations/0002_rls.sql` — `current_admin_id()`, `is_admin()`, `is_root_admin()` security-definer helpers + per-table RLS policies. Public reads for content tables; admin writes; anon INSERT only on `carelin_requests`.
- `supabase/seed.sql` — root admin bootstrap row (manual Studio paste).
- `lib/supabase/database.types.ts` — generated via `npm run gen:types`.
- `supabase/seed/index.ts` + per-entity modules — idempotent TS seed gated on `SUPABASE_ALLOW_SEED=1`. Run via `npm run seed`.

### Phase 3c — Read swap
- `data/types.ts` moved to `lib/types.ts`; all 43+ imports rewritten.
- Static UI config split out to `lib/ui/{calendar,booking,pshare,portfolio,carelin,sport,admin}.ts` (chips, tabs, periods, day-grid skeletons, demo room-status overlay, placement colors, sport hero label).
- 10 query helpers in `lib/queries/`: `util`, `houses`, `rooms`, `events`, `sportResults`, `bookings`, `projects`, `pshare`, `carelin`, `siteConfig`. Each is a thin async wrapper around the Supabase server client that returns shapes matching existing TS types.
- All 13 active pages (7 student + 6 admin; `/admin/pshare` remains a stub) swapped to query Supabase via `lib/queries/`. `TrendChart` refactored to take a `data` prop.
- `supabase/seed/data/*.ts` stripped to seed-only exports. `bookings.ts` and `sport.ts` deleted. Zero `@/supabase/seed/data` imports remain in `app/` or `components/`.

### What 3c did NOT do
- No writes. Every form button on the prototype is currently inert.
- No `app/admin/admins/` page yet — root-only admin management UI lands in 3d.
- The Carelin form still has 4 fields in the prototype; **3d adds the 5th nullable `klass` field**. The column already exists in the schema.

## Your task — Phase 3d (Writes)

Per the spec (§3d "Phase 3d minimum write set"):

| # | Action | Page | Auth | Status |
|---|---|---|---|---|
| 1 | `signIn` | `app/login/actions.ts` | anon | ✅ shipped in 3a |
| 2 | `signOut` | `app/auth/signout/actions.ts` | authenticated | ✅ shipped in 3a |
| 3 | `createAdmin` | `app/admin/admins/actions.ts` | root only | new |
| 4 | `disableAdmin` | `app/admin/admins/actions.ts` | root only | new |
| 5 | `postCarelinRequest` | `app/student/carelin/actions.ts` | **anon** (only public write) | new |
| 6 | `replyToCarelin` | `app/admin/carelin/actions.ts` | admin | new |
| 7 | `markAnswered` | `app/admin/carelin/actions.ts` | admin | new |
| 8 | `editScoreboard` | `app/admin/sport/actions.ts` | admin | new |
| 9 | `addEvent` | `app/admin/calendar/actions.ts` | admin | new |
| 10 | `saveDraft` | `app/admin/pshare/actions.ts` | admin | new |
| 11 | `publishPost` | `app/admin/pshare/actions.ts` | admin | new |
| 12 | `deletePost` | `app/admin/pshare/actions.ts` | admin | new |

Plus the supporting UI work:
- **`app/admin/admins/page.tsx`** — root-only list + create form for admins. Service-role client mediates auth user creation (`supabase.auth.admin.createUser`) followed by an INSERT into `admins`.
- **Carelin form** — add the 5th `Class · ชั้น` field. Validation: 4-digit `student_id_4` regex, required name + title + body, optional klass. Use `useActionState` for inline error display (the spec explicitly singles this form out for it).
- **`/admin/pshare` page** — currently a stub. Convert to a real Studio with title/snippet/body/halftone/tags fields backed by `saveDraft` / `publishPost` / `deletePost`.
- **Action contract** — `type ActionResult = { ok: true } | { ok: false; error: string }`. After writes, call `revalidatePath(...)` on the pages whose reads depend on the entity.

### 3d exit criteria (per spec)
- Post a Carelin request anonymously from `/student/carelin` and see it appear on `/admin/carelin` after refresh.
- Reply as admin, mark a request answered — both survive a refresh.
- Edit a scoreboard score from `/admin/sport` and see it on `/student/sport`.
- Add a calendar event from `/admin/calendar` and see it on both calendar grids.
- Publish a P'share post from `/admin/pshare` and see it on `/student/pshare`.
- Sign in as root, create a normal admin, sign out, sign back in as them.
- `npm run lint` and `npm run build` pass at every commit boundary.

### Stop after 3d for review

Phase 3 ends here. When 3d is done, summarize what shipped, list the row counts in Supabase Studio, and ask whether to ship to Vercel or iterate further.

## Open items / risks to flag if relevant

- **Anonymous Carelin INSERT is the entire public-write surface.** The DB has a `check (student_id_4 ~ '^[0-9]{4}$')` constraint as the bottom line; the Server Action additionally validates and rejects malformed input early. No rate limiting in Phase 3 — revisit if spam appears.
- **Service-role key never reaches the browser.** Only `lib/supabase/serviceRole.ts` reads it (`import "server-only"`). Reuse it in `createAdmin` via the same factory.
- **Carelin desk tab counts** in `lib/ui/carelin.ts` are stale (`{ all: 19, open: 7, answered: 12 }` — hardcoded). Phase 3d is a natural moment to either remove them or compute them from a query.
- **`getRecentBookings` hardcodes a `ROOM_TH_BY_EN` map** in `lib/queries/bookings.ts` — fine for now, but a join would be cleaner if you touch that file.
- **Date anchors** (`2026-05-12`) are hardcoded in `getAdminTodayEvents` and `bookings.ts`. Prototype-acceptable.

## Conventions

- Default to React Server Components; `'use client'` only at interactive leaves.
- Bilingual EN/TH everywhere user-visible.
- Class composition via `lib/cn.ts`.
- One logical change per commit. No `Co-Authored-By` unless asked.
- Don't add `tailwind.config.js`.
- Heed deprecation notices (e.g. `middleware.ts` → `proxy.ts`).
- After a write Server Action: `revalidatePath('/affected/route')` then return `{ ok: true }`. No client-side cache invalidation.

## Don't

- Don't drop or recreate `proxy.ts`.
- Don't touch `lib/supabase/*` unless adding `database.types.ts` (regenerated via `npm run gen:types`).
- Don't import `lib/supabase/serviceRole.ts` from anything client-side.
- Don't import from `@/supabase/seed/data/` in `app/` or `components/` — the read swap moved everything to `@/lib/queries/*` and `@/lib/ui/*`.
- Don't add `lucide-react`, `zod`, `react-hook-form`, `swr`, or `@tanstack/react-query` — out of scope.
- Don't enable Supabase Realtime or Storage in 3d — both deferred per spec.
- Don't add `'use cache'` / `cacheLife()` — Phase 3 stays uncached.

## Suggested execution mode

Follow the same pattern as 3a/3b/3c: write a sub-phase plan at `docs/superpowers/plans/<date>-supabase-3d-writes.md` via `superpowers:writing-plans`, then execute via `superpowers:subagent-driven-development`. Per-task commits on `main`.
