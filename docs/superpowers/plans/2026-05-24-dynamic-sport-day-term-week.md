# Dynamic Sport-Day & Term-Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three hardcoded "stale-over-time" strings — the student sport hero (`SPORT_HERO`), the admin sport-day eyebrow, and the admin overview term/week eyebrow — with values derived at render time from anchor data stored in `site_config` plus the current Bangkok date.

**Architecture:** Store only the _anchor_ facts in the existing generic `site_config` key/value JSONB table — `sport_day` (`label`, `startDate`, `totalDays`) and `term_week` (`term`, `startDate`, `totalWeeks`). Two new thin query helpers (`getSportDay`, `getTermWeek`) read those keys and compute the display values: "Day X of N" and the term week from a day-count since `startDate`, today's date label from the clock, and "events remaining" counted from the `events` table. The values become editable through the existing admin config editor (`/admin/config`), so the anchors can be adjusted without a deploy.

**Tech Stack:** Next 16 (App Router, RSC), Supabase (Postgres + RLS), TypeScript. **No test runner exists in this repo** — verification is `npx tsc --noEmit`, a `tsx` one-liner for the pure date math, `npm run lint`, and manual UI smoke after `npm run seed`.

---

## File Structure

| File                                   | Change | Responsibility                                                          |
| -------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `lib/time.ts`                          | modify | Add pure `daysBetween(fromISO, toISO)` helper (UTC-anchored day count). |
| `lib/types.ts`                         | modify | Add `SportDayConfig` + `TermWeekConfig` (the stored anchor shapes).     |
| `supabase/seed/siteConfig.ts`          | modify | Seed the two new `site_config` rows (idempotent upsert).                |
| `lib/queries/siteConfig.ts`            | modify | Add `SportDay`/`TermWeek` view types + `getSportDay()`/`getTermWeek()`. |
| `app/student/sport/page.tsx`           | modify | Build `SportHero` props from `getSportDay()`.                           |
| `app/admin/sport/page.tsx`             | modify | Compute the sport-day eyebrow from `getSportDay()`.                     |
| `lib/ui/sport.ts`                      | modify | Remove the now-dead `SPORT_HERO` constant (keep `HOUSES`).              |
| `app/admin/page.tsx`                   | modify | Make async; compute the term/week eyebrow from `getTermWeek()`.         |
| `lib/ui/siteConfig.ts`                 | modify | Add the two keys to `EDITABLE_KEYS` + `KEY_LABELS`.                     |
| `app/admin/config/actions.ts`          | modify | Add parsers + switch cases + revalidate branches.                       |
| `app/admin/config/[key]/edit/page.tsx` | modify | Add `SportDayFields` + `TermWeekFields` form sections.                  |

**Anchor values chosen so the seeded demo reproduces today's (2026-05-24) display:**

- `sport_day`: `startDate "2026-05-23"`, `totalDays 3` → elapsed 1 → **"Day 2 of 3"**, live.
- `term_week`: `term 1`, `startDate "2026-04-19"`, `totalWeeks 16` → elapsed 35 → **"Week 6 of 16"**.

---

### Task 1: Pure `daysBetween` date helper

**Files:**

- Modify: `lib/time.ts` (insert after `today()`, which ends at line 137)

- [ ] **Step 1: Add the helper**

Insert immediately after the `today()` function (before `currentYearMonth`):

```ts
/**
 * Whole days from `fromISO` to `toISO` (both "YYYY-MM-DD"). UTC-anchored so the
 * count is DST-free, matching the timezone-invariant grid math in this file.
 */
export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
  );
}
```

- [ ] **Step 2: Sanity-check the math** (no test runner — use a `tsx` one-liner; `lib/time.ts` has no imports so it loads standalone)

Run:

```bash
npx tsx -e "import {daysBetween} from './lib/time.ts'; console.log(daysBetween('2026-05-23','2026-05-24'), daysBetween('2026-04-19','2026-05-24'));"
```

Expected output: `1 35`

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/time.ts
git commit -m "feat: add daysBetween date helper"
```

---

### Task 2: Stored anchor config types

**Files:**

- Modify: `lib/types.ts` (insert after the `HomeHero` type, which ends at line 14)

- [ ] **Step 1: Add the two config shapes**

Insert directly after the `HomeHero` type definition:

```ts
/**
 * site_config `sport_day` — anchor facts only. The "Day X of N", date label,
 * and events-remaining shown in the sport hero are derived from this + the clock.
 */
export type SportDayConfig = {
  /** Mono-caps eyebrow, e.g. "★ Chitralada Sport Day 2026". */
  label: string;
  /** First competition day, "YYYY-MM-DD". */
  startDate: string;
  totalDays: number;
};

/**
 * site_config `term_week` — anchor facts only. The current week is derived from
 * the clock (`startDate` is the Monday of week 1).
 */
export type TermWeekConfig = {
  term: number;
  /** Monday of week 1, "YYYY-MM-DD". */
  startDate: string;
  totalWeeks: number;
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add sport-day and term-week config types"
```

---

### Task 3: Seed the two `site_config` keys

**Files:**

- Modify: `supabase/seed/siteConfig.ts` (the `rows` array, currently lines 26–52)

No migration is needed — `site_config` is a generic `key/value` table (`supabase/migrations/0001_init.sql:220`) with public-read / admin-write RLS already in place.

- [ ] **Step 1: Add two rows to the `rows: Insert[]` array**

Insert these two entries inside the array (e.g. after the `carelin_kpis` row, before the closing `]`):

```ts
    {
      key: "sport_day",
      value: json({
        label: "★ Chitralada Sport Day 2026",
        startDate: "2026-05-23",
        totalDays: 3,
      }),
      updated_by_admin_id: adminId,
    },
    {
      key: "term_week",
      value: json({ term: 1, startDate: "2026-04-19", totalWeeks: 16 }),
      updated_by_admin_id: adminId,
    },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Run the seed** (idempotent `upsert(onConflict: "key")`; requires `SUPABASE_ALLOW_SEED=1` in `.env.local` and a reachable Supabase)

Run: `npm run seed`
Expected: log line for `site_config` reporting `7` rows (was 5), no error.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed/siteConfig.ts
git commit -m "feat: seed sport_day and term_week site_config keys"
```

---

### Task 4: `getSportDay` + `getTermWeek` query helpers

**Files:**

- Modify: `lib/queries/siteConfig.ts`

- [ ] **Step 1: Extend the imports at the top of the file**

The file currently starts with `import { createClient } from "@/lib/supabase/server";` and a types import. Add:

```ts
import { today, daysBetween, EN_MONTHS_ABBR } from "@/lib/time";
import type { SportDayConfig, TermWeekConfig } from "@/lib/types";
```

(`getValue<T>` is module-private in this file; the new helpers call it directly.)

- [ ] **Step 2: Append the view types + helpers at the end of the file**

```ts
export type SportDay = {
  label: string;
  dayOfN: number;
  totalDays: number;
  /** "D Mon" in English, e.g. "24 May". */
  dateLabel: string;
  eventsRemaining: number;
  isLive: boolean;
};

export async function getSportDay(): Promise<SportDay> {
  const cfg = await getValue<SportDayConfig>("sport_day");
  const todayISO = today();
  const elapsed = daysBetween(cfg.startDate, todayISO); // 0 on day 1
  const dayOfN = Math.min(Math.max(elapsed + 1, 1), cfg.totalDays);
  const isLive = elapsed >= 0 && elapsed < cfg.totalDays;

  const [, m, d] = todayISO.split("-").map(Number);
  const dateLabel = `${d} ${EN_MONTHS_ABBR[m - 1]}`;

  // "Remaining" = upcoming sport matches (same Team/Track/Show tag filter as
  // getStudentUpcomingSport) that have not started yet.
  const db = await createClient();
  const { count, error } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("category", "sport")
    .or("tag.ilike.Team · %,tag.ilike.Track · %,tag.ilike.Show · %")
    .gte("starts_at", new Date().toISOString());
  if (error) throw new Error(`getSportDay events: ${error.message}`);

  return {
    label: cfg.label,
    dayOfN,
    totalDays: cfg.totalDays,
    dateLabel,
    eventsRemaining: count ?? 0,
    isLive,
  };
}

export type TermWeek = { term: number; week: number; totalWeeks: number };

export async function getTermWeek(): Promise<TermWeek> {
  const cfg = await getValue<TermWeekConfig>("term_week");
  const elapsed = daysBetween(cfg.startDate, today());
  const week = Math.min(
    Math.max(Math.floor(elapsed / 7) + 1, 1),
    cfg.totalWeeks,
  );
  return { term: cfg.term, week, totalWeeks: cfg.totalWeeks };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/siteConfig.ts
git commit -m "feat: add getSportDay and getTermWeek queries"
```

---

### Task 5: Drive the sport hero + admin sport eyebrow from `getSportDay`

**Files:**

- Modify: `app/student/sport/page.tsx`
- Modify: `app/admin/sport/page.tsx`
- Modify: `lib/ui/sport.ts`

- [ ] **Step 1: Confirm `SPORT_HERO` has no other importers before removing it**

Run: `grep -rn "SPORT_HERO" app components lib`
Expected: only `app/student/sport/page.tsx` (import + usage) and `lib/ui/sport.ts` (definition). If anything else appears, stop and reassess.

- [ ] **Step 2: Student sport page — swap the import**

In `app/student/sport/page.tsx`, remove:

```ts
import { SPORT_HERO } from "@/lib/ui/sport";
```

and add to the existing siteConfig-less imports (group with the other `@/lib/queries/*` imports):

```ts
import { getSportDay } from "@/lib/queries/siteConfig";
```

- [ ] **Step 3: Student sport page — add to `Promise.all` and build props**

Change the destructured `Promise.all` (currently lines 16–20) to include `sportDay`:

```ts
const [leaderboard, liveResults, upcoming, sportDay] = await Promise.all([
  getLeaderboard(),
  getStudentLiveResults(),
  getStudentUpcomingSport(),
  getSportDay(),
]);
```

Replace `<SportHero {...SPORT_HERO} />` (line 44) with:

```tsx
<SportHero
  label={sportDay.label}
  title={`Day ${sportDay.dayOfN} of ${sportDay.totalDays}`}
  meta={`${sportDay.dateLabel}${sportDay.isLive ? " · Live" : ""} · ${sportDay.eventsRemaining} events remaining`}
/>
```

(The `SportHero` component already special-cases the `Live` token when it splits `meta` on `" · "`, so the highlight still works.)

- [ ] **Step 4: Admin sport page — import + fetch + compute eyebrow**

In `app/admin/sport/page.tsx`, add to the `@/lib/queries/*` imports:

```ts
import { getSportDay } from "@/lib/queries/siteConfig";
```

Change the `Promise.all` (currently lines 14–18) to:

```ts
const [scoreboard, results, upcoming, sportDay] = await Promise.all([
  getScoreboard(),
  getAdminSportResults(),
  getAdminUpcomingSport(),
  getSportDay(),
]);
```

Replace the static eyebrow (line 23):

```tsx
eyebrow = "Sport Day · Day 2 of 3 · Live";
```

with:

```tsx
        eyebrow={`Sport Day · Day ${sportDay.dayOfN} of ${sportDay.totalDays}${sportDay.isLive ? " · Live" : ""}`}
```

- [ ] **Step 5: Remove the dead constant**

In `lib/ui/sport.ts`, delete the entire `SPORT_HERO` export (lines 1–5), leaving the file starting at `export const HOUSES = [`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (a leftover `SPORT_HERO` reference would surface here).

- [ ] **Step 7: Commit**

```bash
git add app/student/sport/page.tsx app/admin/sport/page.tsx lib/ui/sport.ts
git commit -m "refactor: derive sport hero and eyebrow from sport_day config"
```

---

### Task 6: Drive the admin overview term/week eyebrow from `getTermWeek`

**Files:**

- Modify: `app/admin/page.tsx`

`AdminOverview` is currently a _synchronous_ component; the cards below stream via `<Suspense>`. We make the component `async` and `await getTermWeek()` (a single indexed-row read) before the topbar — consistent with `app/admin/sport/page.tsx`, which is already async. The card-level Suspense streaming is unaffected.

- [ ] **Step 1: Add the import**

In `app/admin/page.tsx`, after the existing imports add:

```ts
import { getTermWeek } from "@/lib/queries/siteConfig";
```

- [ ] **Step 2: Make the component async and compute the eyebrow**

Change the declaration (line 17) from:

```tsx
export default function AdminOverview() {
  return (
```

to:

```tsx
export default async function AdminOverview() {
  const { term, week, totalWeeks } = await getTermWeek();
  return (
```

Replace the static eyebrow (line 22):

```tsx
eyebrow = "Overview · Term 1 / Week 6 of 16";
```

with:

```tsx
        eyebrow={`Overview · Term ${term} / Week ${week} of ${totalWeeks}`}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.tsx
git commit -m "refactor: derive admin overview term/week from config"
```

---

### Task 7: Make both keys editable in the admin config editor

**Files:**

- Modify: `lib/ui/siteConfig.ts`
- Modify: `app/admin/config/actions.ts`
- Modify: `app/admin/config/[key]/edit/page.tsx`

- [ ] **Step 1: Register the keys + labels**

In `lib/ui/siteConfig.ts`, extend `EDITABLE_KEYS` (lines 3–9):

```ts
export const EDITABLE_KEYS = [
  "home_hero",
  "trend_chart",
  "portfolio_stats",
  "portfolio_kpis",
  "carelin_kpis",
  "sport_day",
  "term_week",
] as const;
```

and add to `KEY_LABELS` (lines 17–23):

```ts
  sport_day: { en: "Sport day", th: "วันกีฬาสี" },
  term_week: { en: "Term & week", th: "ภาคเรียน · สัปดาห์" },
```

- [ ] **Step 2: Add parsers + switch cases + revalidate branches in `actions.ts`**

Extend the types import (line 7) to include the new shapes:

```ts
import type {
  AdminKpi,
  HomeHero,
  House,
  PortfolioStats,
  SportDayConfig,
  TermWeekConfig,
} from "@/lib/types";
```

Add these two parsers (e.g. after `parsePortfolioStats`, before `parseTrendChart`):

```ts
function parseSportDay(formData: FormData): SportDayConfig {
  const label = str(formData, "label");
  const startDate = str(formData, "startDate");
  const totalDays = Number.parseInt(str(formData, "totalDays"), 10);
  if (!label) throw new Error("label required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    throw new Error("startDate must be YYYY-MM-DD");
  if (!Number.isFinite(totalDays) || totalDays < 1)
    throw new Error("totalDays must be ≥ 1");
  return { label, startDate, totalDays };
}

function parseTermWeek(formData: FormData): TermWeekConfig {
  const term = Number.parseInt(str(formData, "term"), 10);
  const startDate = str(formData, "startDate");
  const totalWeeks = Number.parseInt(str(formData, "totalWeeks"), 10);
  if (!Number.isFinite(term) || term < 1) throw new Error("term must be ≥ 1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    throw new Error("startDate must be YYYY-MM-DD");
  if (!Number.isFinite(totalWeeks) || totalWeeks < 1)
    throw new Error("totalWeeks must be ≥ 1");
  return { term, startDate, totalWeeks };
}
```

Add two cases to the `switch (key)` in `updateSiteConfig` (after the `trend_chart` case):

```ts
    case "sport_day":
      value = parseSportDay(formData) as unknown as Json;
      break;
    case "term_week":
      value = parseTermWeek(formData) as unknown as Json;
      break;
```

(The switch assigns `value` in every branch and `EditableKey` is now wider — omitting either case makes `tsc` flag "used before assigned", which is the guard.)

Add two branches to `revalidateFor` (after the `carelin_kpis` branch):

```ts
if (key === "sport_day") {
  revalidatePath("/student/sport");
  revalidatePath("/admin/sport");
  return;
}
if (key === "term_week") {
  revalidatePath("/admin");
  return;
}
```

- [ ] **Step 3: Add the form field sections in the edit page**

In `app/admin/config/[key]/edit/page.tsx`, extend the types import (line 7):

```ts
import type {
  AdminKpi,
  HomeHero,
  PortfolioStats,
  SportDayConfig,
  TermWeekConfig,
} from "@/lib/types";
```

Add two render conditionals inside the `<form>` (after the `trend_chart` line, currently line 57):

```tsx
{
  key === "sport_day" && <SportDayFields />;
}
{
  key === "term_week" && <TermWeekFields />;
}
```

Append these two field components at the end of the file (after `TrendChartFields`):

```tsx
async function SportDayFields() {
  const v = await getConfigByKey<SportDayConfig>("sport_day");
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className={LABEL_CLS}>Label (mono caps eyebrow)</span>
        <input
          name="label"
          type="text"
          required
          maxLength={120}
          defaultValue={v.label}
          className={INPUT_MONO}
        />
      </label>
      <label className="block">
        <span className={LABEL_CLS}>Start date (first competition day)</span>
        <input
          name="startDate"
          type="date"
          required
          defaultValue={v.startDate}
          className={INPUT_MONO}
        />
      </label>
      <label className="block">
        <span className={LABEL_CLS}>Total days</span>
        <input
          name="totalDays"
          type="number"
          min={1}
          required
          defaultValue={v.totalDays}
          className={INPUT_MONO}
        />
      </label>
    </div>
  );
}

async function TermWeekFields() {
  const v = await getConfigByKey<TermWeekConfig>("term_week");
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <label className="block">
        <span className={LABEL_CLS}>Term number</span>
        <input
          name="term"
          type="number"
          min={1}
          required
          defaultValue={v.term}
          className={INPUT_MONO}
        />
      </label>
      <label className="block">
        <span className={LABEL_CLS}>Week 1 start date (Monday)</span>
        <input
          name="startDate"
          type="date"
          required
          defaultValue={v.startDate}
          className={INPUT_MONO}
        />
      </label>
      <label className="block">
        <span className={LABEL_CLS}>Total weeks</span>
        <input
          name="totalWeeks"
          type="number"
          min={1}
          required
          defaultValue={v.totalWeeks}
          className={INPUT_MONO}
        />
      </label>
    </div>
  );
}
```

(`<input type="date">` consumes/produces `YYYY-MM-DD`, matching `startDate`.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/ui/siteConfig.ts app/admin/config/actions.ts "app/admin/config/[key]/edit/page.tsx"
git commit -m "feat: edit sport_day and term_week in admin config"
```

---

### Task 8: Final verification

**Files:** none (verification + formatting only)

- [ ] **Step 1: Format**

Run: `npm run format`
Expected: prettier writes any formatting fixes.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Typecheck (whole tree)**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual UI smoke** (requires `npm run seed` from Task 3 to have run)

Run: `npm run dev`, then check:

- `/student/sport` — hero shows "Day 2 of 3" and "24 May · Live · N events remaining" (N = real upcoming-sport count).
- `/admin/sport` — eyebrow shows "Sport Day · Day 2 of 3 · Live".
- `/admin` — eyebrow shows "Overview · Term 1 / Week 6 of 16".
- `/admin/config` — lists "Sport day" and "Term & week"; open each, change `totalDays`/`totalWeeks`, save, and confirm the figures above update.

- [ ] **Step 5: Commit any formatting changes (if Step 1 modified files)**

```bash
git add -A
git commit -m "chore: format"
```

---

## Self-Review

**Spec coverage:**

- Finding #1 (sport hero `SPORT_HERO`) → Tasks 4 + 5. ✅
- Finding #2 (admin overview "Term 1 / Week 6 of 16") → Tasks 4 + 6. ✅
- Finding #3 (admin sport "Day 2 of 3 · Live") → Tasks 4 + 5. ✅
- Editable from the admin config editor (chosen "compute dynamically", anchors editable) → Task 7. ✅
- Seed so the keys exist (queries throw on missing key) → Task 3, ordered before consumers. ✅

**Type consistency:**

- `SportDayConfig`/`TermWeekConfig` (stored shapes) defined in Task 2, consumed in Tasks 4 + 7 — names match.
- `getSportDay`/`getTermWeek` defined in Task 4, imported in Tasks 5 + 6 — names match.
- `SportHero` component prop names (`label`, `title`, `meta`) match the JSX in Task 5 Step 3 (verified against `components/student/SportHero.tsx`).
- Field `name` attributes (`label`, `startDate`, `totalDays`, `term`, `totalWeeks`) in Task 7 Step 3 match the `str(formData, ...)` keys in the Task 7 Step 2 parsers.

**Placeholder scan:** No TBD/TODO/"add validation" placeholders — every code step contains the literal code.

**Ordering check:** types → seed (DB populated) → queries → consumers → editor. A consumer can never run against a missing key in normal dev flow.
