# CD Smart Campus — Supabase Migration Design

**Date:** 2026-05-12
**Status:** Brainstormed; awaiting implementation plan
**Supersedes:** the "Phase 3 — Interactivity" entry in [`docs/migration-plan.md`](../../migration-plan.md). Phase 3 is no longer "wire `useState` toggles" — it's now the four-step Supabase cutover described below.

## Goal

Replace the typed mock arrays in `data/*.ts` with a Supabase-backed Postgres database, add admin-only authentication, and wire the prototype's interactive surfaces (Carelin form, P'share studio, scoreboard edit, calendar add) to real Server Actions. Students remain anonymous.

## Decisions log

| #   | Topic                      | Decision                                                                                                                                          |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Migration scope            | Everything moves. All entity sets become Postgres tables; mocks become reproducible seed input.                                                   |
| 2   | Auth model                 | Supabase Auth, admins only. Two tiers: `root` (manages other admins) + `normal` (edits content). Students never log in.                           |
| 3   | Student identity (Carelin) | Free-form `name` + 4-digit `student_id`. No roster table. Optional `klass` field added to the form so the admin desk view keeps its `ม.X/Y` line. |
| 4   | Local dev                  | Hosted Supabase project only (no Docker). Env vars in `.env.local` for dev, Vercel env for prod, **same project** for both.                       |
| 5   | Schema source of truth     | Supabase CLI migrations (SQL files in `supabase/migrations/`), TS types generated via `supabase gen types`.                                       |
| 6   | Realtime / Storage         | Both deferred. Phase 3 is SSR-only; no Supabase Storage.                                                                                          |
| 7   | Read pattern (default)     | Server client (`@supabase/ssr`) called from RSC via thin `lib/queries/<entity>.ts` helpers. No caching in Phase 3 — pages are dynamic.            |
| 8   | Write pattern (default)    | Server Actions co-located with the page that owns them (`app/.../actions.ts`). Hand-rolled validation, no Zod, no `react-hook-form`.              |

## Sub-phase outline

Phase 3 splits into four small sub-phases mirroring the Phase 0/1/2 cadence already in the repo:

### 3a — Foundation

- Install `@supabase/supabase-js` and `@supabase/ssr`.
- Create `lib/supabase/server.ts`, `lib/supabase/serviceRole.ts`, `lib/supabase/client.ts` (the third only used if a future client widget needs it).
- Wire env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Build `app/login/page.tsx` + `app/login/actions.ts` (`signIn`).
- Build `app/auth/signout/actions.ts` (`signOut`).
- Build `middleware.ts` that refreshes session cookies on every request and gates `/admin/**` on a valid session.
- Bootstrap the root admin: create your auth user manually in the Supabase dashboard; `supabase/seed.sql` inserts a row in `admins` with `tier='root'` and your `auth_user_id`.

**Verification:** logging in as root and visiting `/admin` shows a placeholder; logging out and revisiting redirects to `/login`. No data tables yet.

### 3b — Schema

- Author `supabase/migrations/0001_init.sql` (tables + enums) and `0002_rls.sql` (helper functions + policies).
- Author `supabase/seed/index.ts` — TS script that uses the service-role client to upsert from imported data files.
- Move `data/*.ts` → `supabase/seed/data/*.ts` so the source-of-truth shift is explicit.
- `supabase db push` against the hosted project; `supabase gen types typescript --linked > lib/supabase/database.types.ts`.

**Verification:** open Supabase Studio, see all rows; generated types compile; the app still reads from the moved seed-data files (no behavioural change yet).

### 3c — Read swap

- For each page, replace `import { X } from "@/supabase/seed/data/..."` with an async fetch via `lib/queries/<entity>.ts` against the server client.
- Visual parity gate: every page should look pixel-identical to its current Phase 2 output.
- After all 14 pages are swapped, the seed-data files only feed the seed script — they are no longer imported by `app/`.

**Verification:** `npm run build` clean; eyeballing each route against the prototype shows no regressions.

### 3d — Writes

Server Actions per writable surface (full list under [Write pattern](#write-pattern) below). Forms use `<form action={…}>`; the Carelin form additionally uses `useActionState` for inline error display. Everything that doesn't have a Server Action this phase remains as static UI (buttons exist, do nothing).

**Verification:** post a Carelin request anonymously; reply as admin; mark answered; publish a P'share post; edit a scoreboard score; add a calendar event. All survive a page refresh.

## File layout

New top-level directories that appear across 3a–3d:

```
lib/
  supabase/
    server.ts            # createServerClient() for RSC + Server Actions
    serviceRole.ts       # createServiceRoleClient() — server-only, `import 'server-only'`
    client.ts            # createBrowserClient() — only if a future client widget needs it
    database.types.ts    # generated by `supabase gen types`, committed
  queries/               # thin per-entity read helpers
    events.ts
    houses.ts
    rooms.ts
    bookings.ts
    sportResults.ts
    projects.ts
    pshare.ts
    carelin.ts
    siteConfig.ts
    admins.ts

supabase/
  migrations/
    0001_init.sql
    0002_rls.sql
  seed.sql               # bootstrap row for the root admin
  seed/
    index.ts             # entry point, runs upserts in dependency order
    data/                # the moved data/*.ts files

app/
  login/
    page.tsx
    actions.ts           # signIn
  auth/
    signout/
      actions.ts         # signOut
  admin/
    admins/              # NEW — root-only admin management
      page.tsx
      actions.ts         # createAdmin, disableAdmin
  student/carelin/actions.ts
  admin/carelin/actions.ts
  admin/pshare/actions.ts
  admin/sport/actions.ts
  admin/calendar/actions.ts

middleware.ts            # protects /admin/**
```

## Schema design

**Five enum types**, eleven tables.

### Enums

```sql
create type admin_tier               as enum ('root', 'normal');
create type event_category           as enum ('sport', 'tradition', 'music', 'admin', 'academic');
create type sport_result_category    as enum ('Track', 'Team');
create type room_kind                as enum ('music', 'meeting');
create type booking_status           as enum ('Confirmed', 'Pending', 'Review');
create type booking_bar_variant      as enum ('default', 'y', 'p', 'g', 'o');
create type project_status           as enum ('Published', 'Under Review', 'Draft');
create type pshare_status            as enum ('draft', 'published', 'review');
create type carelin_status           as enum ('open', 'answered');
```

### Tables

```sql
admins
  id                    uuid pk default gen_random_uuid()
  auth_user_id          uuid unique not null fk → auth.users(id)
  email                 text unique not null
  display_name          text not null              -- "อ.อาทรง"
  tier                  admin_tier not null         -- 'root' | 'normal'
  is_active             bool not null default true
  created_at            timestamptz default now()
  updated_at            timestamptz default now()

houses                                              -- 4 fixed rows, seeded
  id                    smallint pk                 -- 1..4
  name_en               text not null               -- "Green"
  name_th               text not null               -- "เขียว"
  color_token           text not null               -- 'house-green'
  current_score         int not null default 0
  stat_summary          text                        -- "7 wins · 3 second · 1 third"
  sort_order            smallint

events                                              -- calendar (student + admin + today + upcoming)
  id                    uuid pk
  title_th              text not null
  title_en              text                        -- nullable; many events are TH-only
  tag                   text                        -- "Sport · ลานกีฬากลาง"
  category              event_category not null
  starts_at             timestamptz not null
  location              text
  highlight             bool not null default false -- the yellow "Briefing" chip
  created_by_admin_id   uuid fk → admins(id)
  created_at, updated_at

sport_results                                       -- recorded match outcomes
  id                    uuid pk
  title_th              text not null
  title_en              text
  category              sport_result_category not null
  placements            smallint[4]                 -- [house_id_1st, 2nd, 3rd, 4th]
  time_label            text                        -- "10:42"
  recorded_at           timestamptz default now()
  created_by_admin_id   uuid fk → admins(id)

rooms                                               -- 6 fixed rows, seeded
  id                    uuid pk
  name_en               text not null               -- "Music Room 1"
  name_th               text not null               -- "เปียโน · กลอง"
  kind                  room_kind not null
  sort_order            smallint
  is_active             bool default true

bookings
  id                    uuid pk
  room_id               uuid not null fk → rooms(id)
  user_label            text not null               -- "ธรรศ์ ภัทรกุล"
  purpose               text                        -- "Piano practice"
  starts_at             timestamptz not null
  ends_at               timestamptz not null
  status                booking_status default 'Confirmed'
  bar_variant           booking_bar_variant default 'default'
  created_by_admin_id   uuid fk → admins(id)
  created_at, updated_at

projects                                            -- portfolio (student + admin views)
  id                    uuid pk
  title_en              text not null
  title_th              text
  desc_long             text
  author_line           text                        -- "ธรรศ์ × นนท์ — Y9 / 2025"
  klass                 text                        -- "Y9 / 2025"
  status                project_status not null
  is_featured           bool default false          -- separate from status
  icon_key              text                        -- 'crop' | 'solar' | 'shm' | 'trend' | ...
  thumb_bg              text                        -- CSS color override
  tags                  jsonb                       -- [{label, background, textColor?}]
  submitted_at          date
  created_by_admin_id   uuid fk → admins(id)
  created_at, updated_at

pshare_posts
  id                    uuid pk
  slug                  text unique not null        -- "tmo-prep"
  num_label             text                        -- "01"
  title                 text not null
  snippet               text
  body_md               text                        -- markdown source
  author_alias          text                        -- "พี่ฟ้า · ม.6/3"
  art_halftone          text                        -- 'halftone-bl' | 'halftone-bk' | 'halftone-soft'
  art_bg                text                        -- CSS color override
  art_num_color         text                        -- CSS color override
  status                pshare_status not null
  tags                  text[]                      -- ['#math-olympiad', '#tmo']
  published_at          timestamptz
  created_by_admin_id   uuid fk → admins(id)
  created_at, updated_at

carelin_requests                                    -- student-submitted, anonymous writes
  id                    uuid pk
  title                 text not null
  body                  text not null
  who_name              text not null               -- "วงกต"
  student_id_4          text not null check (student_id_4 ~ '^[0-9]{4}$')
  klass                 text                        -- "ม.5/2", nullable (5th form field)
  status                carelin_status default 'open'
  created_at            timestamptz default now()

carelin_replies                                     -- admin replies, 1:N to requests
  id                    uuid pk
  request_id            uuid not null fk → carelin_requests(id) on delete cascade
  teacher_name          text                        -- "อ.อาทรง" (denormalised; admin can be deleted)
  role_label            text                        -- "Physics" / "ดนตรี"
  body                  text not null
  avatar_letter         text                        -- single character "อ"
  created_by_admin_id   uuid fk → admins(id)
  created_at            timestamptz default now()

site_config                                         -- key/value for non-entity content
  key                   text pk                     -- 'home_hero', 'overview_kpis', 'portfolio_kpis',
                                                    -- 'carelin_kpis', 'portfolio_stats', 'trend_chart',
                                                    -- 'admin_topbar_eyebrow_overview', etc.
  value                 jsonb not null
  updated_by_admin_id   uuid fk → admins(id)
  updated_at            timestamptz default now()
```

### Things intentionally **not** in the database

These are navigation/UI configuration, not user content. They stay in code:

- The 6 student-home menu tile labels and inline SVG icons (`components/student/MenuIcons.tsx`).
- Calendar chip categories (`All` + 5 category enum values).
- Booking periods (Morning / Midday / Evening) — fixed business rule.
- Booking tabs (Music / Meeting) — derived from `room_kind` enum.
- Portfolio thumb icon registry, P'share star/halftone variant lookup tables.
- Carelin desk / portfolio admin tab definitions.
- Admin sidebar nav items.

### Notes

1. **Greeting**: `ADMIN_GREETING.th` ("สวัสดี อ.อาทรง") becomes `"สวัสดี " + admins.display_name` for the logged-in admin. Not a config row.
2. **Carelin form**: a 5th nullable `Class · ชั้น` field is added to keep the admin desk view's `ม.X/Y` line meaningful. The column stays nullable, so dropping the field later is non-destructive.
3. **Project tags vs P'share tags**: project tags are colored chips (`jsonb` of `{label, background, textColor?}`), P'share tags are flat hashtags (`text[]`). Different shapes because the prototype renders them differently.
4. **KPIs and the 12-month trend chart**: most prototype KPI numbers are admin-set ("Lost & Found 14", "Avg response 42 min") with no derivable source. They live in `site_config` as jsonb blobs, edited by admins. A future phase can replace specific keys with computed aggregates (`select count(*) from bookings where ...`) as the underlying data accrues.
5. **`sport_results.placements` as `smallint[4]`**: never queried by individual position, so an array column is cleaner than four FK columns.

## Auth + RLS

### Login mechanics

- **Email + password** via `supabase.auth.signInWithPassword`.
- `/login` renders the form; `signIn` Server Action handles the call.
- `/auth/signout` POST-only Server Action calls `supabase.auth.signOut` then redirects.
- `middleware.ts` refreshes session cookies on every request and redirects unauthenticated `/admin/**` traffic to `/login`.

### Bootstrapping the root admin (one-time)

1. Create your own user manually in the Supabase dashboard (Auth → Users → Invite, set password).
2. `supabase/seed.sql` inserts a row into `admins` with `tier='root'` and your `auth_user_id` (you paste your UUID into the seed file once).
3. Log in. From then on you create other admins from inside the app.

### Creating a normal admin (root-only flow)

- `app/admin/admins/page.tsx` lists all admins; root sees a "create new" form.
- The `createAdmin({email, display_name, password})` Server Action verifies the caller is root via `is_root_admin()`, then uses the **service-role client** to:
  1. Call `supabase.auth.admin.createUser({email, password, email_confirm: true})`.
  2. INSERT a row into `admins` with the returned `auth_user_id` and `tier='normal'`.
- Service-role bypasses RLS, which is the intended escape hatch for admin management.
- Root tells the new admin their initial password out-of-band. Self-service "change password" is a later phase.

### RLS helper functions

All `security definer` so they can read `admins` while RLS is on:

```sql
create function current_admin_id() returns uuid …
create function is_admin()         returns boolean …
create function is_root_admin()    returns boolean …
```

### RLS policy summary

| Table              | anon SELECT                 | anon write                                 | authenticated (admin)                                           |
| ------------------ | --------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `admins`           | none                        | none                                       | SELECT own row; INSERT/UPDATE only via service role             |
| `houses`           | all                         | none                                       | full CRUD if `is_admin()`                                       |
| `events`           | all                         | none                                       | full CRUD if `is_admin()`                                       |
| `sport_results`    | all                         | none                                       | full CRUD if `is_admin()`                                       |
| `rooms`            | all                         | none                                       | INSERT/UPDATE/DELETE if `is_root_admin()`; SELECT for any admin |
| `bookings`         | all                         | none                                       | full CRUD if `is_admin()`                                       |
| `projects`         | all                         | none                                       | full CRUD if `is_admin()`                                       |
| `pshare_posts`     | `status = 'published'` only | none                                       | full CRUD if `is_admin()`                                       |
| `carelin_requests` | all                         | **INSERT allowed** (the only public write) | UPDATE status if `is_admin()`; DELETE if `is_root_admin()`      |
| `carelin_replies`  | all                         | none                                       | INSERT/UPDATE if `is_admin()`                                   |
| `site_config`      | all                         | none                                       | UPDATE if `is_admin()`                                          |

### Two flagged risks

1. **Anonymous Carelin INSERT is the entire public-write surface.** Server Action additionally validates the 4-digit ID format. No rate limiting in Phase 3 — revisit if spam appears. The Postgres `check (student_id_4 ~ '^[0-9]{4}$')` is the bottom line.
2. **Service-role key never reaches the browser.** Lives in `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix). The single file that uses it (`lib/supabase/serviceRole.ts`) starts with `import 'server-only'` so Next 16 errors at build time if anything client-side reaches it.

## Read pattern

### Server client only

```ts
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /* getAll/setAll wired to cookieStore */
      },
    },
  );
}
```

```ts
// lib/supabase/serviceRole.ts  (server-only, never imported into a client component)
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseServiceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
```

### Query helpers

`lib/queries/<entity>.ts` exports small typed async functions:

```ts
// lib/queries/events.ts
export async function getEventsByMonth(year: number, month: number) { … }
export async function getTodayEvents() { … }
export async function getUpcomingSportEvents(limit = 3) { … }
```

Pages call these directly. No repo class, no abstraction beyond "named functions next to each other."

### Caching

**No caching in Phase 3.** Pages render dynamically (one DB round-trip per page request). Reasons:

- Next 16 doesn't cache `fetch` by default; explicit opt-in via `'use cache'` + `cacheLife()` is the new pattern.
- For a prototype, "always fresh" beats "stale until revalidated" debugging.

If a specific query becomes a bottleneck during the 3c parity gate, wrap that query in `'use cache'` + tag-based revalidation. Not before.

## Write pattern

### Server Actions, co-located

Each Server Action lives next to the page that owns it, never reused across pages:

```
app/student/carelin/actions.ts       postCarelinRequest
app/admin/carelin/actions.ts         replyToCarelin, markAnswered
app/admin/pshare/actions.ts          saveDraft, publishPost, deletePost
app/admin/sport/actions.ts           editScoreboard
app/admin/calendar/actions.ts        addEvent
app/admin/admins/actions.ts          createAdmin, disableAdmin   (root-only)
app/login/actions.ts                 signIn
app/auth/signout/actions.ts          signOut
```

### Action contract

```ts
"use server";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function postCarelinRequest(
  formData: FormData,
): Promise<ActionResult> {
  // 1. parse + hand-rolled validation (4-digit ID regex, required fields)
  // 2. supabase.from('carelin_requests').insert(...)
  // 3. on PostgrestError: return { ok: false, error: '...' }
  // 4. revalidatePath('/student/carelin'); revalidatePath('/admin/carelin')
  // 5. return { ok: true }
}
```

Forms call them via `<form action={postCarelinRequest}>`. The Carelin form additionally uses `useActionState` for inline error display since it has the most validation (4-digit ID, required name+title+body).

No Zod, no `react-hook-form` (consistent with the original migration plan).

### Phase 3d minimum write set

Not every prototype button gets a Server Action in Phase 3. Minimum to ship a working write loop:

1. `signIn`, `signOut`, `createAdmin`, `disableAdmin` (auth — required for 3a)
2. `postCarelinRequest` (the only public write)
3. `replyToCarelin`, `markAnswered` (admin Carelin desk)
4. `editScoreboard` (admin sport ✎ edit score)
5. `addEvent` (admin calendar + Add Event)
6. `saveDraft`, `publishPost`, `deletePost` (admin P'share studio — heaviest single page)

Everything else (Bookings + New Booking, Portfolio + Add Project, Calendar Edit/Delete, sport_results recording, ⋯ row menus) stays as **non-functional UI** in Phase 3. Buttons exist; their handlers no-op until a later phase.

## Seeding

### TypeScript seed script

```
supabase/seed/
  index.ts               # entry — connects with service role, runs upserts in dep order
  data/                  # the existing data/*.ts files moved here at end of 3c
    home-hero.ts
    sport.ts
    bookings.ts
    pshare-posts.ts
    carelin-requests.ts
    portfolios.ts
    admin-overview.ts
    admin-calendar.ts
    admin-sport.ts
    admin-bookings.ts
    admin-portfolio.ts
    admin-carelin.ts
    types.ts
```

The script:

- Imports the typed mock arrays.
- Connects via service role (bypasses RLS).
- Truncates-then-upserts each table in dependency order (`houses`, `rooms`, then content tables, then `events`, `bookings`, …).
- Uses natural keys (slug, sort_order) for idempotency where possible.
- Reports what it did.

Run via a new `npm run seed` script that wraps `tsx supabase/seed/index.ts`. The project uses npm (no Bun in the toolchain).

### Truncation safety

- The seed script checks `process.env.SUPABASE_ALLOW_SEED === '1'` at startup and exits with a printed message if unset.
- The flag goes in `.env.local` only — **never on Vercel**.
- This ensures a stray invocation against prod becomes a no-op once admins start posting real Carelin requests.

## Dev workflow

### Env vars (`.env.local` and Vercel project settings)

| Variable                        | Source                        | Where it's read                                 |
| ------------------------------- | ----------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Settings → API       | client + server                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Settings → API       | client + server                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase Settings → API       | **server only** (`lib/supabase/serviceRole.ts`) |
| `SUPABASE_ALLOW_SEED`           | hand-set in `.env.local` only | seed script                                     |

### Supabase CLI commands

```bash
supabase login                                                # one-time
supabase link --project-ref <ref>                             # one-time
supabase db push                                              # apply new migrations
supabase gen types typescript --linked \
  > lib/supabase/database.types.ts                            # regenerate TS types
```

### Cadence per schema change

1. Write a new migration file in `supabase/migrations/`.
2. `supabase db push`.
3. `supabase gen types typescript --linked > lib/supabase/database.types.ts`.
4. Commit migration + generated types in the same commit.

### Vercel

- Set the three env vars in the Vercel project (omit `SUPABASE_ALLOW_SEED`).
- Build is unchanged — the generated `database.types.ts` is committed, so Vercel never needs the CLI.

## Risks / open issues

1. **Same Supabase project for dev and prod.** Destructive migrations affect live data. _Mitigation:_ keep migrations additive until things stabilize; back up via Supabase dashboard before any destructive change. _Future:_ split into a separate hosted prod project once it matters.
2. **Seed script can wipe real data.** Once admins start posting in prod, re-running the seed with truncate-and-insert nukes their work. _Mitigation:_ `SUPABASE_ALLOW_SEED=1` gate, set in `.env.local` only.
3. **Service-role key leakage.** If anything imports `lib/supabase/serviceRole.ts` from a `'use client'` component, RLS is bypassed in browsers. _Mitigation:_ `import 'server-only'` at the top of that file (Next 16 errors at build time if a client component reaches it).
4. **No automated tests.** Server Actions go unverified except by manual page exercise. Not blocking. A Vitest + Playwright harness against a separate test Supabase project is the natural follow-up if interactions get complex.
5. **Page latency post-3c.** "Always fresh" reads add one DB round-trip per page render. _Mitigation:_ eyeball during the 3c parity gate; selectively wrap rare-changing queries (`getRooms`, `getHouses`, `siteConfig`) in `'use cache'` + `cacheLife('hours')` only if pages feel sluggish.
6. **Password rules.** Supabase Auth defaults to a 6-char minimum. Bump to 12+ in Auth → Policies before any non-prototype use. Not blocking now.

## Out of scope

- **Realtime subscriptions** — sport scoreboard, Carelin board, etc. stay SSR-only this phase.
- **Supabase Storage** — no image/file uploads (P'share post images, profile photos) in Phase 3.
- **Self-service password change** for admins — root-set initial password is the only mechanism.
- **i18n routing** — content stays bilingual hard-coded per the original migration plan.
- **Real students roster** — Carelin form remains free-form name + ID.
- **Server Actions for all prototype buttons** — only the minimum write set listed under [Write pattern](#write-pattern).
- **A separate dev/prod Supabase project split** — single hosted project for both, until it actively bites.

## Exit criteria for Phase 3

- [ ] 3a: `/login` works; `/admin/**` redirects unauthenticated users; root admin row exists.
- [ ] 3b: Schema applied to hosted DB; generated TS types compile; seed script populates all tables idempotently.
- [ ] 3c: Every page reads from Supabase via `lib/queries/`; visual parity with Phase 2 verified; `data/*.ts` files moved to `supabase/seed/data/`.
- [ ] 3d: All actions in the [minimum write set](#phase-3d-minimum-write-set) work end-to-end and survive a refresh.
- [ ] `npm run lint` and `npm run build` pass at every sub-phase boundary.
- [ ] Each sub-phase ships as its own commit / PR.
