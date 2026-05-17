# Feature flags — root-admin toggleable student features

**Status:** draft
**Date:** 2026-05-17
**Owner:** root admin

## Goal

Let a root administrator enable or disable any of the six student-facing features at runtime. When a feature is disabled, students who navigate into it see a "this feature is not currently available" notice; the matching admin sub-page keeps working unchanged for every admin.

## Non-goals

- Per-user / per-house / scheduled rollouts.
- A custom disabled-state message per feature.
- Auditing or version history of flag flips (the `updated_by` / `updated_at` columns are forward-compatible with a future audit page, but no UI is shipped).
- Affecting any admin-facing route. Admin pages are always reachable.

## Scope

All six tiles on `app/student/page.tsx` are independently toggleable: `calendar`, `booking`, `sport`, `portfolio`, `pshare`, `carelin`. Flags start **enabled**, so shipping the migration changes no student behavior.

## Architecture

```
                                  ┌─────────────────────────┐
                                  │  public.feature_flags   │  ← new table
                                  │  (key, enabled, ...)    │
                                  └────────┬────────────────┘
                                           │ SELECT (anon ok)
                                           │ UPDATE (service-role only)
                       ┌───────────────────┼───────────────────────┐
                       │                                           │
        lib/queries/featureFlags.ts              app/admin/features/actions.ts
        getFeatureFlags(), isFeatureEnabled(k)   toggleFeature(formData)
                       │                                           │
        ┌──────────────┼──────────────┐               ┌────────────┼─────────┐
        │              │              │               │                      │
 student layouts   student menu   server actions   admin features page    sidebar
 (per feature)     tiles (no      (carelin/new      (root-only)            entry
                   visual change) defensive check)                        (root-only)
```

## Data layer

### Migration `supabase/migrations/0009_feature_flags.sql`

```sql
create table public.feature_flags (
  key         text primary key check (key in (
    'calendar','booking','sport','portfolio','pshare','carelin'
  )),
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.admins(id) on delete set null
);

alter table public.feature_flags enable row level security;

create policy "feature_flags_read_all"
  on public.feature_flags for select to public using (true);

-- No insert/update/delete policies. All writes go through the service-role
-- client from a root-admin Server Action.

insert into public.feature_flags (key) values
  ('calendar'),('booking'),('sport'),('portfolio'),('pshare'),('carelin');
```

After applying: `npm run gen:types`, commit `lib/supabase/database.types.ts`.

### `lib/ui/features.ts`

```ts
export const FEATURE_KEYS = [
  "calendar",
  "booking",
  "sport",
  "portfolio",
  "pshare",
  "carelin",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(v: string): v is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(v);
}

export const FEATURE_LABELS: Record<FeatureKey, { en: string; th: string }> = {
  calendar: { en: "Calendar", th: "ปฏิทินกิจกรรม" },
  booking: { en: "Booking", th: "จองห้อง" },
  sport: { en: "Sport Day", th: "กีฬาสี" },
  portfolio: { en: "Portfolio", th: "รุ่นพี่ · Alumni" },
  pshare: { en: "P'share", th: "พี่แชร์ น้องชัวร์" },
  carelin: { en: "CD Carelin", th: "เรื่องที่อยากเล่า" },
};
```

### `lib/queries/featureFlags.ts`

```ts
import { createClient } from "@/lib/supabase/server";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/ui/features";

export type FeatureFlags = Record<FeatureKey, boolean>;

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const db = await createClient();
  const { data, error } = await db.from("feature_flags").select("key, enabled");
  if (error) throw new Error(`feature_flags: ${error.message}`);
  // Default any missing row to true so a partial table never dark-fails a feature.
  const out = Object.fromEntries(
    FEATURE_KEYS.map((k) => [k, true]),
  ) as FeatureFlags;
  for (const row of data) {
    if ((FEATURE_KEYS as readonly string[]).includes(row.key)) {
      out[row.key as FeatureKey] = row.enabled;
    }
  }
  return out;
}

export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[key];
}
```

`isFeatureEnabled` reads the whole row set on each call. The table is six rows; calling twice in one request (e.g., layout + action) is acceptable. If profiling later shows it as hot, wrap with React `cache()` like `requireAdmin`.

## Student-side enforcement

### Menu page (`app/student/page.tsx`)

No change. All six tiles remain rendered and clickable per the decided UX.

### Per-feature layouts

Add one `layout.tsx` per feature route group (`app/student/<feature>/layout.tsx`) for all six features. Each calls `isFeatureEnabled('<key>')` and short-circuits to `<FeatureUnavailable feature="<key>" />` when the flag is off. This covers the index page and every nested route (e.g., `/student/carelin/new`) without per-page checks.

```tsx
// app/student/carelin/layout.tsx
import { FeatureUnavailable } from "@/components/student/FeatureUnavailable";
import { isFeatureEnabled } from "@/lib/queries/featureFlags";

export default async function CarelinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isFeatureEnabled("carelin")))
    return <FeatureUnavailable feature="carelin" />;
  return <>{children}</>;
}
```

The other five layouts are identical with the feature key swapped. They render inside the existing `app/student/layout.tsx` (which provides the phone shell), so `FeatureUnavailable` slots into the mobile body just like a normal page.

### `components/student/FeatureUnavailable.tsx`

A simple server component:

- `StudentHeader`
- `MobileBody` containing one `Card` (or matching `bg-paper` wrapper with `halftone-soft`):
  - mono-caps eyebrow `<feature label>`
  - `font-display italic` headline: "Feature unavailable"
  - Thai body: "ฟีเจอร์นี้ปิดให้บริการชั่วคราว"
  - English body: "This feature is not currently available."
  - Link back to `/student` styled like other student buttons.

Takes a `feature: FeatureKey` prop and reads `FEATURE_LABELS[feature]` for the heading.

### Server-action write blocking

Only one public-anon write surface exists today: the Carelin request form action `postCarelinRequest` in `app/student/carelin/actions.ts` (the `/new` folder only holds `page.tsx`). Add a guard at the very top of that action, immediately after the rate-limit check:

```ts
if (!(await isFeatureEnabled("carelin"))) {
  return {
    ok: false,
    error: "Feature unavailable / ฟีเจอร์นี้ปิดให้บริการชั่วคราว",
  };
}
```

The return shape matches the existing `ActionResult` (`{ ok: false, error }`) consumed by `useActionState`. Any future student-facing Server Action under a feature route gets the same one-line guard at the top.

## Admin-side management

### Sidebar entry (`app/admin/layout.tsx`)

Add a `FEATURES_NAV: NavItem` alongside the existing `ADMINS_NAV`. Include it in `extraItems` only when `admin.tier === "root"`:

```ts
const extraItems: NavItem[] =
  admin.tier === "root" ? [ADMINS_NAV, FEATURES_NAV] : [];
```

Icon: a simple toggle-switch glyph drawn in the existing SVG idiom.

### `app/admin/features/page.tsx`

Mirrors `/admin/admins`:

- `await requireRootAdmin()` at the top.
- `AdminTopbar titleTh="ฟีเจอร์" eyebrow="Features · root-only"`.
- One `Card` titled "Feature flags · ฟีเจอร์" with a table:
  - columns: **Feature**, **Status**, _action_.
  - One row per `FEATURE_KEYS` entry. Status uses the existing `Pill` component: `ok` for enabled, `pend` for disabled.
  - Action column: `<form action={toggleFeature}>` with `<input type="hidden" name="key" value={k} />` and a `<Btn type="submit">` whose label flips between "Disable" and "Enable" based on current state.

No create / delete UI — the six features are fixed by the `CHECK` constraint.

### `app/admin/features/actions.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireRootAdmin } from "@/lib/auth";
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";
import { isFeatureKey } from "@/lib/ui/features";

export async function toggleFeature(formData: FormData): Promise<void> {
  const self = await requireRootAdmin();
  const key = String(formData.get("key") ?? "");
  if (!isFeatureKey(key)) return;

  const svc = getSupabaseServiceRole();
  const { data: current, error: readErr } = await svc
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .single();
  if (readErr || !current) throw new Error(readErr?.message ?? "Flag missing.");

  const { error } = await svc
    .from("feature_flags")
    .update({
      enabled: !current.enabled,
      updated_at: new Date().toISOString(),
      updated_by: self.id,
    })
    .eq("key", key);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/features");
  revalidatePath("/student", "layout");
}
```

`revalidatePath("/student", "layout")` busts every cached student route at once, so the next student request sees the new flag state without waiting for the per-page TTL.

## Error handling

- `getFeatureFlags()` rethrows DB errors as `Error("feature_flags: …")`. Student layouts let those bubble to Next's error boundary (same pattern as every other query helper).
- `toggleFeature()` early-returns on bad/unknown key (client-side `<select>`/hidden input shadows shouldn't make this reachable). DB errors throw and surface in the admin error boundary.
- Missing rows in `feature_flags` default to **enabled** in `getFeatureFlags()`. Reasoning: the seed inserts all six, but if a future feature key gets added to the tuple before the row is inserted, we'd rather fail open than dark-fail a tile. The check constraint blocks unknown keys from ever reaching the table.

## Security

- Reads: anon-allowed by RLS. Flag state isn't sensitive (it's already visible to students through the UI).
- Writes: no RLS policy → blocked for every authenticated role. Only the service-role client can write, and only the root-gated Server Action ever instantiates it for this table.
- Root gate: both the page (`requireRootAdmin`) and the action (`requireRootAdmin`) gate independently. Normal admins who guess the URL get the error boundary; normal admins who hand-craft a POST get the same.

## Testing plan

Manual end-to-end (no automated tests in this project):

1. Apply `0009`, regenerate types, run `npm run dev`.
2. As root, navigate to `/admin/features` — confirm all six rows show "active" pills.
3. Disable `carelin`. Visit `/student/carelin` as a logged-out student — see `FeatureUnavailable`. Visit `/student/carelin/new` — same. Visit `/admin/carelin` as any admin — works normally.
4. POST directly to `postCarelinRequest` while disabled — receives `{ ok: false, error: "Feature unavailable …" }`.
5. Re-enable `carelin` — student route works again on next request.
6. As a normal admin, browse to `/admin/features` — error boundary (root required). Confirm the "Features" link is not in their sidebar.
7. Repeat steps 3 and 5 for each of the other five features to confirm each layout guard wires its own flag.

## Open questions

None.
