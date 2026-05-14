# Phase 5b — Cleanup + Hardening

**Status:** design.
**Predecessor:** Phase 5a (`docs/superpowers/specs/2026-05-12-phase-5a-features-design.md`) — shipped.
**Companion:** none — A11y polish (handoff #13) and `useActionState` UX unification (#10) are deferred to a later pass; rate-limit + race-window + cleanup is enough surface for one cycle.

## Motivation

Phase 5a closed the last user-visible feature gap. The codebase now has two practical issues worth addressing in one bundle:

1. **Anon writes are unrate-limited.** `postCarelinRequest` and `bookRoom` accept unlimited submissions per IP. The Carelin shape (`student_id_4 ~ '^[0-9]{4}$'` + hand-rolled validator) is the entire public-write security model.
2. **A small number of accreted micro-duplications** make future changes noisier than they should be: two near-identical image-upload helpers, three copies of `STATUS_OPTIONS`, two copies of `HOUSES`, three copies of `CONFIG_KEYS`/`EDITABLE_KEYS`/`VALIDATORS`, a dead `admin_greeting` site_config helper, dead booking exports, seed-side type workarounds.

5b bundles both. Theme A (hygiene) is mechanical and per-task-commit; Theme D (hardening) introduces one new migration and one new server-only module.

## In scope

| # (handoff) | Item                                        | Surface                                                                                              |
| ----------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 3           | Anon-write rate limit (5/min/IP/action)     | new `rate_limit_buckets` + `record_anon_hit()` in `0005`, new `lib/rateLimit.ts`, two action callers |
| 4           | Drop unused `admin_greeting` site_config    | `lib/queries/siteConfig.ts`, seed, any callers                                                       |
| 6           | `Btn type="submit"` backfill on 3d forms    | `app/admin/calendar/new/page.tsx`, `app/admin/admins/page.tsx`, `components/admin/PshareEditor.tsx`  |
| 9           | Booking conflict race window — DB backstop  | `bookings_no_overlap` EXCLUDE in `0005`, `23P01` catch in booking actions                            |
| 11          | Dead exports in `lib/ui/booking.ts`         | `BOOKING_ACTIVE_TAB`, `BOOKING_CONFIRM_EYEBROW`                                                      |
| 12          | Constants consolidation                     | new `lib/ui/siteConfig.ts`; grow `lib/ui/sport.ts` (HOUSES) + `lib/ui/portfolio.ts` (STATUS_OPTIONS) |
| 14          | Seed-side type cleanup                      | `supabase/seed/data/admin-portfolio.ts`, `admin-bookings.ts`                                         |
| 15          | Image upload helper consolidation           | new `lib/uploads.ts`, two action files                                                               |
| 16          | Storage delete observability                | `deletePost`, `deleteProject`                                                                        |
| 17          | RLS audit (Realtime delivery)               | spec-time verification — no code change                                                              |

## Out of scope

Handoff candidates #8 (anon-bookings `created_by_admin_id` RLS hardening — theoretical-only on prototype), #10 (anon `useActionState` success-UX unification — separate design decision), #13 (A11y + responsive polish — broad, deserves a focused pass).

## Architecture

### Rate-limit — Postgres-backed, `SECURITY DEFINER` RPC

State lives in a new `rate_limit_buckets` table keyed on `(ip, action, minute_bucket)`. A `SECURITY DEFINER` function `record_anon_hit(p_ip, p_action)` atomically upserts the bucket and returns the new hit count. Server-only `lib/rateLimit.ts` reads the client IP from the `x-forwarded-for` header (leftmost), calls the RPC via the existing cookies-authed server client, and returns `{ok: true} | {ok: false, retryAfterSeconds}`.

**Why a function, not direct INSERT?** RLS on `rate_limit_buckets` is fully closed (no policies = no access for any role). The function runs as the table owner, sidestepping RLS the same way `is_admin()` / `current_admin_id()` do in `0002_rls.sql`. The anon Supabase client can still call the function — only the function body has write access to the table.

**Fixed-minute bucket vs sliding window.** Fixed bucket means a single `INSERT ... ON CONFLICT DO UPDATE` per anon write — one RPC, atomic. The trade-off is brief jitter at minute boundaries (a user could burst up to 10 across the boundary). Acceptable for prototype scale.

**Fail-open on RPC error.** If the RPC throws or returns null, `checkAnonRateLimit` returns `{ok: true}`. Rationale: a Supabase outage should not lock out legit students. The downside (no throttling during the outage) is bounded by the outage duration.

**Cleanup policy:** none. Rows accumulate forever. ~5 rows/IP/min in worst case = trivial at prototype scale. If storage becomes an issue, add a `delete from rate_limit_buckets where bucket_start < now() - interval '1 day'` cron job later.

### Race-window — EXCLUDE-USING-GIST backstop

`findConflictingBooking` remains as the UX layer (shows the conflict before the user clicks confirm). A new Postgres `EXCLUDE` constraint backstops the SELECT-then-INSERT race. When the constraint fires, Postgres returns SQLSTATE `23P01` (`exclusion_violation`). The booking actions catch this code and surface a friendly bilingual message instead of letting Next's error boundary swallow it.

Schema check: `bookings.status` is `booking_status` enum (`Confirmed | Pending | Review`) — **no `cancelled` state**. Cancel is a hard DELETE in the existing actions. So the EXCLUDE constraint applies to **all** rows, no `WHERE (...)` clause.

**Pre-migration overlap audit.** The constraint creation will refuse if existing data already has overlaps. Run this in the Supabase SQL editor before applying `0005`:

```sql
select a.id, b.id from bookings a, bookings b
  where a.id < b.id and a.room_id = b.room_id
    and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(b.starts_at, b.ends_at, '[)');
```

If non-empty, fix the seed or delete the offending rows before applying `0005`. Likely clean on the current seed (one booking per room/period), but verify.

### Upload helper consolidation

`lib/uploads.ts` becomes the single home for image-upload concerns: `IMAGE_MIMES`, `IMAGE_MAX_BYTES = 5 * 1024 * 1024`, `extFromMime`, and `uploadAsset(formData, folder, id)`. The two action files (`app/admin/pshare/actions.ts`, `app/admin/portfolio/actions.ts`) drop their private copies and import.

Signature:

```ts
import "server-only";
export type AssetFolder = "pshare" | "portfolio";
export async function uploadAsset(
  formData: FormData,
  folder: AssetFolder,
  id: string,
): Promise<string | null>;
```

The form field name `"image"` is hardcoded (matches both existing call sites). Returns the storage path (`<folder>/<id>.<ext>`) on success or `null` if no/invalid file. Throws on Supabase storage errors (matches existing behavior).

### Constants consolidation

Three independent moves, each its own commit:

- `HOUSES` → `lib/ui/sport.ts`. Imported by `app/admin/sport/result/new/page.tsx` and `app/admin/sport/result/[id]/edit/page.tsx`.
- `STATUS_OPTIONS` + `STATUS_LABEL` → `lib/ui/portfolio.ts` (already the home of `TAG_SWATCHES`). Imported by `components/admin/PortfolioAdminTable.tsx`, `app/admin/portfolio/[id]/edit/page.tsx`, `app/admin/portfolio/new/page.tsx`.
- `CONFIG_KEYS` + `EDITABLE_KEYS` + `VALIDATORS` → new `lib/ui/siteConfig.ts`. Imported by `app/admin/config/page.tsx`, `app/admin/config/[key]/edit/page.tsx`, `app/admin/config/actions.ts`.

Each refactor is extract-and-import — no behavior changes, no duplicates left behind.

## Schema + migration

`supabase/migrations/0005_phase5b_hardening.sql`:

```sql
-- 1. Booking overlap backstop. cancel = hard DELETE in actions, so no WHERE.
create extension if not exists btree_gist;

alter table bookings add constraint bookings_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  );

-- 2. Anon rate-limit state. RLS-closed; written only via the function below.
create table rate_limit_buckets (
  ip           text not null,
  action       text not null,
  bucket_start timestamptz not null,
  hits         int not null default 1,
  primary key (ip, action, bucket_start)
);

alter table rate_limit_buckets enable row level security;
-- No policies. Anon/authenticated have no direct access.

-- 3. Increment-and-return helper. SECURITY DEFINER bypasses RLS.
create or replace function public.record_anon_hit(p_ip text, p_action text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits int;
begin
  insert into rate_limit_buckets (ip, action, bucket_start, hits)
  values (p_ip, p_action, date_trunc('minute', now()), 1)
  on conflict (ip, action, bucket_start)
  do update set hits = rate_limit_buckets.hits + 1
  returning hits into v_hits;
  return v_hits;
end;
$$;

revoke all on function public.record_anon_hit(text, text) from public;
grant execute on function public.record_anon_hit(text, text) to anon, authenticated;
```

After applying: `npm run gen:types` and commit the regenerated `lib/supabase/database.types.ts`.

## Item-by-item designs

### #3 — Rate limit wiring

New module `lib/rateLimit.ts`:

```ts
import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AnonAction = "carelin" | "booking";
const ANON_LIMIT = 5;

export async function checkAnonRateLimit(
  action: AnonAction,
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const ip = await ipFromHeaders();
  const db = await createClient();
  const { data, error } = await db.rpc("record_anon_hit", {
    p_ip: ip,
    p_action: action,
  });
  // Fail-open: an outage shouldn't lock out students.
  if (error || data == null) return { ok: true };
  if (data > ANON_LIMIT) {
    return { ok: false, retryAfterSeconds: 60 - new Date().getSeconds() };
  }
  return { ok: true };
}

async function ipFromHeaders(): Promise<string> {
  const fwd = (await headers()).get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "0.0.0.0";
}
```

Note: `headers()` is async in Next 16.

Wire at the top of `postCarelinRequest` (`app/student/carelin/actions.ts`) and `bookRoom` (`app/student/booking/actions.ts`), immediately after `"use server"`:

```ts
const limit = await checkAnonRateLimit("carelin"); // or "booking"
if (!limit.ok) {
  return {
    ok: false,
    error: "มีคำขอมากเกินไป ลองใหม่ใน 1 นาที / Too many requests, try again in a minute.",
  };
}
```

Both actions already return `ActionResult` via `useActionState`; the error renders inline through their existing error UI. No new client work.

### #4 — Drop `admin_greeting`

The only caller is `app/admin/page.tsx` (line 13 import, line 21 call). The page already fetches data via `Promise.all`; we add `requireAdmin()` to that call and derive the greeting from `admin.display_name` directly. The `admin` row is fetched once by `app/admin/layout.tsx` already (line 24); calling `requireAdmin()` again from the page is a second DB hit per render — acceptable, matches the existing pattern documented in the handoff's "open items" (admin layout + page both call `requireAdmin` already).

Steps:
1. In `app/admin/page.tsx`: import `requireAdmin` from `@/lib/auth`. Replace the `getAdminGreeting()` entry in `Promise.all` with `requireAdmin()`. Derive `greeting = { th: \`สวัสดี อาจารย์${admin.display_name}\`, en: \`Hello, ${admin.display_name}\` }` (or change `GreetingBanner` to accept `displayName` and format internally — implementer's call, no strong preference).
2. Remove `getAdminGreeting()` from `lib/queries/siteConfig.ts` (line 23–25).
3. Delete the `admin_greeting` row from the seed data (locate via grep — likely `supabase/seed/data/site-config.ts` or whichever seed file feeds `site_config`).
4. One-off SQL run note in the commit message: `delete from site_config where key = 'admin_greeting'`. Not added to a migration (`site_config` data is seed-managed; the row would repopulate if missed).

### #6 — `Btn type="submit"` backfill

`components/admin/Btn.tsx` line 26: `<button type="button" ... {...rest}>`. The spread comes after the literal, so `<Btn type="submit">` works — but the 3d-era forms don't pass it explicitly. Add `type="submit"` to the `Btn` props on:

- `app/admin/calendar/new/page.tsx` (the "Save event" button)
- `app/admin/admins/page.tsx` (the "Invite admin" button)
- `components/admin/PshareEditor.tsx` (the "Save draft" / "Publish" buttons)

Manual test: click the button (not Enter-in-input). Form must submit.

### #9 — Race-window error catch

In `app/student/booking/actions.ts` (`bookRoom`) and `app/admin/bookings/actions.ts` (`createBooking`, `updateBooking`) — wherever a `bookings` INSERT or UPDATE happens — wrap the call site to detect Postgres error code `23P01`:

```ts
const { error } = await db.from("bookings").insert(...).select();
if (error?.code === "23P01") {
  // bookRoom path (useActionState):
  return { ok: false, error: "ห้องนี้เพิ่งถูกจองไป / This room was just booked." };
  // Plain Server Action path:
  throw new Error("ห้องนี้เพิ่งถูกจองไป / This room was just booked.");
}
if (error) throw new Error(error.message);
```

The exact return shape depends on whether the action is a `useActionState` consumer (return `ActionResult`) or a plain Server Action (throw). `bookRoom` is `useActionState`; `createBooking`/`updateBooking` are plain.

### #11 — Dead booking exports

`lib/ui/booking.ts` lines 8 and 29: remove `BOOKING_ACTIVE_TAB` and `BOOKING_CONFIRM_EYEBROW`. Confirm via grep that nothing imports them (handoff already flags both as unused after Phase 4). If a stray import surfaces, that's a real bug — flag it, don't blindly add the import back.

### #12 — Constants consolidation

Three independent commits.

**#12a — `lib/ui/siteConfig.ts`:** Extract the inline `CONFIG_KEYS`, `EDITABLE_KEYS`, and `VALIDATORS` arrays from `app/admin/config/page.tsx`, `app/admin/config/[key]/edit/page.tsx`, and `app/admin/config/actions.ts`. The new module is the single source of truth.

**#12b — `HOUSES` → `lib/ui/sport.ts`:** Extract from `app/admin/sport/result/new/page.tsx` and `app/admin/sport/result/[id]/edit/page.tsx`.

**#12c — `STATUS_OPTIONS` / `STATUS_LABEL` → `lib/ui/portfolio.ts`:** Already hosts `TAG_SWATCHES` and `normalizeTags`. Extract from `components/admin/PortfolioAdminTable.tsx` (which is the current STATUS_LABEL home per handoff), `app/admin/portfolio/[id]/edit/page.tsx`, and `app/admin/portfolio/new/page.tsx`. Note: `app/admin/portfolio/actions.ts` line 9 has a local `PROJECT_STATUSES` tuple used only for runtime validation (`isProjectStatus`); leave that alone — it serves a different purpose (action-input validation, not UI rendering).

### #14 — Seed-side type cleanup

`supabase/seed/data/admin-portfolio.ts` uses `PortfolioSeedRow = Omit<PortfolioAdminRow, "id">` plus stub `id: "seed-N"` strings. `supabase/seed/data/admin-bookings.ts` has similar `id: "seed-N"` placeholders.

The clean fix: change the seed-side row type to drop the `id` requirement directly (a separate type alias for seed-stage data), so the stubs are gone. The seed script generates real UUIDs at insert time via `gen_random_uuid()` defaults, so the placeholder IDs were never read.

Acceptable alternative: if the dead-array claim holds (handoff: "or delete the dead arrays"), drop the unused arrays entirely. Verify which by grepping for the array name in `supabase/seed/*.ts`.

### #15 — Upload consolidation

New `lib/uploads.ts`:

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export type AssetFolder = "pshare" | "portfolio";

export function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "";
}

export async function uploadAsset(
  formData: FormData,
  folder: AssetFolder,
  id: string,
): Promise<string | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_MIMES.has(file.type)) return null;
  if (file.size > IMAGE_MAX_BYTES) return null;

  const ext = extFromMime(file.type);
  const path = `${folder}/${id}.${ext}`;
  const db = await createClient();
  const { error } = await db.storage
    .from("assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`${folder} upload: ${error.message}`);
  return path;
}
```

Remove the private `IMAGE_MIMES`, `IMAGE_MAX_BYTES`, `extFromMime`, `uploadPshareImage`, `uploadProjectImage` from `app/admin/pshare/actions.ts` and `app/admin/portfolio/actions.ts`. Update call sites to `await uploadAsset(formData, "pshare", rowId)` / `await uploadAsset(formData, "portfolio", id)`.

### #16 — Storage delete observability

In `deletePost` (`app/admin/pshare/actions.ts`) and `deleteProject` (`app/admin/portfolio/actions.ts`), capture the error from `storage.remove()` and emit a structured log line on failure:

```ts
if (row?.art_image_path) {
  const { error: storageErr } = await db.storage
    .from("assets")
    .remove([row.art_image_path]);
  if (storageErr) {
    console.error(
      "storage delete failed",
      { surface: "pshare", path: row.art_image_path, error: storageErr.message },
    );
  }
}
```

Row is already deleted at this point; orphan storage object remains. Logging surfaces growth without changing failure behavior.

### #17 — RLS audit (spec-time only)

Confirmed from `supabase/migrations/0002_rls.sql`:

- **`carelin_requests`**: `carelin_requests_select_all` — `for select to anon, authenticated using (true)` (line 134–135). Admins (authenticated) receive all Realtime events. ✓
- **`bookings`**: `bookings_select_all` — `for select to anon, authenticated using (true)` (line 100–101). Admins receive all Realtime events. ✓

Both tables are publicly readable, so the admin Realtime subscriptions in `/admin/carelin` and `/admin/bookings` receive every `postgres_changes` event for their tables. No RLS-side change needed.

## Execution order

Migration first (gates everything that depends on regenerated types and `23P01` semantics). Then the two new modules, then independent refactors in any order. ~12 commits on `main`.

| #   | Commit                                                                | Item    | Depends on |
| --- | --------------------------------------------------------------------- | ------- | ---------- |
| 1   | `add: 0005 — rate_limit_buckets, record_anon_hit(), bookings_no_overlap` | #3+#9 schema | —          |
| 2   | `add: lib/rateLimit.ts + throttle anon writes (5/min)`                | #3      | 1          |
| 3   | `fix: surface 23P01 as friendly conflict message in booking actions`  | #9      | 1          |
| 4   | `refactor: consolidate image upload into lib/uploads.ts`              | #15     | —          |
| 5   | `refactor: extract config keys/validators to lib/ui/siteConfig.ts`    | #12a    | —          |
| 6   | `refactor: extract HOUSES to lib/ui/sport.ts`                         | #12b    | —          |
| 7   | `refactor: consolidate STATUS_OPTIONS in lib/ui/portfolio.ts`         | #12c    | —          |
| 8   | `chore: drop unused admin_greeting site_config + helper`              | #4      | —          |
| 9   | `fix: explicit type="submit" on 3d-era admin forms`                   | #6      | —          |
| 10  | `chore: drop dead exports in lib/ui/booking.ts`                       | #11     | —          |
| 11  | `refactor: simplify seed-side portfolio/bookings types`               | #14     | —          |
| 12  | `chore: log storage delete failures`                                  | #16     | —          |

Tasks 4–12 are independent and could be reordered freely; the table order matches dependency-then-impact (refactors that touch more files first).

## Exit criteria (Phase 5a-style manual walkthrough)

Two-tab incognito + main browser. The "private window" is the anon-write surface; the admin browser is for verification.

1. **Pre-migration audit.** Run the overlap query in Supabase SQL editor. Empty result before applying `0005`. If non-empty, fix data first.
2. **Migration applied.** `0005_phase5b_hardening.sql` runs without error. `npm run gen:types` updates `database.types.ts` (commit the diff).
3. **Rate limit — Carelin.** From a private window, submit 6 valid Carelin requests in <60s. First 5 succeed (visible at `/admin/carelin`). 6th returns the bilingual error inline. Wait into the next minute → next submission succeeds.
4. **Rate limit — booking.** From the same private window, submit 6 booking requests (vary room or period to bypass conflict pre-check) in <60s. 6th rejects inline.
5. **Rate limit — fail-open sanity.** Submit one normal Carelin request. Success path runs (the RPC succeeded, returned 1; passes the limit check). No regression.
6. **Race window — backstop.** Two tabs racing the same room+period: both pre-checks pass, one INSERT wins, the loser sees the bilingual "just booked" message (the `23P01` catch). Verify no Next error boundary.
7. **Storage delete logging.** Delete a pshare post via `/admin/pshare`; storage object should disappear silently from `assets/pshare/`. Then in Supabase Dashboard, manually delete a project's `assets/portfolio/<id>.<ext>` file, then delete the project via the UI — a `console.error("storage delete failed", ...)` appears in the `next dev` console (or Vercel logs).
8. **Refactor regression smoke.**
   - `/admin/config` index + `[key]/edit` still render. Edit a value and save → success (CONFIG_KEYS extract).
   - `/admin/sport/result/new` + `[id]/edit` still render. Save a new result → success (HOUSES extract).
   - `/admin/portfolio` index + `[id]/edit` + `new` all render. Save Draft/Published/Under Review across all three pages → labels match (STATUS_OPTIONS consolidation).
   - `/admin/pshare/new` upload an image → renders at `/student/pshare/<slug>` (uploads consolidation).
   - `/admin/portfolio/new` upload a thumbnail → renders in the admin row (uploads consolidation).
9. **`Btn` backfill.** Click "Save" (not Enter-in-input) on `/admin/calendar/new`, `/admin/admins`, and PshareEditor. Each form submits.
10. **Dead exports gone.** `npm run build` is clean. Grep for `BOOKING_ACTIVE_TAB`, `BOOKING_CONFIRM_EYEBROW`, `getAdminGreeting`, `uploadPshareImage`, `uploadProjectImage` — zero matches.
11. **Phase 5a regression smoke.** Rerun the 5a sign-off checklist (Realtime on 3 pages, Storage uploads on 2 editors, tag editor, portfolio create) to confirm nothing broke under the upload-helper consolidation.

## Decisions log

- **Rate-limit storage: Postgres, not Upstash.** Trade-off: in-stack, no new vendor or env var, but adds 1 RPC per anon write. For the scale of a school prototype (low traffic), the RPC cost is invisible and the operational simplicity wins.
- **Rate-limit fail-open, not fail-closed.** A Supabase outage shouldn't block legit students. The brief no-throttling window during an outage is bounded by the outage.
- **Rate-limit bucket cleanup: none.** ~5 rows/IP/min is trivial. Add cron later if it matters.
- **Race-window: keep `findConflictingBooking` as UX layer.** The pre-check shows the conflict before the user clicks confirm — much better UX than a post-submit error. The constraint is the integrity backstop for the race window only.
- **EXCLUDE constraint has no `WHERE` clause.** `bookings.status` lacks a `cancelled` value; cancel is a hard DELETE in the existing actions. All rows participate in the exclusion.
- **`lib/uploads.ts` signature.** Form field name `"image"` hardcoded — both existing call sites use it. Folder hardcoded to `"pshare" | "portfolio"` — adding a folder is an explicit type change, which is the right tradeoff (catches typos at compile time).
- **`PROJECT_STATUSES` runtime tuple in `portfolio/actions.ts` stays local.** It serves runtime validation (`isProjectStatus`), not UI rendering. `STATUS_OPTIONS` / `STATUS_LABEL` are UI-only and move; the runtime tuple stays where it's used.
- **No A11y polish, no `useActionState` UX unification in 5b.** Both deserve focused passes with design judgment. Phase 5b is mechanical cleanup + targeted hardening.
- **Per-task commits on `main`, no PR.** Same cadence as Phase 4 and 5a. Each item is small enough to be a single coherent commit.

## Don't (carryover from Phase 5a)

- Don't recreate `middleware.ts` (`proxy.ts` is the Next 16 convention).
- Don't import `lib/supabase/serviceRole.ts` from anything client-side. (5b doesn't add a new service-role caller — rate-limit uses the regular cookies-authed client + `SECURITY DEFINER` function.)
- Don't add `'use cache'` / `cacheLife()`.
- Don't add caching, `zod`, `react-hook-form`, or any new client-state library.
- Don't open a new anon-write surface. The two existing (`postCarelinRequest`, `bookRoom`) are both gated by the rate limit in this phase; widening the surface is out of scope.
- Don't break the Carelin anon-write contract — `student_id_4 ~ '^[0-9]{4}$'` + hand-rolled validator is the entire public-write security model. The rate limit layers on top, doesn't replace it.
