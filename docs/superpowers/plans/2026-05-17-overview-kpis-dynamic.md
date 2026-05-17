# Dynamic Admin Overview KPIs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four static admin overview KPI cards with live counts computed from the database at request time (Activities this month, Room bookings this month, Carelines open, P-Share published).

**Architecture:** A new cross-entity query module `lib/queries/overview.ts` runs eight concurrent `count(*, head:true)` queries against `events`, `bookings`, `carelin_requests`, and `pshare_posts`, formats four `AdminKpi` rows, and replaces the previous `site_config`-backed `getOverviewKpis()`. The shared `monthRange()` helper migrates from `lib/queries/events.ts` to `lib/queries/util.ts`. Seed data for `overview_kpis` is removed.

**Tech Stack:** Next.js 16 (App Router), React 19 Server Components, Supabase JS v2, TypeScript. No test framework — automated verification is `npx tsc --noEmit` + `npm run lint`; functional verification is manual via the dev server (per the spec test plan).

**Spec:** `docs/superpowers/specs/2026-05-17-overview-kpis-dynamic-design.md`

---

## File Map

- **Create** `lib/queries/overview.ts` — owns `getOverviewKpis()` and the count/delta helpers.
- **Modify** `lib/queries/util.ts` — add exported `monthRange(year, month)`.
- **Modify** `lib/queries/events.ts` — remove local `monthRange`, import from `./util`.
- **Modify** `lib/queries/siteConfig.ts` — remove `getOverviewKpis()`.
- **Modify** `components/admin/cards/OverviewCards.tsx` — swap import.
- **Modify** `supabase/seed/siteConfig.ts` — remove `overview_kpis` row.
- **Modify** `supabase/seed/data/admin-overview.ts` — remove `ADMIN_KPIS` export.

Each task ends with `npx tsc --noEmit && npm run lint`, then a commit. Task 5 adds manual browser verification.

---

### Task 1: Extract `monthRange` into shared util

**Files:**

- Modify: `lib/queries/util.ts`
- Modify: `lib/queries/events.ts:48-55` (remove local function), `lib/queries/events.ts` top-of-file imports

**Rationale:** `monthRange` will be needed by both `events.ts` (already uses it) and the new `overview.ts`. Centralizing first avoids drift.

- [ ] **Step 1: Add `monthRange` to `lib/queries/util.ts`**

Append to `lib/queries/util.ts` (after the existing exports):

```ts
/**
 * ISO bounds for a 1-indexed (year, month) pair, in Asia/Bangkok offset.
 * Returns `start` (first day of month at 00:00 +07:00) and `next` (first day
 * of the following month at 00:00 +07:00). Use as `.gte(start).lt(next)`.
 */
export function monthRange(
  year: number,
  month: number,
): { start: string; next: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`;
  const next =
    month === 12
      ? `${year + 1}-01-01T00:00:00+07:00`
      : `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+07:00`;
  return { start, next };
}
```

- [ ] **Step 2: Remove the local copy from `lib/queries/events.ts`**

Delete lines 48–55 (the existing `monthRange` function):

```ts
function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`;
  const next =
    month === 12
      ? `${year + 1}-01-01T00:00:00+07:00`
      : `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+07:00`;
  return { start, next };
}
```

- [ ] **Step 3: Add the import in `lib/queries/events.ts`**

Top of file, with the other imports. Add:

```ts
import { monthRange } from "@/lib/queries/util";
```

(`./util` would also work; the codebase uses `@/lib/...` style throughout — match that.)

- [ ] **Step 4: Verify types and lint**

Run from project root:

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors. `events.ts` still type-checks because the three existing call sites (`getStudentMonth`, `getAdminMonth`, `getAdminMonthEventList`) now resolve `monthRange` through the import.

- [ ] **Step 5: Commit**

```bash
git add lib/queries/util.ts lib/queries/events.ts
git commit -m "refactor: extract monthRange helper to queries/util"
```

---

### Task 2: Create `lib/queries/overview.ts` with `getOverviewKpis()`

**Files:**

- Create: `lib/queries/overview.ts`

**Rationale:** This is the single behavioral addition — the function the admin page will call. Build it complete in one task so the diff stays cohesive.

- [ ] **Step 1: Write the new module**

Create `lib/queries/overview.ts` with this exact content:

```ts
import { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/queries/util";
import type { AdminKpi } from "@/lib/types";

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function compareDelta(
  curr: number,
  prev: number,
  prevAbbr: string,
): AdminKpi["delta"] {
  if (curr > prev)
    return { kind: "up", text: `▲ ${fmt(curr - prev)} vs ${prevAbbr}` };
  if (curr < prev)
    return { kind: "down", text: `▼ ${fmt(prev - curr)} vs ${prevAbbr}` };
  return { kind: "flat", text: `— same as ${prevAbbr}` };
}

function newThisMonthDelta(n: number, noun: string): AdminKpi["delta"] {
  if (n > 0) return { kind: "flat", text: `▲ ${fmt(n)} ${noun} this month` };
  return { kind: "flat", text: `— none this month` };
}

export async function getOverviewKpis(): Promise<AdminKpi[]> {
  const db = await createClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

  const { start: thisStart, next: thisNext } = monthRange(
    currentYear,
    currentMonth,
  );
  const { start: prevStart, next: prevNext } = monthRange(prevYear, prevMonth);
  const prevAbbr = MONTH_ABBR[prevMonth - 1];

  const [
    eventsThis,
    eventsPrev,
    bookingsThis,
    bookingsPrev,
    carelinOpen,
    carelinNewThis,
    pshareTotal,
    pshareNewThis,
  ] = await Promise.all([
    db
      .from("events")
      .select("*", { count: "exact", head: true })
      .is("tag", null)
      .gte("starts_at", thisStart)
      .lt("starts_at", thisNext),
    db
      .from("events")
      .select("*", { count: "exact", head: true })
      .is("tag", null)
      .gte("starts_at", prevStart)
      .lt("starts_at", prevNext),
    db
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", thisStart)
      .lt("starts_at", thisNext),
    db
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", prevStart)
      .lt("starts_at", prevNext),
    db
      .from("carelin_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    db
      .from("carelin_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thisStart)
      .lt("created_at", thisNext),
    db
      .from("pshare_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    db
      .from("pshare_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", thisStart)
      .lt("published_at", thisNext),
  ]);

  for (const r of [
    eventsThis,
    eventsPrev,
    bookingsThis,
    bookingsPrev,
    carelinOpen,
    carelinNewThis,
    pshareTotal,
    pshareNewThis,
  ]) {
    if (r.error) throw new Error(`getOverviewKpis: ${r.error.message}`);
  }

  const eventsCurr = eventsThis.count ?? 0;
  const eventsPrevN = eventsPrev.count ?? 0;
  const bookingsCurr = bookingsThis.count ?? 0;
  const bookingsPrevN = bookingsPrev.count ?? 0;
  const carelinOpenN = carelinOpen.count ?? 0;
  const carelinNewN = carelinNewThis.count ?? 0;
  const pshareTotalN = pshareTotal.count ?? 0;
  const pshareNewN = pshareNewThis.count ?? 0;

  return [
    {
      label: "Events · this month",
      th: "กิจกรรมเดือนนี้",
      num: fmt(eventsCurr),
      delta: compareDelta(eventsCurr, eventsPrevN, prevAbbr),
    },
    {
      label: "Bookings · this month",
      th: "การจองเดือนนี้",
      num: fmt(bookingsCurr),
      delta: compareDelta(bookingsCurr, bookingsPrevN, prevAbbr),
    },
    {
      label: "Carelin · open",
      th: "Carelin ค้างตอบ",
      num: fmt(carelinOpenN),
      delta: newThisMonthDelta(carelinNewN, "new"),
    },
    {
      label: "P-Share · published",
      th: "เผยแพร่แล้ว",
      num: fmt(pshareTotalN),
      delta: newThisMonthDelta(pshareNewN, "published"),
    },
  ];
}
```

- [ ] **Step 2: Verify types and lint**

Run from project root:

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors. The file imports only existing exports (`createClient` from `@/lib/supabase/server`, `monthRange` from Task 1's util, `AdminKpi` from `@/lib/types:202`). Supabase JS `.select('*', { count: 'exact', head: true })` returns a `PostgrestSingleResponse<null>` with `.count: number | null` and `.error: PostgrestError | null` — both the `?? 0` and the `r.error` loop match the established pattern in `lib/queries/carelin.ts:142-160`.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/overview.ts
git commit -m "feat: add getOverviewKpis with live counts"
```

---

### Task 3: Swap import in `OverviewCards`, remove stale function from `siteConfig`

**Files:**

- Modify: `components/admin/cards/OverviewCards.tsx:10` (import line)
- Modify: `lib/queries/siteConfig.ts:23-25` (remove function)

- [ ] **Step 1: Update the import in `OverviewCards.tsx`**

In `components/admin/cards/OverviewCards.tsx`, change line 10 from:

```ts
import { getOverviewKpis, getTrendChart } from "@/lib/queries/siteConfig";
```

to:

```ts
import { getOverviewKpis } from "@/lib/queries/overview";
import { getTrendChart } from "@/lib/queries/siteConfig";
```

(Two separate imports keep each module's responsibility crisp.)

- [ ] **Step 2: Remove `getOverviewKpis` from `lib/queries/siteConfig.ts`**

Delete lines 23–25:

```ts
export async function getOverviewKpis(): Promise<AdminKpi[]> {
  return getValue<AdminKpi[]>("overview_kpis");
}
```

The blank line that separated it from the next function should stay (so the file still has clean spacing between exports).

- [ ] **Step 3: Check `AdminKpi` is still imported in `siteConfig.ts`**

Read the top of `lib/queries/siteConfig.ts`. The import is:

```ts
import type { AdminKpi, HomeHero, PortfolioStats } from "@/lib/types";
```

`AdminKpi` is still consumed by `getPortfolioKpis()` and `getCarelinKpis()` further down the file — keep the import as-is.

- [ ] **Step 4: Verify types and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors. The page (`app/admin/page.tsx`) imports `KpiGrid` from `OverviewCards.tsx` and never references `getOverviewKpis` directly, so the call-site is unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/admin/cards/OverviewCards.tsx lib/queries/siteConfig.ts
git commit -m "refactor: wire admin overview to live KPI query"
```

---

### Task 4: Remove `overview_kpis` from seed

**Files:**

- Modify: `supabase/seed/siteConfig.ts:29-33` (remove insert row)
- Modify: `supabase/seed/data/admin-overview.ts:8-33` (remove `ADMIN_KPIS` export)

- [ ] **Step 1: Drop the `overview_kpis` row from the seed inserts**

In `supabase/seed/siteConfig.ts`, delete lines 29–33:

```ts
    {
      key: "overview_kpis",
      value: json(ADMIN_KPIS),
      updated_by_admin_id: adminId,
    },
```

Also remove `ADMIN_KPIS` from the imports at the top — change line 5 from:

```ts
import {
  ADMIN_KPIS,
  ADMIN_TREND_MONTHS,
  ADMIN_TREND_PATH,
  ADMIN_TREND_POINTS,
} from "./data/admin-overview";
```

to:

```ts
import {
  ADMIN_TREND_MONTHS,
  ADMIN_TREND_PATH,
  ADMIN_TREND_POINTS,
} from "./data/admin-overview";
```

- [ ] **Step 2: Remove the `ADMIN_KPIS` export from the data file**

In `supabase/seed/data/admin-overview.ts`, delete lines 8–33 (the entire `export const ADMIN_KPIS: AdminKpi[] = [ ... ];` block, including the trailing blank line before `const C = CATEGORY_COLOR;`).

Also remove `AdminKpi` from the type import at the top — change:

```ts
import {
  CATEGORY_COLOR,
  type AdminBookingRow,
  type AdminEvent,
  type AdminKpi,
} from "@/lib/types";
```

to:

```ts
import {
  CATEGORY_COLOR,
  type AdminBookingRow,
  type AdminEvent,
} from "@/lib/types";
```

- [ ] **Step 3: Verify types and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors. `ADMIN_KPIS` had only one consumer (the seed file), so removing both ends of the wire leaves the project clean.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed/siteConfig.ts supabase/seed/data/admin-overview.ts
git commit -m "chore: drop overview_kpis seed entry"
```

---

### Task 5: Manual verification in the dev server

**Files:** none — verification only.

**Rationale:** The project has no automated tests. The spec's test plan is browser-based; this task executes it.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Wait for the "Ready in N s" line. The server listens on `http://localhost:3000`.

- [ ] **Step 2: Log in as admin**

Open `http://localhost:3000/login` in a browser. Enter admin credentials (see `.env.local` or a teammate for the dev login). After login you should land on `/admin`.

- [ ] **Step 3: Verify the four KPI cards render**

On `/admin`, the KPI grid (immediately under the greeting banner) should show four cards in this order:

1. `EVENTS · THIS MONTH` / `กิจกรรมเดือนนี้` — a number (≥ 0).
2. `BOOKINGS · THIS MONTH` / `การจองเดือนนี้` — a number (≥ 0).
3. `CARELIN · OPEN` / `Carelin ค้างตอบ` — a number (≥ 0).
4. `P-SHARE · PUBLISHED` / `เผยแพร่แล้ว` — a number (≥ 0).

Each card has a colored chip at the bottom:

- Cards 1 & 2: green (`up`), pink (`down`), or cream (`flat`) depending on comparison with the previous month, with text like `▲ 3 vs Apr`, `▼ 1 vs Apr`, or `— same as Apr`.
- Cards 3 & 4: always cream (`flat`), with text like `▲ 2 new this month` / `▲ 1 published this month`, or `— none this month`.

- [ ] **Step 4: Cross-check the numbers**

Open a second browser tab to `http://localhost:3000/admin/calendar`, `/admin/bookings`, `/admin/carelin`, `/admin/pshare`. The list lengths there should be consistent with the KPI numbers (the calendar/bookings views may show more than just "this month" but the slice the KPI counts should be visible).

- [ ] **Step 5: Trigger a live update**

Pick the easiest of these to perform locally and confirm the KPI updates after a hard refresh:

- Add an event via `/admin/calendar/new` dated in the current month → reload `/admin` → "Events · this month" increments by 1.
- Add a booking via `/admin/bookings/new` dated in the current month → reload `/admin` → "Bookings · this month" increments by 1.
- Submit a new Carelin request via `/student/carelin/new` (public) → reload `/admin` → "Carelin · open" and "▲ N new this month" both increment.
- Publish a draft P-Share post via `/admin/pshare/[id]/edit` → reload `/admin` → "P-Share · published" and "▲ N published this month" both increment.

Confirm at least one of these works end-to-end.

- [ ] **Step 6: Final type/lint sweep**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean. No new commit unless something needed fixing.

---

## Notes for the executing engineer

- **No test framework.** The repo has no Jest/Vitest/Playwright config — the per-task "verify" steps are `tsc --noEmit + lint`, with browser checks consolidated in Task 5. Don't add a test runner; that's well out of scope.
- **Dynamic by default.** The admin overview page is already dynamic because the Supabase server client reads `cookies()`. Don't add `'use cache'` or `cacheLife()`; Phase 3 stays uncached per `AGENTS.md`.
- **Service role is NOT used here.** Read queries go through the cookie-authenticated server client (`@/lib/supabase/server`). Don't reach for `lib/supabase/serviceRole.ts` — that's only for root-admin writes.
- **Existing orphan seed row.** Anyone who pulls these changes and already has a seeded DB will keep an `overview_kpis` row in `site_config`. Nothing reads it anymore, so it's harmless. Re-running `npm run seed` will not recreate it. No migration is needed.
- **Conventional commits.** This repo uses lowercase Conventional-style messages (`feat:`, `refactor:`, `chore:`); skip the `Co-Authored-By` trailer per `AGENTS.md`.
