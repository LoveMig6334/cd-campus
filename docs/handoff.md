# Handoff to next Claude Code session

This document is the deep briefing the next session reads after the short hand-off prompt. Phases 0 through 4 are shipped; the active phase is **Phase 5 — Polish + Realtime + Storage** (scope TBD by the user).

---

You're picking up the **CD Smart Campus** project — a Next.js 16 + React 19 + Supabase prototype for the Chitralada 2026 smart-campus app. Phases 0 (foundation), 1 (shells), 2 (static page port — sub-phases 2a–2e), the full Supabase migration (**3a auth foundation, 3b schema, 3c read swap, 3d minimum write set**), and **Phase 4 — full write surface** are merged on `main`. The app is now fully interactive end-to-end: every prototype button either has a wired action or carries an explicit "deferred to Phase 5" comment. Phase 5 scope is open — the candidates the spec already flagged (Realtime, Storage, rate limiting, portfolio create-new, `admin_greeting` cleanup) are listed below.

## Read first, before doing anything

1. `CLAUDE.md` (auto-loaded — imports `AGENTS.md`) — Next 16 / React 19 traps, project conventions, don'ts.
2. `docs/superpowers/specs/2026-05-12-supabase-migration-design.md` — the Supabase migration design. §Write pattern + §RLS policy summary apply verbatim; Phase 4's spec references them.
3. `docs/superpowers/specs/2026-05-12-phase-4-full-writes.md` — Phase 4 design + decisions log. Read for the per-entity write set + RLS implications.
4. `docs/superpowers/plans/2026-05-12-phase-4-full-writes.md` — the just-shipped Phase 4 plan. 10 tasks, per-task commits on `main`.
5. `docs/migration-plan.md` — original phased plan + route map (Phase 3 and the original Phase 4–5 are superseded; read the route map and architecture for context).
6. `docs/design-system.md` — color tokens, typography, halftone patterns, bilingual rules.
7. `prototype/cd-smart-campus.html` — source-of-truth visual prototype. When in doubt, match the prototype.

## Critical: Next.js 16 has breaking changes

- App Router only — no `pages/`, no `_app.tsx`, no `_document.tsx`, no `getServerSideProps` / `getStaticProps`.
- `fetch()` is **not cached** by default in 16. Phase 3 and 4 deliberately stay uncached.
- Dynamic route params arrive as `Promise<{...}>` — `await` them. Same for `searchParams`.
- Tailwind 4 is **CSS-first** — tokens in `@theme` inside `app/globals.css`. **Do not create `tailwind.config.js`.**
- `next/font/google` self-hosts fonts — no `<link>` tags.
- **`middleware.ts` is deprecated** — use `proxy.ts` with `export async function proxy(...)`. (Already migrated; don't recreate.)

## Already shipped (everything you can stand on)

### Phases 0–2 — Static prototype port

14 child routes (7 student + 7 admin) rendering prototype-faithful markup from typed arrays. All Server Components.

### Phase 3a — Supabase auth foundation

- `@supabase/supabase-js`, `@supabase/ssr`, `server-only` installed.
- `.env.example` documents the four env vars.
- `lib/supabase/{server,client,serviceRole}.ts` clients.
- `proxy.ts` (top-level) — refreshes session + gates `/admin/**`. Path-traversal-safe `?next=` redirect.
- `app/login/{page,actions}.tsx`, `app/auth/signout/actions.ts`.
- Real Supabase project + root admin invited via dashboard.

### Phase 3b — Supabase schema

- `supabase/migrations/0001_init.sql` (9 enums + 11 tables) + `0002_rls.sql` (helper functions + per-table policies).
- `supabase/seed.sql` — root admin bootstrap.
- `lib/supabase/database.types.ts` — generated (`npm run gen:types`).
- `supabase/seed/*.ts` — idempotent TS seed (`npm run seed`, gated on `SUPABASE_ALLOW_SEED=1`).

### Phase 3c — Read swap

- `data/*.ts` moved to `supabase/seed/data/*.ts`; shared types in `lib/types.ts`.
- Static UI config in `lib/ui/{calendar,booking,pshare,portfolio,carelin,sport,admin}.ts`.
- 10 query helpers in `lib/queries/`.
- All 13 active pages swapped to Supabase queries.

### Phase 3d — Minimum write set

- `lib/auth.ts` — `requireAdmin()` / `requireRootAdmin()` server helpers (throw on failure).
- `lib/actions.ts` — shared `ActionResult` type.
- New routes: `/admin/admins`, `/admin/calendar/new`, `/admin/carelin/[id]`, `/admin/pshare/new`, `/admin/pshare/[id]/edit`, `/admin/sport/edit`, `/student/carelin/new`.
- New Server Actions: `createAdmin`, `disableAdmin` (root + service-role), `postCarelinRequest` (the only public anon-write — uses `useActionState`), `replyToCarelin`, `markAnswered`, `editScoreboard`, `addEvent`, `saveDraft`, `publishPost`, `deletePost`.
- Dynamic Carelin desk tab counts (replaced the hard-coded 19/7/12 array).
- `AdminSidebar` gained an `extraItems` prop; `app/admin/layout.tsx` is now async and fetches the admin to gate the root-only "Admins" sidebar entry.

### Phase 4 — Full write surface

13 commits on `main` (9 task + 4 review-fix). Every remaining inert prototype button now has a wired Server Action; only `+ Add Project` on `/admin/portfolio` stays deferred (needs student submission flow design).

- **Migration:** `supabase/migrations/0003_phase4_anon_bookings.sql` — adds anon INSERT policy to `bookings` plus `student_id_4` (DB-checked `^[0-9]{4}$` regex) and `klass` columns. `lib/supabase/database.types.ts` regenerated. Carelin and bookings are now the only anon-write surfaces.
- **New routes:** `/student/pshare/[slug]` (markdown reader), `/admin/calendar/[id]/edit`, `/admin/sport/result/new`, `/admin/sport/result/[id]/edit`, `/admin/portfolio/[id]/edit`, `/admin/config`, `/admin/config/[key]/edit`, `/admin/bookings/new`, `/admin/bookings/[id]/edit`.
- **New Server Actions:** `deleteCarelinRequest` (root, service-role); `updateEvent`, `deleteEvent`; `recordSportResult`, `updateSportResult`, `deleteSportResult`; `setProjectStatus`, `updateProject`, `deleteProject`; `updateSiteConfig` (single key-dispatched action covering 6 keys); `createBooking`, `updateBooking`, `cancelBooking` (admin, hard DELETE); `bookRoom` (anon, the second `useActionState`-backed action).
- **Service-role usage** now spans 3 functions: `createAdmin`, `disableAdmin`, `deleteCarelinRequest`. All gated by `requireRootAdmin()`.
- **New components:** `AdminCalendarEventList` (RSC side-rail), `PshareReader` (`'use client'` markdown leaf), `BookingConfirmForm` (`'use client'` `useActionState` leaf with module-level `INITIAL` sentinel + `router.replace('?ok=1')` on success).
- **New queries:** `getPsharePostBySlug`, `getAdminMonthEventList`, `getEventById`, `getSportResultById`, `getProjectById`, `getBookingById`, `findConflictingBooking` (used by all three booking actions for server-side conflict pre-check), `getMeetingRooms`, `getConfigByKey<T>`.
- **`lib/ui/booking.ts` gained `PERIOD_HOURS` map** (morning/midday/evening with `+07:00`-anchored start/end times) + `PeriodId` type. Shared by `bookRoom`, `createBooking`, `updateBooking`, and the student booking page's URL state.
- **Selection state on `/student/booking`** moved entirely to URL params (`?date=...&period=...&room=...&tab=...`). Pickers render as `<Link>` decorations; no whole-page client wrapper. `BookingConfirmForm` is the only client leaf.
- **Type extensions in `lib/types.ts`:** `id: string` added to `Room`, `AdminTodayBookingRow`, `PortfolioAdminRow`; `id?: string` added to `SportResultRow`. Optional `href?: string` added to `CalendarDay`, `BookingTab`, `BookingPeriod`, `Room`. Optional `selected?: boolean` on `Room`. `BookingPeriod.id?` for the period URL state. New row-shape aliases: `BookingFull`, `ProjectFull`, `SportResultRowFull`, `PsharePostFull`, `AdminCalendarRow`.
- **Seed-fixture knock-ons:** `supabase/seed/data/admin-portfolio.ts` introduces a local `PortfolioSeedRow = Omit<PortfolioAdminRow, "id">`. `supabase/seed/data/admin-bookings.ts` adds stub `id: "seed-N"` values. Both type-only; live INSERTs let the DB generate UUIDs.
- **Calendar UX:** click-event-chip-on-BigCal was _rejected_ in brainstorming. BigCal cells stay non-interactive; a server-rendered side rail right of the grid (`AdminCalendarEventList`) lists this month's events with per-row Edit / Delete.
- **Site_config editor topology:** structured forms per key — six routes under `/admin/config/[key]/edit`. `admin_greeting` is hidden (computed from `admins.display_name`). `trend_chart` editor takes 13 point pairs; server derives the SVG path string at write time.

## Your task — Phase 5 (Polish + Realtime + Storage)

Phase 4 is shipped. Phase 5 scope is **open** — the user should pick which of the candidates below to bundle. Brainstorm with the user before writing any code. Candidates surfaced by the Phase 4 spec, plan, and review findings:

### Phase 5 candidates (pick a subset; not all are required)

| #   | Candidate                                    | Surface area                                                                                        | Notes                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Supabase Realtime**                        | sport scoreboard, Carelin desk, admin bookings Gantt                                                | The most visible "live" affordance. Wire `supabase.channel().on('postgres_changes', ...)` in a `'use client'` leaf per affected page. Will require lifting some RSC reads to props.                                                                                                                                      |
| 2   | **Supabase Storage**                         | P'share post art, profile photos, project thumbs                                                    | Add an `art_image_path` column to `pshare_posts` (or `projects`); upload via the admin editor; `getPublicUrl()` in the reader. RLS on the storage bucket + admin-only writes.                                                                                                                                            |
| 3   | **Rate limiting on anon writes**             | `bookRoom`, `postCarelinRequest`                                                                    | Two anon-write surfaces, no throttling today. Simplest path: IP-based bucket in `proxy.ts` keyed by `request.ip`. Or Supabase Edge Function with a Redis upstash.                                                                                                                                                        |
| 4   | **`admin_greeting` site_config cleanup**     | `lib/queries/siteConfig.ts`, seed                                                                   | Dead-code-ish: still queried via `getAdminGreeting`, but the live greeting is derived from `admins.display_name`. Drop the row + helper.                                                                                                                                                                                 |
| 5   | **Portfolio create-new flow**                | new route + action                                                                                  | The only intentionally-deferred button in the app. Open question: student submission (anon, like Carelin) or admin-typed proxy form? Decide first; then ship.                                                                                                                                                            |
| 6   | **`Btn type="button"` backfill on 3d forms** | `app/admin/calendar/new/page.tsx`, `app/admin/admins/page.tsx`, `components/admin/PshareEditor.tsx` | `Btn` defaults to `type="button"` — its `{...rest}` spread allows `type="submit"` override. 3d's Save buttons don't pass `type="submit"`, so clicking Save is functionally inert (Enter-in-input still submits). Phase 4 forms fixed this; 3d forms may need the same. Confirm with manual test on each before shipping. |
| 7   | **Pshare tags + Portfolio tags editing**     | `/admin/portfolio/[id]/edit`, `/admin/pshare/[id]/edit`                                             | Portfolio tags (`PortfolioTagPill[]` JSONB of `{label, background, textColor?}`) are deliberately untouched by `updateProject` — Phase 4 preserves them. P'share tags are flat `text[]` and ARE edited via the comma-separated input in the existing editor. Phase 5 should add a structured tag editor for portfolio.   |
| 8   | **Anon `bookings` policy hardening**         | `supabase/migrations/0004_*.sql`                                                                    | The Task 3 `bookings_anon_insert` policy doesn't constrain `created_by_admin_id` — an anon client could theoretically pass a value. Hardening: add `and created_by_admin_id is null` to the policy's WITH CHECK. Theoretical for prototype; small migration.                                                             |
| 9   | **Conflict pre-check race window**           | `findConflictingBooking`                                                                            | Server-side SELECT-then-INSERT has a race window. For high-confidence multi-tenant load, add a Postgres `EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&)` constraint. Needs `btree_gist` extension; another migration. Likely unnecessary for prototype.                                      |
| 10  | **Unify anon success UX paradigm**           | `postCarelinRequest` vs `bookRoom`                                                                  | The two anon `useActionState` actions diverge: `postCarelinRequest` uses `redirect()` after the INSERT; `bookRoom` returns `{ok:true}` and the client form `router.replace('?ok=1')`. Two paradigms is a footgun. Pick one — most likely `redirect()` is simpler.                                                        |
| 11  | **Dead exports in `lib/ui/booking.ts`**      | `BOOKING_ACTIVE_TAB`, `BOOKING_CONFIRM_EYEBROW`                                                     | Both unused after Phase 4 (URL-derived now). Remove.                                                                                                                                                                                                                                                                     |
| 12  | **Constants consolidation**                  | `lib/ui/sport.ts`, `lib/ui/portfolio.ts`, new `lib/ui/siteConfig.ts`                                | A handful of constants are inline-duplicated across pages: `HOUSES` (sport new + edit), `STATUS_OPTIONS`/`STATUS_LABEL` (portfolio table + edit), `KEYS`/`EDITABLE_KEYS`/`VALID` (config index + edit + action). Consolidating to `lib/ui/<topic>.ts` is a small cleanup task.                                           |
| 13  | **A11y + responsive polish**                 | broad                                                                                               | Bilingual content, decorative bg-blue contrast against text-yellow on the mobile shell, focus rings on row controls. The "Delete" buttons across admin tables are bare red text with no visible focus ring.                                                                                                              |
| 14  | **Seed cleanup**                             | `supabase/seed/data/admin-portfolio.ts`, `admin-bookings.ts`                                        | The `PortfolioSeedRow = Omit<...>` alias and stub `id: "seed-N"` strings are type-only workarounds added in Phase 4. Cleaner long-term: drop the `id` requirement from the seed-side types or delete the dead arrays.                                                                                                    |

### Suggested execution mode

The Phase 4 cadence still applies. Same skills, same per-task commits on `main`.

1. `superpowers:brainstorming` — pin down which Phase 5 candidates to bundle and in what order.
2. Write the spec at `docs/superpowers/specs/<date>-phase-5-<focus>.md`.
3. `superpowers:writing-plans` → save to `docs/superpowers/plans/<date>-phase-5-<focus>.md`.
4. `superpowers:subagent-driven-development` to execute. Per-task commits on `main`.

### Before-Phase-5: optional manual sign-off walkthrough

If not yet done, run the Phase 4 exit-criteria walkthrough end-to-end:

1. Post a Carelin request anonymously → reply as admin → mark answered.
2. Post a booking anonymously (Music Room 2, 13 May, midday).
3. As admin: edit a calendar event via the side rail; delete another event.
4. As admin: record a new sport result via `+ Record result`; edit it; delete it.
5. As admin: toggle a portfolio project's status from the row buttons; edit it; delete it.
6. As admin: edit `home_hero` via `/admin/config/home_hero/edit`; confirm `/student` reflects the change.
7. As root: delete a Carelin request from the desk Delete button.
8. As anon: open `/student/pshare/<slug>` for a published post; markdown body renders.
9. As admin: create a booking via `+ New Booking`; edit it; cancel it.

All changes survive refresh.

## Action signature convention (carried from 3d / 4 — do not re-derive)

- **`useActionState`-backed**: `(prev: ActionResult, formData: FormData) => Promise<ActionResult>`. Two consumers: `postCarelinRequest` (3d) and `bookRoom` (Phase 4). Inline errors via `state.error`. NOTE: the two diverge on success UX — `postCarelinRequest` `redirect()`s server-side; `bookRoom` returns `{ok:true}` and the client leaf `router.replace('?ok=1')`. Phase 5 candidate #10 picks one paradigm.
- **Plain Server Action**: `(formData: FormData) => Promise<void>` (required for React 19 `<form action={fn}>` typing). Validation early-returns silently (client-side `required` / `pattern` shadow them); real DB failures `throw new Error(msg)` to surface in Next's error boundary; success calls `revalidatePath(...)` then `redirect(...)`. **Exception:** `setProjectStatus` skips `redirect()` because the caller stays on `/admin/portfolio`.
- **Service-role usage (3 functions total):** `createAdmin`, `disableAdmin` (3d), `deleteCarelinRequest` (Phase 4). All gated by `requireRootAdmin()`.
- **Btn submit gotcha:** `components/admin/Btn.tsx` hardcodes `type="button"` but spreads `{...rest}` after. To submit a form via `<Btn>`, pass `type="submit"` explicitly: `<Btn type="submit" variant="primary">…</Btn>`. Phase 4 forms do this; 3d forms may not — see Phase 5 candidate #6.

## Reusable patterns from 3d / 4

- **Two submit buttons on one form**: primary is `<Btn type="submit" variant="primary">` (Phase 4 onwards). Second submit is plain `<button type="submit" formAction={fn}>`. Tested in `components/admin/PshareEditor.tsx` (3d) and `app/admin/calendar/[id]/edit/page.tsx`, `app/admin/portfolio/[id]/edit/page.tsx`, etc. (Phase 4).
- **Detail pages await `params` as `Promise<{ id: string }>`**; on missing row, call `notFound()`. Pattern: `app/admin/carelin/[id]/page.tsx`, `app/admin/pshare/[id]/edit/page.tsx`, `app/admin/calendar/[id]/edit/page.tsx`, `app/admin/portfolio/[id]/edit/page.tsx`, `app/admin/sport/result/[id]/edit/page.tsx`, `app/admin/bookings/[id]/edit/page.tsx`, `app/admin/config/[key]/edit/page.tsx`.
- **`searchParams` is also a `Promise`** in Next 16 — `app/student/booking/page.tsx` is the established example.
- **URL-param-driven picker state** keeps `'use client'` to a single leaf. Pickers become `<Link>` decorations; the page reads selection via `searchParams`. Pattern: `app/student/booking/page.tsx` + `components/student/BookingConfirmForm.tsx`. Generic helper: `buildHref(currentParams, patch)`.
- **`useActionState` success-state distinction:** use a module-level `INITIAL: ActionResult = { ok: true }` sentinel and check `state !== INITIAL && state.ok` in `useEffect` to detect fresh success. (`BookingConfirmForm.tsx`.) Note Phase 5 candidate #10 may collapse this in favor of server-side `redirect()`.
- **Dynamic counts**: SELECT only the discriminator column and count in JS. Pattern: `getCarelinTabCounts` in `lib/queries/carelin.ts`.
- **Multi-submit status form** (one form, multiple submit buttons each with `name="status" value="..."`): clicking submits with the clicked button's value. Pattern: `components/admin/PortfolioAdminTable.tsx` row controls.
- **Server-resolved isRoot prop**: the page calls `requireAdmin()`, derives `isRoot = admin.tier === "root"`, passes as a prop to child tables. The child table conditionally renders root-only controls. Pattern: `app/admin/carelin/page.tsx` → `components/admin/CarelinDeskTable.tsx`.
- **Conflict pre-check**: `findConflictingBooking(roomId, startsAt, endsAt, excludeId?)` in `lib/queries/bookings.ts`. Used by `bookRoom`, `createBooking`, `updateBooking`. Race-window-acceptable.
- **Period → timestamp mapping**: `PERIOD_HOURS` in `lib/ui/booking.ts` is single source of truth. Both the student page and the admin booking actions derive ISO timestamps via `${date}T${PERIOD_HOURS[period].start}:00+07:00`.

## Open items / risks to flag if relevant

- **No rate limiting** on anon writes. Phase 4 doubled the surface (Carelin + bookings). See Phase 5 candidate #3.
- **`getRecentBookings` hardcodes a `ROOM_TH_BY_EN` map** in `lib/queries/bookings.ts`. A join would be cleaner; left unchanged in Phase 4.
- **Date anchors** (`2026-05-12`) hardcoded in `getAdminTodayEvents`, `bookings.ts`, and `MAY_DATES` in `app/student/booking/page.tsx`. Prototype-acceptable.
- **Admin layout calls `requireAdmin` + most admin pages call it again** — two DB hits per render. Acceptable; could dedupe via `React.cache()` if it matters.
- **Seed-data stubs:** `CARELIN_DESK_ROWS` (3d) carries unused UUIDs; `ADMIN_TODAY_BOOKINGS` (Phase 4) has stub `id: "seed-N"` strings; `admin-portfolio.ts` uses a local `PortfolioSeedRow = Omit<...>` alias. All type-only. See Phase 5 candidate #14.
- **`lib/ui/carelin.ts` exports `carelinDeskTabs(counts)`** (the function form, not a constant array). Mirror this if you build similar tab counts.
- **Dead exports in `lib/ui/booking.ts`** after Phase 4: `BOOKING_ACTIVE_TAB`, `BOOKING_CONFIRM_EYEBROW`. URL-derived now. See Phase 5 candidate #11.
- **`Btn` `type="button"` default** — Phase 4 forms pass `type="submit"` explicitly. 3d forms (`/admin/calendar/new`, `/admin/admins`, P'share editor) may not — their Save buttons may be functionally inert (Enter-in-input still submits). Manual test on each before relying on click-to-submit. See Phase 5 candidate #6.
- **Anon `bookings` policy** does not constrain `created_by_admin_id`. The action doesn't set it, so theoretical only. See Phase 5 candidate #8.
- **`useActionState` success-UX paradigm divergence** between `postCarelinRequest` (server `redirect()`) and `bookRoom` (client `router.replace`). See Phase 5 candidate #10.
- **Booking conflict pre-check** has a small race window between SELECT and INSERT. Acceptable for prototype. See Phase 5 candidate #9 if abuse appears.
- **`tags` editing on `/admin/portfolio/[id]/edit`** is deliberately skipped — `updateProject` preserves the existing JSONB. See Phase 5 candidate #7.
- **`getMusicRooms` + `getMeetingRooms`** both added `.eq("is_active", true)` in Phase 4 (was missing on `getMusicRooms` before). All 4 student music rooms + 3 meeting rooms in the seed are `is_active = true` by default — no visible change today, but new inactive rooms now correctly disappear from the student picker.

## Conventions (unchanged)

- Default to RSC; `'use client'` only at interactive leaves.
- Bilingual EN/TH everywhere user-visible.
- Class composition via `lib/cn.ts`.
- One logical change per commit. No `Co-Authored-By` trailer.
- After a write: `revalidatePath(...)` then optionally `redirect(...)`.

## Don't

- Don't drop or recreate `proxy.ts`.
- Don't touch `lib/supabase/*` unless regenerating `database.types.ts`.
- Don't import `lib/supabase/serviceRole.ts` from anything client-side.
- Don't import from `@/supabase/seed/data/` in `app/` or `components/`.
- Don't add `lucide-react`, `zod`, `react-hook-form`, `swr`, or `@tanstack/react-query`.
- Don't enable Supabase Realtime or Storage in Phase 4 — both deferred to Phase 5.
- Don't add `'use cache'` / `cacheLife()` — Phase 4 stays uncached.
- Don't break the Carelin anon-write contract — `student_id_4 ~ '^[0-9]{4}$'` + hand-rolled validator is the entire public-write security model.
