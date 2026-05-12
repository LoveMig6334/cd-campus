# Phase 4 — Full write surface

**Date:** 2026-05-12
**Status:** Brainstormed; awaiting implementation plan
**Supersedes:** the original Phase 4–5 entries in [`docs/migration-plan.md`](../../migration-plan.md).
**Builds on:** [`docs/superpowers/specs/2026-05-12-supabase-migration-design.md`](./2026-05-12-supabase-migration-design.md). The §Write pattern and §RLS policy summary tables in the migration design apply here verbatim — this spec references them rather than duplicating.

## Goal

Wire every remaining inert prototype button to a real Server Action, so the app is fully interactive end-to-end. Add one RLS migration to permit anonymous room bookings. Close the P'share publish→read loop by adding the student-facing reader page.

After Phase 4, the only deliberately-deferred write is **+ Add Project** on `/admin/portfolio` (no student authorship/submission flow exists yet — its own design needed in Phase 5).

## Decisions log

| # | Topic | Decision |
|---|---|---|
| 1 | Student room bookings | Anonymous, mirroring Carelin. Form takes free-form name + 4-digit `student_id_4` + optional class + purpose. New RLS policy + check constraint on `bookings`. |
| 2 | Portfolio breadth | Approve/reject (status toggle) + edit + delete. `+ Add Project` stays inert with an in-code "deferred to Phase 5" comment. |
| 3 | Calendar edit UX | Side-rail event list on `/admin/calendar` listing this month's events with row Edit/Delete controls. BigCal cells stay non-interactive. |
| 4 | site_config editor | One generic action `updateSiteConfig`, but routes are per-key with structured forms: `/admin/config` (index) + `/admin/config/[key]/edit`. Six keys editable: `home_hero`, `overview_kpis`, `trend_chart`, `portfolio_stats`, `portfolio_kpis`, `carelin_kpis`. `admin_greeting` hidden from the index (computed from `admins.display_name`). |
| 5 | Sport results UI | Dedicated routes `/admin/sport/result/new` + `/[id]/edit`. The misleading `+ Add event` button is renamed `+ Record result`. Row `⋯` on `EventResultsTable` links to edit; delete from edit form. |
| 6 | P'share reader | Included. New `app/student/pshare/[slug]/page.tsx`, RSC, renders `body_md` with `react-markdown` + `remark-gfm`. RLS already restricts anon SELECT to `status='published'`. |
| 7 | Booking selection state | URL params (`?date=…&period=…&room=…`). Pickers become `<Link>`s; no whole-page client wrapper. `useActionState` is a small client leaf on the bottom form. |
| 8 | Booking conflict detection | Server-side pre-check inside `bookRoom` / `createBooking` / `updateBooking` against overlapping `(room_id, time range)`. No DB-level exclusion constraint. |
| 9 | Period→time mapping | `PERIOD_HOURS` map in `lib/ui/booking.ts` is single source of truth, consumed by both the page and the actions. Bangkok `+07:00` anchor matches 3d. |
| 10 | Booking cancel semantics | `cancelBooking` = `DELETE FROM bookings WHERE id=…`. Avoids extending `booking_status` enum with a `Cancelled` state. Anon writes are INSERT-only — admin remains the only canceller. |

## Sub-phase outline

Phase 4 ships as **one logical phase**, but each row in the [per-entity write set](#per-entity-write-set) is its own per-task commit on `main`. Same cadence as Phase 3d. Order is roughly smallest→largest to validate the inherited Phase 3d patterns before tackling the larger surfaces (bookings, site_config).

## Per-entity write set

| # | Entity | Actions | New routes | Auth | Notes |
|---|---|---|---|---|---|
| 1 | Carelin | `deleteCarelinRequest` | (extends `app/admin/carelin/actions.ts`) | **root** | Service-role. Row `⋯` on `CarelinDeskTable` shows Delete only if `requireRootAdmin()` resolves for the caller — server-resolved at table-render time. |
| 2 | P'share reader | (read-only) | `app/student/pshare/[slug]/page.tsx` | anon | New `getPsharePostBySlug` query helper. Renders art panel + markdown body. `notFound()` on missing slug. |
| 3 | Calendar | `updateEvent`, `deleteEvent` | `app/admin/calendar/[id]/edit/page.tsx` + `components/admin/AdminCalendarEventList.tsx` | admin | Side-rail right of BigCal on `/admin/calendar`. New `getAdminMonthEventList(year, month)` returns sorted `{id, starts_at, title_th, category, location}[]`. |
| 4 | Sport results | `recordSportResult`, `updateSportResult`, `deleteSportResult` | `app/admin/sport/result/new`, `app/admin/sport/result/[id]/edit` | admin | 4 ordered house slots, category, time_label, bilingual titles. `EventResultsTable` gains a new trailing `⋯` column → edit link. Delete from edit form. Topbar button renamed "+ Record result." |
| 5 | Portfolio | `setProjectStatus`, `updateProject`, `deleteProject` | `app/admin/portfolio/[id]/edit/page.tsx` | admin | `PortfolioAdminTable`'s existing `⋯` cell becomes a small form rendering 3 `<button formAction={setProjectStatus}>` controls (one per status) + an Edit link. Delete on edit form. |
| 6 | site_config | `updateSiteConfig` (key-dispatched) | `app/admin/config/page.tsx`, `app/admin/config/[key]/edit/page.tsx` | admin | Six keys: `home_hero`, `overview_kpis`, `trend_chart`, `portfolio_stats`, `portfolio_kpis`, `carelin_kpis`. Per-key structured form. `trend_chart` form has 13 point inputs; server derives the SVG `path` string at write time. `home_hero` form is flat ~10 fields (with nested `leading` + `weather` flattened). KPI keys render as repeating 4-card field groups. |
| 7 | Admin bookings | `createBooking`, `updateBooking`, `cancelBooking` | `app/admin/bookings/new`, `app/admin/bookings/[id]/edit` | admin | Wires the `+ New Booking` topbar button. `AdminTodayBookingsTable` gains a new trailing `⋯` column → edit link (table has none today). `cancelBooking` is a hard DELETE. Reuses the [conflict pre-check](#conflict-pre-check). |
| 8 | Student bookings | `bookRoom` | (writes from existing `/student/booking`) | **anon** | New RLS policy + check constraint. Form uses `useActionState`. 4-digit `student_id_4` + name + optional class + purpose. Derives `starts_at`/`ends_at` from `PERIOD_HOURS[period]` + date. |

**Service-role usage** after Phase 4: `createAdmin`, `disableAdmin`, `deleteCarelinRequest`. Nothing else.

## File layout

```
supabase/migrations/0003_phase4_anon_bookings.sql       NEW
lib/supabase/database.types.ts                          regenerated after `supabase db push`

lib/queries/pshare.ts                  +getPsharePostBySlug
lib/queries/events.ts                  +getAdminMonthEventList, +getEventById
lib/queries/bookings.ts                +findConflictingBooking, +getBookingById
lib/queries/siteConfig.ts              +getConfigByKey (generic)
lib/queries/sportResults.ts            +getSportResultById
lib/queries/projects.ts                +getProjectById
lib/ui/booking.ts                      +PERIOD_HOURS map

app/student/booking/page.tsx           rewrite: URL-param pickers + Confirm form
app/student/booking/actions.ts         NEW: bookRoom (useActionState)
app/student/pshare/[slug]/page.tsx     NEW: reader

app/admin/calendar/page.tsx                          +side-rail
app/admin/calendar/[id]/edit/page.tsx                NEW
app/admin/calendar/actions.ts                        +updateEvent, +deleteEvent
components/admin/AdminCalendarEventList.tsx          NEW

app/admin/sport/page.tsx                             relabel button, wire row ⋯
app/admin/sport/result/new/page.tsx                  NEW
app/admin/sport/result/[id]/edit/page.tsx            NEW
app/admin/sport/actions.ts                           +recordSportResult, +updateSportResult, +deleteSportResult
components/admin/EventResultsTable.tsx               +row ⋯ → edit link

app/admin/portfolio/page.tsx                         wire ⋯ menu
app/admin/portfolio/[id]/edit/page.tsx               NEW
app/admin/portfolio/actions.ts                       NEW: setProjectStatus, updateProject, deleteProject
components/admin/PortfolioAdminTable.tsx             ⋯ becomes status form + edit link

app/admin/config/page.tsx                            NEW: index of editable keys
app/admin/config/[key]/edit/page.tsx                 NEW: per-key structured forms
app/admin/config/actions.ts                          NEW: updateSiteConfig (key-dispatched)

app/admin/bookings/page.tsx                          wire +New Booking + row ⋯
app/admin/bookings/new/page.tsx                      NEW
app/admin/bookings/[id]/edit/page.tsx                NEW
app/admin/bookings/actions.ts                        NEW: createBooking, updateBooking, cancelBooking

app/admin/carelin/actions.ts                         +deleteCarelinRequest
components/admin/CarelinDeskTable.tsx                row ⋯ → delete (root-only conditional)
```

## Schema migration

**File:** `supabase/migrations/0003_phase4_anon_bookings.sql`

```sql
-- Add anon-supplied identity columns to bookings (mirrors carelin_requests).
alter table bookings
  add column student_id_4 text,
  add column klass        text;

-- The 4-digit constraint only fires on non-null values, so admin-created bookings
-- (where student_id_4 is null) continue to work.
alter table bookings
  add constraint bookings_student_id_4_format
  check (student_id_4 is null or student_id_4 ~ '^[0-9]{4}$');

-- Anon INSERT, mirroring carelin_requests anon-insert policy.
create policy "bookings_anon_insert"
  on bookings for insert to anon
  with check (
    user_label is not null
    and length(trim(user_label)) > 0
    and student_id_4 ~ '^[0-9]{4}$'
    and starts_at < ends_at
  );
```

After `supabase db push`, regenerate `lib/supabase/database.types.ts` and commit migration + generated types together.

`bookings.purpose` and `bookings.user_label` already exist in 0001 — confirm before extending the migration.

## Revalidate matrix

| Action | `revalidatePath` calls | Followup |
|---|---|---|
| `deleteCarelinRequest` | `/admin/carelin`, `/admin/carelin/[id]` | `redirect('/admin/carelin')` |
| `updateEvent` | `/admin/calendar`, `/student/calendar`, `/admin`, `/student` | `redirect('/admin/calendar')` |
| `deleteEvent` | same as updateEvent | `redirect('/admin/calendar')` |
| `recordSportResult` | `/admin/sport`, `/student/sport` | `redirect('/admin/sport')` |
| `updateSportResult` | same | `redirect('/admin/sport')` |
| `deleteSportResult` | same | `redirect('/admin/sport')` |
| `setProjectStatus` | `/admin/portfolio`, `/student/portfolio` | (no redirect — same page) |
| `updateProject` | same | `redirect('/admin/portfolio')` |
| `deleteProject` | same | `redirect('/admin/portfolio')` |
| `updateSiteConfig` (`home_hero`) | `/student`, `/admin/config`, `/admin/config/home_hero/edit` | `redirect('/admin/config')` |
| `updateSiteConfig` (`overview_kpis`, `trend_chart`) | `/admin`, `/admin/config`, `/admin/config/[key]/edit` | `redirect('/admin/config')` |
| `updateSiteConfig` (`portfolio_kpis`, `portfolio_stats`) | `/admin/portfolio`, `/student/portfolio`, `/admin/config`, `/admin/config/[key]/edit` | `redirect('/admin/config')` |
| `updateSiteConfig` (`carelin_kpis`) | `/admin/carelin`, `/admin/config`, `/admin/config/[key]/edit` | `redirect('/admin/config')` |
| `createBooking` | `/admin/bookings`, `/student/booking`, `/admin` | `redirect('/admin/bookings')` |
| `updateBooking` | same | `redirect('/admin/bookings')` |
| `cancelBooking` (DELETE) | same | `redirect('/admin/bookings')` |
| `bookRoom` (anon) | `/student/booking`, `/admin/bookings`, `/admin` | returns `{ok:true}` (form uses `useActionState`); page renders success state on `?ok=1` round-trip |

## Bookings flow

### Selection state (URL params)

The existing prototype layout on `/student/booking` stays — same chrome, same components — but the pickers become `<Link>` decorations:

- **Tab** (`Music` / `Meeting`) → `?tab=music|meeting` (default `music`). Selects which rooms appear.
- **Day** in `CalendarGrid` → `?date=YYYY-MM-DD`. Each day cell becomes a `<Link>`; closed/non-month days stay inert.
- **Period** in `PeriodPicker` → `?period=morning|midday|evening`. Each period button becomes a `<Link>`.
- **Room** in `RoomList` → `?room=<uuid>`. Each room row becomes a `<Link>`.

Page is server-rendered; `searchParams: Promise<{...}>` is awaited per Next 16. Selected state for the eyebrow ("13 MAY · MIDDAY · MUSIC ROOM 1") is derived server-side from the URL.

The Confirm form at the bottom is a small `'use client'` leaf using `useActionState`:
- Hidden inputs for `date`, `period`, `room`, `tab` (read from URL via the parent server component and forwarded as props).
- Text inputs for `name`, `student_id_4`, `klass` (optional), `purpose` (optional).
- `bookRoom` returns `ActionResult`; on `{ok: false}`, the error renders inline above the CTA.
- On `{ok: true}`, the action returns; `useActionState` does not redirect. The client form then calls `router.replace('/student/booking?ok=1')` (single `useEffect` watching the state), which drops the `?date`/`?period`/`?room` selection params and triggers a re-render. The server-rendered page reads `?ok=1` and shows a success banner above the (now empty) pickers.

### Period → timestamp mapping

```ts
// lib/ui/booking.ts
export const PERIOD_HOURS = {
  morning: { start: "08:00", end: "11:00" },
  midday:  { start: "11:30", end: "14:30" },
  evening: { start: "15:00", end: "18:00" },
} as const;

export type PeriodId = keyof typeof PERIOD_HOURS;
```

Action derives ISO timestamps:
```ts
const starts_at = `${date}T${PERIOD_HOURS[period].start}:00+07:00`;
const ends_at   = `${date}T${PERIOD_HOURS[period].end}:00+07:00`;
```

The existing `BOOKING_PERIODS` array stays; it gains `id: PeriodId` keys so the URL value and the display label share one source.

### Conflict pre-check

Helper in `lib/queries/bookings.ts`:

```ts
export async function findConflictingBooking(
  roomId: string,
  startsAt: string,
  endsAt: string,
  excludeId?: string,
): Promise<boolean> {
  const db = await createClient();
  let q = db
    .from("bookings")
    .select("id")
    .eq("room_id", roomId)
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt)
    .limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw new Error(`findConflictingBooking: ${error.message}`);
  return (data?.length ?? 0) > 0;
}
```

Used by `bookRoom`, `createBooking`, `updateBooking`. Race window between the pre-check and the INSERT exists; acceptable for prototype scale.

### Booking action signatures

- `bookRoom(prev: ActionResult, formData: FormData): Promise<ActionResult>` — the only `useActionState`-backed addition. Surfaces errors inline like Carelin.
- `createBooking(formData: FormData): Promise<void>` — admin; throws on DB failure; redirects on success.
- `updateBooking(formData: FormData): Promise<void>` — admin.
- `cancelBooking(formData: FormData): Promise<void>` — admin; performs DELETE on the row id.

## Action signature convention (carried from Phase 3d)

See [Phase 3d plan](../plans/2026-05-12-supabase-3d-writes.md) and the [Supabase migration spec](./2026-05-12-supabase-migration-design.md#write-pattern) for the full pattern. Summary:

- `useActionState`-backed: `(prev: ActionResult, formData: FormData) => Promise<ActionResult>`. Used by `postCarelinRequest` (3d) and `bookRoom` (4) only.
- Every other Server Action: `(formData: FormData) => Promise<void>`. Validation early-returns silently; DB failures `throw new Error(msg)`; success calls `revalidatePath(...)` then `redirect(...)`.

## RLS — what changes and what doesn't

The §RLS policy summary table in the migration design covers Phase 4 verbatim, with **one addition**:

| Table | Phase-3 anon write | Phase-4 anon write |
|---|---|---|
| `bookings` | none | **INSERT allowed**, gated by check constraints on `student_id_4` format and `user_label` non-empty, plus `starts_at < ends_at` |

All other anon-write rows stay at "none." All authenticated-admin rows are unchanged.

Service-role usage extends from 2 functions (`createAdmin`, `disableAdmin`) to **3**: add `deleteCarelinRequest`. RLS only permits `is_root_admin()` DELETE on `carelin_requests`, so the service-role client is the simplest path (matching the 3d precedent).

## Open items / risks

1. **Anon write surface doubles** (Carelin + bookings). Both check-constrained at the DB level; both run hand-rolled validators in the action. **No rate limiting** in Phase 4 either. *Mitigation:* check constraints catch garbage; admin can `deleteCarelinRequest` and `cancelBooking` spam. If abuse appears, Phase 5 should add IP-based throttling at the proxy layer.
2. **Service-role list grows by one.** `deleteCarelinRequest` joins `createAdmin` / `disableAdmin`. All three are gated by `requireRootAdmin()` and live in `app/admin/.../actions.ts`. No new client-side import paths.
3. **Booking conflict pre-check has a small race window** between SELECT and INSERT. Acceptable for prototype scale. *Future:* add `EXCLUDE USING gist` constraint (needs `btree_gist` extension migration) if multi-tenant load matters.
4. **`bookings.user_label` semantics widen.** Previously admin-typed only; now also anon-supplied. The column stays a free-form display name; no roster lookup. Document in the migration file.
5. **`admin_greeting` site_config row is dead-code-ish.** Still queried via `getAdminGreeting` (untouched in Phase 4) but the actual displayed greeting comes from `admins.display_name`. Phase 4 hides it from `/admin/config`. *Cleanup candidate for Phase 5:* drop the row and the helper.
6. **`+ Add Project` on `/admin/portfolio` stays inert.** Mark with a code comment `// deferred to Phase 5 — needs student submission flow design`. Per the exit criterion, this is the only intentionally-inert button left after Phase 4.
7. **The `⋯` cell in `PortfolioAdminTable`** today is decorative. Phase 4 replaces it with a small status-toggle form + edit link in the same `<td>`. Width may need tightening.
8. **`BOOKING_ROOM_STATUS_BY_NAME` overlay in `lib/ui/booking.ts`** is a static demo overlay (free/full chips on the room list). Phase 4 leaves it as-is — real availability would mean another query, and the prototype's visual identity depends on the overlay. *Future:* compute availability from real bookings if it becomes confusing once real data is created.

## Out of scope

- **Supabase Realtime / Storage** — deferred to Phase 5.
- **Student authentication** — students remain anonymous everywhere.
- **`+ Add Project`** on `/admin/portfolio` — deferred (needs student submission design).
- **Rate limiting** — deferred to Phase 5 if abuse appears.
- **`'use cache'` / `cacheLife()`** — pages stay dynamic per Phase 3.
- **A separate dev/prod Supabase project split** — single hosted project continues.
- **Self-service password change for admins** — root-set initial password still the only mechanism.
- **`admin_greeting` site_config cleanup** — flagged for Phase 5.

## Exit criteria

- [ ] Migration `0003_phase4_anon_bookings.sql` applied; `lib/supabase/database.types.ts` regenerated and committed in the same commit.
- [ ] Every prototype button routes to an action **or** carries an explicit `// deferred to Phase 5` code comment. As of Phase 4, only `+ Add Project` on `/admin/portfolio` is intentionally inert.
- [ ] Carelin and bookings are the only public-write surfaces. RLS table confirms via the `anon` role in Supabase Studio.
- [ ] Service-role usage limited to `createAdmin`, `disableAdmin`, `deleteCarelinRequest`. No other file imports `lib/supabase/serviceRole.ts`.
- [ ] `npm run lint` and `npm run build` pass at every commit boundary.
- [ ] Manual walk-through, in this order, all surviving refresh:
  1. Post a Carelin request anonymously → reply as admin → mark answered (regression check on 3d).
  2. Post a booking anonymously (Music Room 2, 13 May, midday).
  3. As admin: edit a calendar event via the side rail; delete a calendar event.
  4. As admin: record a new sport result; edit it; delete it.
  5. As admin: toggle a portfolio project's status from `⋯`; edit it; delete it.
  6. As admin: edit `home_hero` via `/admin/config/home_hero/edit`; confirm `/student` reflects the change.
  7. As root: delete a Carelin request from the desk `⋯` menu.
  8. As student: open `/student/pshare/<slug>` for a published post; render markdown body.
  9. As admin: create a booking via `+ New Booking`; edit it; cancel it.
- [ ] One commit per logical change; no `Co-Authored-By` trailer.
