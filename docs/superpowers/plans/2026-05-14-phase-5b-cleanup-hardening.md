# Phase 5b Implementation Plan — Cleanup + Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 5b — Postgres-backed rate limit on anon writes (5/min/IP/action), `EXCLUDE` constraint as a race-window backstop on `bookings`, plus the cleanup/consolidation cluster from the handoff (#4, #6, #11, #12, #14, #15, #16).

**Architecture:** Spec at `docs/superpowers/specs/2026-05-14-phase-5b-cleanup-hardening-design.md`. One new migration (`0005`) introduces `rate_limit_buckets` + `record_anon_hit()` (SECURITY DEFINER) + `bookings_no_overlap` (EXCLUDE USING gist). Two new server-only modules: `lib/rateLimit.ts` wires the limiter into the two `useActionState` anon-write actions; `lib/uploads.ts` collapses the two near-identical image-upload helpers. One new UI-config module: `lib/ui/siteConfig.ts`. Existing modules grow: `lib/ui/sport.ts` (HOUSES), `lib/ui/portfolio.ts` (STATUS_OPTIONS/LABEL).

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Supabase (Postgres + Realtime + Storage already in use; new `btree_gist` extension), TypeScript.

**Testing note:** The repo has no automated test runner — verification is per-task manual smoke in the browser + a full exit-criteria walkthrough at the end (see "Final Verification" at the bottom). Adding a test runner is out of scope per the spec.

**Branch policy:** Each task lands as one commit on `main` after manual smoke. No PR per task — same cadence as Phase 4 and 5a.

**Spec correction noted during planning:** The spec said the `Btn type="submit"` fix touches three files including `components/admin/PshareEditor.tsx`. On read, `PshareEditor.tsx` already uses native `<button type="submit" formAction={...}>` (lines 206-220). The real scope is two files (`app/admin/calendar/new/page.tsx`, `app/admin/admins/page.tsx`) and three `<Btn>` call sites. Plan reflects this.

**Spec correction noted during planning:** The spec routed all `HOUSES` consolidation to `lib/ui/sport.ts`. On grep, there are two distinct `HOUSES` arrays sharing a name:

- `app/admin/config/{actions.ts:48,[key]/edit/page.tsx:35}` — simple string tuple `["green","purple","orange","pink"]` used for config validation.
- `app/admin/sport/result/{new/page.tsx:12,[id]/edit/page.tsx:14}` — object array for the sport result form.

These move to **different** homes: the config one into `lib/ui/siteConfig.ts` (alongside CONFIG_KEYS etc., Task 5), the sport one into `lib/ui/sport.ts` (Task 6).

---

## File structure summary

**New files (3):**

- `supabase/migrations/0005_phase5b_hardening.sql` — `btree_gist`, EXCLUDE constraint, `rate_limit_buckets`, `record_anon_hit()`.
- `lib/rateLimit.ts` — `checkAnonRateLimit(action)` server-only helper.
- `lib/uploads.ts` — `uploadAsset(formData, folder, id)`, `IMAGE_MIMES`, `IMAGE_MAX_BYTES`, `extFromMime`.
- `lib/ui/siteConfig.ts` — `EDITABLE_KEYS`, `isEditableKey`, `KEY_LABELS`, `HOUSE_KEYS`, `isHouse`, `KPI_KINDS`.

**Modified files (~16):**

- `lib/supabase/database.types.ts` — regenerated after the migration.
- `app/student/carelin/actions.ts`, `app/student/booking/actions.ts` — rate-limit wiring.
- `app/admin/bookings/actions.ts` — `23P01` catch (both `createBooking` + `updateBooking`).
- `app/admin/pshare/actions.ts`, `app/admin/portfolio/actions.ts` — drop private upload helpers, import from `lib/uploads.ts`; add storage-delete logging.
- `app/admin/config/page.tsx`, `app/admin/config/[key]/edit/page.tsx`, `app/admin/config/actions.ts` — import consolidated constants from `lib/ui/siteConfig.ts`.
- `lib/ui/sport.ts` — add `HOUSES` export; `app/admin/sport/result/new/page.tsx`, `app/admin/sport/result/[id]/edit/page.tsx` — import.
- `lib/ui/portfolio.ts` — add `STATUS_OPTIONS` + `STATUS_LABEL`; `components/admin/PortfolioAdminTable.tsx`, `app/admin/portfolio/[id]/edit/page.tsx`, `app/admin/portfolio/new/page.tsx` — import.
- `lib/queries/siteConfig.ts` — drop `getAdminGreeting`; `app/admin/page.tsx` — derive greeting from `requireAdmin()`; `supabase/seed/siteConfig.ts` — drop the `admin_greeting` row; `supabase/seed/data/admin-overview.ts` — drop the `ADMIN_GREETING` export.
- `app/admin/calendar/new/page.tsx`, `app/admin/admins/page.tsx` — explicit `type="submit"` on `<Btn>`.
- `lib/ui/booking.ts` — remove `BOOKING_ACTIVE_TAB`, `BOOKING_CONFIRM_EYEBROW`.
- `supabase/seed/data/admin-portfolio.ts`, `supabase/seed/data/admin-bookings.ts` — simplify seed-side types (Task 11 has the decision tree).

---

## Task 1 — Migration + database types

**Files:**

- Create: `supabase/migrations/0005_phase5b_hardening.sql`
- Modify (regenerated): `lib/supabase/database.types.ts`

**Why this is first:** The rate-limit module (Task 2) calls the new RPC; the booking error-catch (Task 3) depends on the EXCLUDE constraint existing. Both need regenerated types.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_phase5b_hardening.sql` exactly as below.

```sql
-- 0005_phase5b_hardening.sql
-- Phase 5b — booking overlap backstop + anon-write rate limit.

-- 1. Booking overlap backstop.
--    `bookings.status` has no `cancelled` value; cancel = hard DELETE in actions.
--    So the constraint applies to ALL rows — no WHERE clause.
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

- [ ] **Step 2: Pre-migration overlap audit**

Before applying, ensure existing `bookings` data won't trip the new constraint. In Supabase SQL editor, run:

```sql
select a.id, b.id from bookings a, bookings b
  where a.id < b.id
    and a.room_id = b.room_id
    and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(b.starts_at, b.ends_at, '[)');
```

Expected: empty result set. If non-empty, stop and ask the user how to resolve (delete the offending rows, fix the seed, or pick one to keep) before applying `0005`.

- [ ] **Step 3: Apply the migration to the linked Supabase project**

This is destructive on the remote project. **Confirm with the user before running.**

Run: `npx supabase db push`

Expected: migration applied without errors. If `btree_gist` is already enabled or the extension creation fails, the `create extension if not exists` clause is idempotent.

- [ ] **Step 4: Regenerate database types**

Run: `npm run gen:types`

Expected: `lib/supabase/database.types.ts` rewritten. New `rate_limit_buckets` row appears in `Database["public"]["Tables"]` and `record_anon_hit` appears in `Database["public"]["Functions"]`.

- [ ] **Step 5: Verify the migration via grep**

Run: `grep -n "rate_limit_buckets\|record_anon_hit" lib/supabase/database.types.ts | head`

Expected: at least 4 matches (Row/Insert/Update for the table, plus the function entry).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0005_phase5b_hardening.sql lib/supabase/database.types.ts
git commit -m "add: 0005 — rate_limit_buckets, record_anon_hit(), bookings_no_overlap"
```

---

## Task 2 — Rate-limit module + wire into anon writes

**Files:**

- Create: `lib/rateLimit.ts`
- Modify: `app/student/carelin/actions.ts`, `app/student/booking/actions.ts`

- [ ] **Step 1: Write `lib/rateLimit.ts`**

Create `lib/rateLimit.ts`:

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
  // Fail-open: a Supabase outage shouldn't lock out legit students.
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

- [ ] **Step 2: Wire into `postCarelinRequest`**

In `app/student/carelin/actions.ts`, add the import at the top of the imports block:

```ts
import { checkAnonRateLimit } from "@/lib/rateLimit";
```

Then add the limit check as the **first** line of the function body (before the `formData.get` calls):

```ts
export async function postCarelinRequest(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const limit = await checkAnonRateLimit("carelin");
  if (!limit.ok) {
    return {
      ok: false,
      error: "มีคำขอมากเกินไป ลองใหม่ใน 1 นาที / Too many requests, try again in a minute.",
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  // ... rest unchanged
```

- [ ] **Step 3: Wire into `bookRoom`**

In `app/student/booking/actions.ts`, add the same import:

```ts
import { checkAnonRateLimit } from "@/lib/rateLimit";
```

Then add the limit check as the first line of the function body:

```ts
export async function bookRoom(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const limit = await checkAnonRateLimit("booking");
  if (!limit.ok) {
    return {
      ok: false,
      error: "มีคำขอมากเกินไป ลองใหม่ใน 1 นาที / Too many requests, try again in a minute.",
    };
  }

  const room_id = String(formData.get("room") ?? "").trim();
  // ... rest unchanged
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`

Expected: clean. If `record_anon_hit` isn't recognized as a valid RPC name, Task 1 Step 4 didn't regenerate types correctly — rerun `npm run gen:types`.

- [ ] **Step 5: Manual smoke**

Start dev server: `npm run dev`. In a private/incognito window (so the rate-limit IP starts fresh):

1. Visit `/student/carelin/new` and submit 5 valid Carelin requests as fast as you can click. All five should succeed and redirect back to `/student/carelin`.
2. Submit a 6th in the same minute. The inline error UI should show "มีคำขอมากเกินไป ลองใหม่ใน 1 นาที / Too many requests, try again in a minute." — no redirect, no DB row created.
3. Wait into the next minute; submit one more. Succeeds.

Repeat the same flow against `/student/booking` (vary room or period each time so the conflict pre-check doesn't intervene). 6th submission rejects inline.

- [ ] **Step 6: Commit**

```bash
git add lib/rateLimit.ts app/student/carelin/actions.ts app/student/booking/actions.ts
git commit -m "add: lib/rateLimit.ts + throttle anon writes (5/min)"
```

---

## Task 3 — Surface `23P01` as a friendly conflict message

**Files:**

- Modify: `app/student/booking/actions.ts`, `app/admin/bookings/actions.ts`

**Why this exists:** `findConflictingBooking` is a SELECT-then-INSERT pre-check with a small race window. Phase 5b adds the `bookings_no_overlap` EXCLUDE constraint as a backstop. When a race wins, the constraint fires with SQLSTATE `23P01` — without this task, that surfaces as a generic 500 in Next's error boundary.

Catch points:

- `bookRoom` (student, `useActionState`) — return `{ ok: false, error: ... }`.
- `createBooking` (admin, plain Server Action) — throw with a friendlier message instead of `error.message`.
- `updateBooking` (admin, plain Server Action) — same.

- [ ] **Step 1: Update `bookRoom`**

In `app/student/booking/actions.ts`, replace the existing `if (error) return { ok: false, error: error.message };` block (around line 59) with:

```ts
if (error) {
  if (error.code === "23P01") {
    return {
      ok: false,
      error:
        "ห้องนี้เพิ่งถูกจองไป / This room was just booked. Please pick another slot.",
    };
  }
  return { ok: false, error: error.message };
}
```

- [ ] **Step 2: Update `createBooking`**

In `app/admin/bookings/actions.ts`, replace `if (error) throw new Error(error.message);` (around line 71) with:

```ts
if (error) {
  if (error.code === "23P01") {
    throw new Error("This room was just booked for that period.");
  }
  throw new Error(error.message);
}
```

- [ ] **Step 3: Update `updateBooking`**

In `app/admin/bookings/actions.ts`, replace the equivalent `if (error) throw new Error(error.message);` inside `updateBooking` (around line 119) with the same block as Step 2.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`. Expected: clean. The Supabase error object's `code` field is `string | undefined`; the equality check narrows correctly without a cast.

- [ ] **Step 5: Manual smoke — backstop fires correctly**

Hardest exit criterion to reproduce by hand. Two-tab strategy:

1. In **tab A** (private window), open `/student/booking`. Select Music Room 1, today's date, Morning period. Fill the form but **don't click Confirm yet**.
2. In **tab B** (logged in as admin), at `/admin/bookings/new`, manually create a booking for the same room + same time range. Save.
3. In tab A, click Confirm. The pre-check should still pass (it ran when the form rendered, before tab B's INSERT). The INSERT fires and the constraint rejects it. Tab A shows: "ห้องนี้เพิ่งถูกจองไป / This room was just booked. Please pick another slot." — not a Next error boundary.

If reproducing the race is too fiddly, an alternative test is to temporarily comment out the `findConflictingBooking` pre-check in `bookRoom`, try to book a slot that's already booked, verify the friendly error fires, then re-enable the pre-check before committing.

- [ ] **Step 6: Commit**

```bash
git add app/student/booking/actions.ts app/admin/bookings/actions.ts
git commit -m "fix: surface 23P01 as friendly conflict message in booking actions"
```

---

## Task 4 — Consolidate image upload into `lib/uploads.ts`

**Files:**

- Create: `lib/uploads.ts`
- Modify: `app/admin/pshare/actions.ts`, `app/admin/portfolio/actions.ts`

- [ ] **Step 1: Write `lib/uploads.ts`**

Create `lib/uploads.ts`:

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

- [ ] **Step 2: Replace pshare's private helpers**

In `app/admin/pshare/actions.ts`:

1. Add the import at the top: `import { uploadAsset } from "@/lib/uploads";`
2. Delete lines 8–35 (`IMAGE_MIMES`, `IMAGE_MAX_BYTES`, `extFromMime`, `uploadPshareImage` definitions).
3. In `saveDraft` (around line 123), replace `await uploadPshareImage(formData, rowId)` with `await uploadAsset(formData, "pshare", rowId)`.
4. In `publishPost` (around line 172), do the same replacement.

- [ ] **Step 3: Replace portfolio's private helpers**

In `app/admin/portfolio/actions.ts`:

1. Add the import at the top: `import { uploadAsset } from "@/lib/uploads";`
2. Delete lines 16–43 (`IMAGE_MIMES`, `IMAGE_MAX_BYTES`, `extFromMime`, `uploadProjectImage`).
3. In `createProject` (around line 132), replace `await uploadProjectImage(formData, data.id)` with `await uploadAsset(formData, "portfolio", data.id)`.
4. In `updateProject` (around line 157), replace `await uploadProjectImage(formData, id)` with `await uploadAsset(formData, "portfolio", id)`.

- [ ] **Step 4: Verify nothing imports the deleted helpers**

Run: `grep -rn "uploadPshareImage\|uploadProjectImage" app/ components/ lib/ 2>&1`

Expected: zero matches. If any match, that's a real call site that the refactor missed — fix before continuing.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`. Expected: clean.

- [ ] **Step 6: Manual smoke**

1. `/admin/pshare/new` — fill the form, upload an image, click Publish. Visit `/student/pshare/<slug>` — header image renders.
2. `/admin/portfolio/new` — fill the form, upload a thumbnail, status=Draft, save. `/admin/portfolio` row shows the thumb. Repeat with status=Published — `/student/portfolio` shows it.
3. Edit either an existing pshare post or portfolio project, upload a different image, save. The replacement should appear (path is deterministic by id + ext, so it overwrites via upsert).

- [ ] **Step 7: Commit**

```bash
git add lib/uploads.ts app/admin/pshare/actions.ts app/admin/portfolio/actions.ts
git commit -m "refactor: consolidate image upload into lib/uploads.ts"
```

---

## Task 5 — Extract config keys/validators to `lib/ui/siteConfig.ts`

**Files:**

- Create: `lib/ui/siteConfig.ts`
- Modify: `app/admin/config/page.tsx`, `app/admin/config/[key]/edit/page.tsx`, `app/admin/config/actions.ts`

The three files duplicate four things:

- The editable-key list (as a `KeyRow[]` with labels in `page.tsx:11`, as a `string[] as const` in `actions.ts:10`, and as a `Set<string>` in `[key]/edit/page.tsx:10` with parallel `KEY_LABELS` in `:19`).
- An `isEditableKey` type guard (only in `actions.ts:21`).
- A `House` validator: `["green","purple","orange","pink"]` in `actions.ts:48` and `[key]/edit/page.tsx:35` (distinct from the sport `HOUSES` array — that's Task 6).
- A `KPI_KINDS = ["up","down","flat"] as const` tuple in both `actions.ts:49` and `[key]/edit/page.tsx:36`.

- [ ] **Step 1: Write `lib/ui/siteConfig.ts`**

Create `lib/ui/siteConfig.ts`:

```ts
import type { House } from "@/lib/types";

export const EDITABLE_KEYS = [
  "home_hero",
  "overview_kpis",
  "trend_chart",
  "portfolio_stats",
  "portfolio_kpis",
  "carelin_kpis",
] as const;

export type EditableKey = (typeof EDITABLE_KEYS)[number];

export function isEditableKey(k: string): k is EditableKey {
  return (EDITABLE_KEYS as readonly string[]).includes(k);
}

export const KEY_LABELS: Record<EditableKey, { en: string; th: string }> = {
  home_hero: { en: "Home hero", th: "หน้าจอแรกของนักเรียน" },
  overview_kpis: { en: "Overview KPIs", th: "ตัวเลขสรุปหน้าหลัก" },
  trend_chart: { en: "Trend chart", th: "กราฟแนวโน้ม" },
  portfolio_stats: { en: "Portfolio stats", th: "ตัวเลขโครงงาน · นักเรียน" },
  portfolio_kpis: { en: "Portfolio KPIs", th: "ตัวเลขโครงงาน · ครู" },
  carelin_kpis: { en: "Carelin KPIs", th: "ตัวเลขพี่แคร์ลิน · ครู" },
};

export const HOUSE_KEYS: readonly House[] = [
  "green",
  "purple",
  "orange",
  "pink",
];

export function isHouse(v: string): v is House {
  return (HOUSE_KEYS as readonly string[]).includes(v);
}

export const KPI_KINDS = ["up", "down", "flat"] as const;
export type KpiKind = (typeof KPI_KINDS)[number];
```

- [ ] **Step 2: Update `app/admin/config/page.tsx`**

Read the current content if needed (`sed -n '1,55p' app/admin/config/page.tsx`). Rewrite to derive the table from the consolidated symbols. The full new file:

```tsx
import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";
import { EDITABLE_KEYS, KEY_LABELS } from "@/lib/ui/siteConfig";

export default async function AdminConfigIndex() {
  return (
    <>
      <AdminTopbar titleTh="คอนฟิก" eyebrow="Site config" />

      <Card>
        <CardTitle th="คอนฟิกทั้งหมด" en="All keys" />
        <ul className="divide-mute-200 divide-y divide-dashed">
          {EDITABLE_KEYS.map((k) => (
            <li key={k} className="flex items-center justify-between px-3 py-3">
              <div>
                <div className="font-display text-[15px] italic">
                  {KEY_LABELS[k].en}
                </div>
                <div className="text-mute-500 font-mono text-[11px]">
                  {k} · {KEY_LABELS[k].th}
                </div>
              </div>
              <Link
                href={`/admin/config/${k}/edit`}
                className="border-line bg-paper text-mute-700 hover:bg-cream border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
              >
                Edit →
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
```

The local `KeyRow` type and `KEYS` array are gone.

- [ ] **Step 3: Update `app/admin/config/[key]/edit/page.tsx`**

Replace lines 10–36 (the `VALID` set, `KEY_LABELS` record, `HOUSES` tuple, and `KPI_KINDS` tuple) with imports + a small `notFound` check that uses the type guard. Specifically:

1. Update the import block to add:

```ts
import {
  isEditableKey,
  KEY_LABELS,
  HOUSE_KEYS,
  KPI_KINDS,
} from "@/lib/ui/siteConfig";
```

2. Delete `const VALID = new Set([...]);` (line 10–17), the inline `KEY_LABELS` record (line 19–26), `const HOUSES: readonly House[] = [...]` (line 35), and `const KPI_KINDS = [...] as const;` (line 36).
3. The `INPUT_CLS`, `INPUT_MONO`, `LABEL_CLS` constants on lines 28–33 stay (they're styling utilities specific to this file).
4. Change `if (!VALID.has(key)) notFound();` (line 44) to `if (!isEditableKey(key)) notFound();`.
5. Inside `HomeHeroFields`, change `{HOUSES.map((h) => ...)}` (line 139) to `{HOUSE_KEYS.map((h) => ...)}`.
6. The two `KPI_KINDS.map(...)` references stay; the imported name matches.
7. The `KEY_LABELS[key]` lookup (line 45) now uses the imported record; the access pattern is unchanged. Note: after `isEditableKey(key)` narrows `key` to `EditableKey`, the `KEY_LABELS[key]` access is now type-safe (was `Record<string, ...>` before — same value, tighter type).

- [ ] **Step 4: Update `app/admin/config/actions.ts`**

1. Update the import block to add:

```ts
import {
  EDITABLE_KEYS,
  isEditableKey,
  HOUSE_KEYS,
  KPI_KINDS,
  type EditableKey,
} from "@/lib/ui/siteConfig";
```

2. Delete the inline `EDITABLE_KEYS` (line 10–17), `type EditableKey` (line 19), `isEditableKey` function (line 21–23), `HOUSES` (line 48), and `KPI_KINDS` (line 49).
3. In `parseHomeHero` line 69, change `(HOUSES as readonly string[]).includes(houseRaw)` to `(HOUSE_KEYS as readonly string[]).includes(houseRaw)`. (Or even cleaner: replace with `isHouse(houseRaw)` from the new module, but the current call-site form is also fine.)
4. The `KPI_KINDS` references in `parseKpiArray` (lines 102–105) stay unchanged.
5. `revalidateFor(key: EditableKey)` (line 25) — the parameter type still resolves correctly since `EditableKey` is now imported.

- [ ] **Step 5: Verify no inline duplicates remain**

Run:

```bash
grep -rn "EDITABLE_KEYS\|VALID = new Set\|HOUSES:\|KPI_KINDS = " app/admin/config 2>&1
```

Expected: only `EDITABLE_KEYS` from imports — no `VALID`, no inline `HOUSES:`, no inline `KPI_KINDS = `. (The string `EDITABLE_KEYS` will appear in the import lines and usages, which is correct.)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`. Expected: clean.

- [ ] **Step 7: Manual smoke**

1. Visit `/admin/config`. The 6 keys render with EN/TH labels. Each `Edit →` link goes to the right URL.
2. Visit `/admin/config/home_hero/edit`. Form renders. The house dropdown (Leading · house) shows green/purple/orange/pink. Save a small change. Success.
3. Visit `/admin/config/overview_kpis/edit`. The KPI delta-kind dropdown shows up/down/flat for each of the 4 KPIs. Save a small change. Success.
4. Visit `/admin/config/unknown_key/edit`. Returns 404 (the `isEditableKey` check fires).

- [ ] **Step 8: Commit**

```bash
git add lib/ui/siteConfig.ts app/admin/config/page.tsx app/admin/config/[key]/edit/page.tsx app/admin/config/actions.ts
git commit -m "refactor: extract config keys/validators to lib/ui/siteConfig.ts"
```

---

## Task 6 — Extract HOUSES to `lib/ui/sport.ts`

**Files:**

- Modify: `lib/ui/sport.ts`, `app/admin/sport/result/new/page.tsx`, `app/admin/sport/result/[id]/edit/page.tsx`

Both sport-result pages have an identical `HOUSES = [{ value, label }, ...]` array (4 entries, bilingual labels). This is a different shape from the config-side `HOUSE_KEYS` (a `House[]` of string ids) — that's why they live in different modules.

- [ ] **Step 1: Add the export to `lib/ui/sport.ts`**

Open `lib/ui/sport.ts` and append:

```ts
export const HOUSES = [
  { value: "1", label: "Green · เขียว" },
  { value: "2", label: "Purple · ม่วง" },
  { value: "3", label: "Orange · ส้ม" },
  { value: "4", label: "Pink · ชมพู" },
] as const;
```

(`SPORT_HERO` already exists in this file as `as const`; HOUSES follows the same pattern.)

- [ ] **Step 2: Replace inline copy in `app/admin/sport/result/new/page.tsx`**

Add to the existing imports block:

```ts
import { HOUSES } from "@/lib/ui/sport";
```

Delete the inline `const HOUSES = [...];` (lines 12–17). The `HOUSES.map(...)` reference around line 114 doesn't need to change — same symbol name.

- [ ] **Step 3: Replace inline copy in `app/admin/sport/result/[id]/edit/page.tsx`**

Same change: add the import, delete the inline `const HOUSES = [...];` (lines 14–19).

- [ ] **Step 4: Verify no duplicates remain**

Run: `grep -rn "const HOUSES = \[" app/ components/ lib/ 2>&1`

Expected: a single match — `lib/ui/sport.ts`. The config-side `HOUSE_KEYS` in `lib/ui/siteConfig.ts` is a different symbol, not a duplicate.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`. Expected: clean.

- [ ] **Step 6: Manual smoke**

1. `/admin/sport/result/new` — house dropdown shows all 4 houses with bilingual labels (Green · เขียว, etc.). Submit a new result. Success.
2. `/admin/sport/result/[id]/edit` on an existing result — same dropdown. Save. Success.

- [ ] **Step 7: Commit**

```bash
git add lib/ui/sport.ts app/admin/sport/result/new/page.tsx app/admin/sport/result/[id]/edit/page.tsx
git commit -m "refactor: extract HOUSES to lib/ui/sport.ts"
```

---

## Task 7 — Consolidate portfolio status constants in `lib/ui/portfolio.ts`

**Files:**

- Modify: `lib/ui/portfolio.ts`, `components/admin/PortfolioAdminTable.tsx`, `app/admin/portfolio/[id]/edit/page.tsx`, `app/admin/portfolio/new/page.tsx`

Three duplicates today, **two different shapes**:

- `PortfolioAdminTable.tsx` (lines 18–28): `STATUS_LABEL: Record<status, string>` (plain English) + `STATUS_OPTIONS: status[]` (plain string array) — used for the row pill + the multi-submit-status form.
- `app/admin/portfolio/new/page.tsx` (lines 8–12) and `[id]/edit/page.tsx` (lines 13–17): `STATUS_OPTIONS: { value, label }[]` (bilingual `· ฉบับร่าง` etc.) — used for the `<select>` dropdown. Note: the `new` page orders Draft first; the `[id]/edit` page orders Published first. Plan consolidates to the canonical tuple order (Published, Under Review, Draft); the dropdown default-selection is controlled separately by each form's `defaultValue` attribute.

Consolidation: one canonical tuple + two label maps (plain English for the table pill, bilingual for the form dropdown).

- [ ] **Step 1: Add exports to `lib/ui/portfolio.ts`**

Append to `lib/ui/portfolio.ts` (after the existing `normalizeTags` function):

```ts
export const PROJECT_STATUSES = ["Published", "Under Review", "Draft"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  Published: "Published",
  "Under Review": "Under Review",
  Draft: "Draft",
};

export const STATUS_LABEL_BILINGUAL: Record<ProjectStatus, string> = {
  Published: "Published · เผยแพร่",
  "Under Review": "Under Review · กำลังตรวจ",
  Draft: "Draft · ฉบับร่าง",
};
```

- [ ] **Step 2: Update `components/admin/PortfolioAdminTable.tsx`**

1. Add to the imports block:

```ts
import { PROJECT_STATUSES, STATUS_LABEL } from "@/lib/ui/portfolio";
```

2. Delete the inline `const STATUS_LABEL = ...` (lines 18–22).
3. Delete the inline `const STATUS_OPTIONS = ...` (lines 24–28).
4. Find the `STATUS_OPTIONS.filter(...)` reference (around line 121). Change to `PROJECT_STATUSES.filter(...)`.
5. The `STATUS_LABEL[row.status]` reference (around line 112) stays — same symbol name, now imported.
6. `STATUS_VARIANT` (lines 9–16) stays local — it's a Pill-specific mapping, not duplicated elsewhere.

- [ ] **Step 3: Update `app/admin/portfolio/new/page.tsx`**

1. Add to imports:

```ts
import { PROJECT_STATUSES, STATUS_LABEL_BILINGUAL } from "@/lib/ui/portfolio";
```

2. Delete the inline `const STATUS_OPTIONS = [...]` (lines 8–12).
3. Find the JSX that maps `STATUS_OPTIONS` to `<option>` elements (around line 119). Change from:

```tsx
{
  STATUS_OPTIONS.map((s) => (
    <option key={s.value} value={s.value}>
      {s.label}
    </option>
  ));
}
```

to:

```tsx
{
  PROJECT_STATUSES.map((s) => (
    <option key={s} value={s}>
      {STATUS_LABEL_BILINGUAL[s]}
    </option>
  ));
}
```

4. The existing `defaultValue="Draft"` on the `<select>` (verify with grep — likely present near the same lines) stays. The order in the dropdown becomes Published / Under Review / Draft, but the default selection is still Draft.

- [ ] **Step 4: Update `app/admin/portfolio/[id]/edit/page.tsx`**

Same change as Step 3 (different line numbers — inline STATUS_OPTIONS at lines 13–17, JSX around line 142):

1. Add the same import.
2. Delete the inline `const STATUS_OPTIONS = [...]`.
3. Replace the `<option>` map with `PROJECT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL_BILINGUAL[s]}</option>)`.

The form's `defaultValue={project.status}` (driven by the row data) keeps the correct option preselected — no behavior change.

**Note:** `app/admin/portfolio/actions.ts` line 9 has a local `const PROJECT_STATUSES = [...] as const` used by the `isProjectStatus` type guard. After this task, that file can either keep its local copy (safe, no churn) or import the new canonical tuple (one less duplicate). **Take the simpler import path** — replace the local tuple in `actions.ts` with:

```ts
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/ui/portfolio";
```

Delete lines 9–10 (`const PROJECT_STATUSES = ...` and `type ProjectStatus = ...`). The `isProjectStatus` function on lines 12–14 stays; it still references `PROJECT_STATUSES` and `ProjectStatus` by the imported names.

- [ ] **Step 5: Verify no duplicates remain**

Run:

```bash
grep -rn "const STATUS_OPTIONS\|const STATUS_LABEL\b\|const PROJECT_STATUSES" app/admin/portfolio components/admin/PortfolioAdminTable.tsx 2>&1
```

Expected: zero matches. (`STATUS_LABEL_BILINGUAL` and `STATUS_VARIANT` are different symbols; the grep is specifically for the three duplicated ones.)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`. Expected: clean.

- [ ] **Step 7: Manual smoke**

1. `/admin/portfolio` — table renders. Each row's status pill matches: Published rows say "Published", Under Review says "Under Review", Draft says "Draft".
2. Click an inline status-change button on any row. The remaining-status buttons render (filtered to exclude current). Click one; status updates correctly.
3. `/admin/portfolio/<id>/edit` — Status dropdown shows three bilingual options. The current row's status is preselected. Save with each in turn.
4. `/admin/portfolio/new` — Status dropdown shows three bilingual options. Draft is preselected (via `defaultValue="Draft"`, not via array order). Create projects with each status; verify they appear in the right rows.

- [ ] **Step 8: Commit**

```bash
git add lib/ui/portfolio.ts components/admin/PortfolioAdminTable.tsx app/admin/portfolio/[id]/edit/page.tsx app/admin/portfolio/new/page.tsx app/admin/portfolio/actions.ts
git commit -m "refactor: consolidate portfolio status constants in lib/ui/portfolio.ts"
```

---

## Task 8 — Drop unused `admin_greeting` site_config

**Files:**

- Modify: `lib/queries/siteConfig.ts`, `app/admin/page.tsx`, `supabase/seed/siteConfig.ts`, `supabase/seed/data/admin-overview.ts`

The only live caller of `getAdminGreeting()` is `app/admin/page.tsx`. Replace it with derivation from `requireAdmin().display_name`, then strip the helper and the seed row.

- [ ] **Step 1: Update `app/admin/page.tsx`**

Read the current state first: `sed -n '1,45p' app/admin/page.tsx`.

The current `Promise.all` includes `getAdminGreeting()` and the result is destructured as `greeting`. Replace:

1. Imports: drop `getAdminGreeting` from the `@/lib/queries/siteConfig` import. Add `import { requireAdmin } from "@/lib/auth";`
2. In the `Promise.all`, replace `getAdminGreeting()` with `requireAdmin()`. Rename the destructured slot accordingly (e.g. `const [admin, kpis, ...] = await Promise.all([requireAdmin(), ...])`).
3. Compute the greeting:

```ts
const greeting = {
  th: `สวัสดี อาจารย์${admin.display_name}`,
  en: `Hello, ${admin.display_name}`,
};
```

4. Leave the `<GreetingBanner th={greeting.th} en={greeting.en} />` line as-is.

- [ ] **Step 2: Drop `getAdminGreeting` from `lib/queries/siteConfig.ts`**

Open `lib/queries/siteConfig.ts`. Delete the export (lines 23–25 in the current file):

```ts
export async function getAdminGreeting(): Promise<{ th: string; en: string }> {
  return getValue<{ th: string; en: string }>("admin_greeting");
}
```

- [ ] **Step 3: Drop the seed row**

In `supabase/seed/siteConfig.ts`, delete the `{ key: "admin_greeting", ... }` block (lines 30–34 area). Also remove the now-unused import `ADMIN_GREETING` from the `./data/admin-overview` import block (line 5 area).

Then open `supabase/seed/data/admin-overview.ts` and remove the `export const ADMIN_GREETING = ...` declaration (grep to find it: `grep -n "ADMIN_GREETING" supabase/seed/data/admin-overview.ts`).

- [ ] **Step 4: Verify no callers remain**

Run: `grep -rn "getAdminGreeting\|admin_greeting\|ADMIN_GREETING" app/ components/ lib/ supabase/ 2>&1`

Expected: zero matches. (If any match, it's a stale reference to fix.)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`. Expected: clean.

- [ ] **Step 6: One-off DB cleanup note**

The seed-managed row will repopulate if the seed runs, but a stale row will remain in the DB unless cleared. The commit message includes a note to run this once:

```sql
delete from site_config where key = 'admin_greeting';
```

This is not added to a migration (the convention is site_config data is seed-managed; the row is dead data not a schema change).

- [ ] **Step 7: Manual smoke**

1. Visit `/admin` as the root admin. The greeting banner shows your display name in Thai + English: e.g. "สวัสดี อาจารย์<your name> — Hello, <your name>".
2. Optionally: log out + log in as a non-root admin (if one exists) — verify their display name shows correctly too.

- [ ] **Step 8: Commit**

```bash
git add lib/queries/siteConfig.ts app/admin/page.tsx supabase/seed/siteConfig.ts supabase/seed/data/admin-overview.ts
git commit -m "chore: drop unused admin_greeting site_config + helper"
```

After committing, manually run the cleanup SQL above in the Supabase SQL editor (optional — the row is just orphan data, no functional impact).

---

## Task 9 — Explicit `type="submit"` on 3d-era admin forms

**Files:**

- Modify: `app/admin/calendar/new/page.tsx`, `app/admin/admins/page.tsx`

Three `<Btn>` call sites: one in calendar/new, two in admins (one "Create admin" submit, one per-row "Disable"). `PshareEditor.tsx` was checked during planning — it already uses native `<button type="submit">`, no change needed there.

- [ ] **Step 1: Update `app/admin/calendar/new/page.tsx`**

Around line 124, change:

```tsx
<Btn variant="primary">Save event →</Btn>
```

to:

```tsx
<Btn type="submit" variant="primary">
  Save event →
</Btn>
```

- [ ] **Step 2: Update `app/admin/admins/page.tsx`**

Around line 62, change:

```tsx
<Btn variant="primary">Create admin →</Btn>
```

to:

```tsx
<Btn type="submit" variant="primary">
  Create admin →
</Btn>
```

Around line 119, change:

```tsx
<Btn>Disable</Btn>
```

to:

```tsx
<Btn type="submit">Disable</Btn>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`. Expected: clean. `Btn`'s prop type is `ButtonHTMLAttributes<HTMLButtonElement>`, which accepts `type="submit"`.

- [ ] **Step 4: Manual smoke (click, not Enter-in-input)**

These are the original symptoms — `Enter` inside a text input submits any HTML form natively, so the bug only shows if you actually click the button.

1. `/admin/calendar/new` — fill the form. **Click** "Save event →" (don't press Enter). Form submits; event appears in `/admin/calendar`.
2. `/admin/admins` (as root admin) — fill the "New admin" form. **Click** "Create admin →". Form submits.
3. `/admin/admins` — find any active admin row that isn't you. **Click** "Disable". The admin is disabled (pill changes to "disabled").

- [ ] **Step 5: Commit**

```bash
git add app/admin/calendar/new/page.tsx app/admin/admins/page.tsx
git commit -m "fix: explicit type=\"submit\" on 3d-era admin forms"
```

---

## Task 10 — Drop dead exports in `lib/ui/booking.ts`

**Files:**

- Modify: `lib/ui/booking.ts`

- [ ] **Step 1: Verify dead status**

Run: `grep -rn "BOOKING_ACTIVE_TAB\|BOOKING_CONFIRM_EYEBROW" app/ components/ lib/ 2>&1`

Expected: matches only in `lib/ui/booking.ts` itself (the declarations on lines 8 and 29). Zero external imports. If any external import exists, that's a real bug to surface — flag it before deleting.

- [ ] **Step 2: Remove the two exports**

In `lib/ui/booking.ts`:

- Line 8: delete `export const BOOKING_ACTIVE_TAB: BookingTab["id"] = "music";`.
- Line 29: delete `export const BOOKING_CONFIRM_EYEBROW = "13 MAY · MIDDAY · MUSIC ROOM 1";`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`. Expected: clean.

- [ ] **Step 4: Manual smoke**

1. `/student/booking` renders normally — active tab still defaults to music (via the URL-param-driven picker state, not the dead constant).
2. The booking confirm form still renders its eyebrow correctly (the eyebrow is now derived from URL params, not the dead constant).

- [ ] **Step 5: Commit**

```bash
git add lib/ui/booking.ts
git commit -m "chore: drop dead exports in lib/ui/booking.ts"
```

---

## Task 11 — Simplify seed-side portfolio/bookings types

**Files:**

- Modify: `supabase/seed/data/admin-portfolio.ts`, `supabase/seed/data/admin-bookings.ts`

The two seed files use type-only workarounds (an `Omit<...>` alias in portfolio, stub `id: "seed-N"` strings in bookings). Both arrays may be **unused** by `supabase/seed/index.ts` — verify first, then either delete (if dead) or restructure (if live).

- [ ] **Step 1: Verify whether the arrays are consumed**

Run:

```bash
grep -rn "PORTFOLIO_ROWS\|ADMIN_TODAY_BOOKINGS\|GANTT_ROOMS" supabase/seed/ app/ components/ lib/ 2>&1 | grep -v "supabase/seed/data/"
```

This filters out the array's own definition line. If a match shows up in `supabase/seed/index.ts` or any of the per-table seed scripts, the array is live — go to Step 2 (restructure path). If no match, the arrays are dead — go to Step 3 (delete path).

- [ ] **Step 2: Restructure path (live arrays)**

If `PORTFOLIO_ROWS` is consumed:

- Open `supabase/seed/data/admin-portfolio.ts`. The `PortfolioSeedRow = Omit<PortfolioAdminRow, "id">` alias exists because the consumer doesn't need `id`. The alias is the cleanest expression of that fact — **leave it as-is** but rename the comment block to drop the "workaround" language (it's not a workaround, it's a deliberate scoping decision).

If `ADMIN_TODAY_BOOKINGS` is consumed:

- Open `supabase/seed/data/admin-bookings.ts`. Change the array element type from `AdminTodayBookingRow` to a local `Omit<AdminTodayBookingRow, "id">` and remove all `id: "seed-N"` lines. Update the consumer in `supabase/seed/*.ts` if it reads `id` (it shouldn't — the seed script generates real UUIDs at insert time).

Run `npx tsc --noEmit` and `npm run seed` (only if `SUPABASE_ALLOW_SEED=1` is set in `.env.local`; otherwise skip — the type-check is sufficient).

- [ ] **Step 3: Delete path (dead arrays)**

If neither array is consumed by the seed script:

- Remove `PORTFOLIO_ROWS` and the `PortfolioSeedRow` alias from `supabase/seed/data/admin-portfolio.ts`. Keep `PORTFOLIO_KPIS` if it's still consumed (likely yes — Task 8 didn't touch it).
- Remove `ADMIN_TODAY_BOOKINGS` from `supabase/seed/data/admin-bookings.ts`. Keep `GANTT_ROOMS` if it's still consumed (verify with the grep from Step 1).
- Update any export-collapsing barrels if applicable (unlikely — these files are direct-imported).

Run `npx tsc --noEmit` after deletion. Expected: clean. If a downstream import breaks, the grep in Step 1 missed it — back out the delete and use Step 2 instead.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed/data/admin-portfolio.ts supabase/seed/data/admin-bookings.ts
git commit -m "refactor: simplify seed-side portfolio/bookings types"
```

---

## Task 12 — Log storage delete failures

**Files:**

- Modify: `app/admin/pshare/actions.ts`, `app/admin/portfolio/actions.ts`

Both `deletePost` and `deleteProject` currently ignore failures from `storage.remove`. Surface them via `console.error` without changing failure behavior (row stays deleted, orphan object accepted).

- [ ] **Step 1: Update `deletePost`**

In `app/admin/pshare/actions.ts`, around line 202–205 (current):

```ts
if (row?.art_image_path) {
  await db.storage.from("assets").remove([row.art_image_path]);
  // Ignore storage delete failures — row is gone, orphan acceptable.
}
```

Replace with:

```ts
if (row?.art_image_path) {
  const { error: storageErr } = await db.storage
    .from("assets")
    .remove([row.art_image_path]);
  if (storageErr) {
    console.error("storage delete failed", {
      surface: "pshare",
      path: row.art_image_path,
      error: storageErr.message,
    });
  }
}
```

- [ ] **Step 2: Update `deleteProject`**

In `app/admin/portfolio/actions.ts`, around line 187–189 (current):

```ts
if (row?.image_path) {
  await db.storage.from("assets").remove([row.image_path]);
}
```

Replace with:

```ts
if (row?.image_path) {
  const { error: storageErr } = await db.storage
    .from("assets")
    .remove([row.image_path]);
  if (storageErr) {
    console.error("storage delete failed", {
      surface: "portfolio",
      path: row.image_path,
      error: storageErr.message,
    });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`. Expected: clean.

- [ ] **Step 4: Manual smoke (success path)**

1. Create a new pshare post via `/admin/pshare/new`, upload an image, publish.
2. Delete the post via `/admin/pshare`.
3. Check the Supabase Dashboard → Storage → assets/pshare/ — the file is gone.
4. Check the dev console — no `console.error` line (the delete succeeded).

- [ ] **Step 5: Manual smoke (failure path)**

1. Create a new portfolio project via `/admin/portfolio/new`, upload a thumbnail.
2. In the Supabase Dashboard, manually delete the storage file at `assets/portfolio/<id>.jpg` (or whatever extension).
3. Now delete the project via `/admin/portfolio`. The row delete succeeds (the project is gone from the admin table), but the storage `remove()` fails (object already deleted).
4. Check the `npm run dev` console — a `storage delete failed { surface: "portfolio", path: ..., error: ... }` line should appear.

- [ ] **Step 6: Commit**

```bash
git add app/admin/pshare/actions.ts app/admin/portfolio/actions.ts
git commit -m "chore: log storage delete failures"
```

---

## Final Verification — Full Phase 5b walkthrough

Run this end-to-end after Task 12 commits. If any step fails, fix in a follow-up commit on `main` before declaring Phase 5b done.

- [ ] **Step 1: Build clean**

```bash
npm run build
```

Expected: production build succeeds. Type errors here mean a task missed a call site.

- [ ] **Step 2: Grep for residual dead code**

```bash
grep -rn "BOOKING_ACTIVE_TAB\|BOOKING_CONFIRM_EYEBROW\|getAdminGreeting\|admin_greeting\|uploadPshareImage\|uploadProjectImage" app/ components/ lib/ supabase/ 2>&1
```

Expected: zero matches.

- [ ] **Step 3: Rate-limit walkthrough**

Two-tab incognito + main browser.

1. Private window → `/student/carelin/new` — submit 6 valid Carelin requests in <60s. 6th rejects inline; first 5 visible at `/admin/carelin`.
2. Private window → `/student/booking` — submit 6 booking requests (vary room/period). 6th rejects inline.
3. Wait 60s, submit one more — succeeds. Confirms the bucket rolls.

- [ ] **Step 4: Race-window backstop**

Reproduce per Task 3 Step 5. Friendly "ห้องนี้เพิ่งถูกจองไป / This room was just booked" message, not a Next error boundary.

- [ ] **Step 5: Storage delete logging**

Trigger the failure path per Task 12 Step 5. `console.error` line present in dev console.

- [ ] **Step 6: Refactor regression smoke**

For each of the four refactor surfaces, verify the relevant pages render + save:

- `/admin/config` index + `[key]/edit` (Task 5).
- `/admin/sport/result/{new,[id]/edit}` (Task 6).
- `/admin/portfolio/{,[id]/edit,new}` — status pills + dropdowns (Task 7).
- `/admin/{pshare,portfolio}/new` image uploads (Task 4).

- [ ] **Step 7: `Btn` backfill**

Click (not Enter-in-input) the three target buttons. Each form submits (Task 9).

- [ ] **Step 8: Greeting**

`/admin` shows display-name-derived greeting (Task 8).

- [ ] **Step 9: Phase 5a regression**

Rerun the 5a sign-off checklist briefly (Realtime on 3 pages, Storage uploads on 2 editors, tag editor, portfolio create). Nothing should have broken under Task 4's upload-helper consolidation.

- [ ] **Step 10: Optional one-off DB cleanup**

In Supabase SQL editor: `delete from site_config where key = 'admin_greeting';` (orphan row from Task 8 — no functional impact, but tidier).

---

## Spec-time audit (no commit) — #17

Confirmed from `supabase/migrations/0002_rls.sql` during planning:

- **`carelin_requests`**: `carelin_requests_select_all` — `for select to anon, authenticated using (true)` (line 134–135). Admins receive all Realtime events for `/admin/carelin`. ✓
- **`bookings`**: `bookings_select_all` — `for select to anon, authenticated using (true)` (line 100–101). Admins receive all Realtime events for `/admin/bookings`. ✓

No RLS-side change needed. This task produces no code change and no commit — the audit is the deliverable, documented here and in the spec.
