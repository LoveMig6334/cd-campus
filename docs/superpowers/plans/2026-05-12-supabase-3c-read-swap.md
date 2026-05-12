# Phase 3c — Supabase Read Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every `import … from "@/supabase/seed/data/…"` in `app/` and `components/` with async fetches against the Supabase server client, while keeping pixel-identical visual output. After 3c, the seed-data files exist solely to feed the seed script.

**Architecture:** New `lib/queries/<entity>.ts` helpers wrap `supabase.from("...").select()` calls and return shapes that match the existing TS types one-for-one. Pure UI configuration (calendar chips, booking tabs, day-grid skeleton, etc.) moves to `lib/ui/<topic>.ts`. Shared types and constants (CATEGORY_COLOR, House, etc.) move to `lib/types.ts`. Each page becomes `async`, awaits its data, and passes it to the existing presentational components unchanged.

**Tech Stack:** Next.js 16 App Router (Server Components default; routes become dynamic automatically because the Supabase server client reads `cookies()`), `@supabase/ssr`, generated `Database` types from `lib/supabase/database.types.ts`.

**Spec:** [`docs/superpowers/specs/2026-05-12-supabase-migration-design.md`](../specs/2026-05-12-supabase-migration-design.md) §3c.

---

## Departures from skill defaults

**No automated tests.** Same rationale as 3a/3b. Verification is the build, eyeballing pages in the dev server, and a final grep for `@/supabase/seed/data` imports anywhere outside `supabase/seed/`.

**Commit cadence per task.** Each task ends with a single commit. The plan deliberately keeps each task scoped to ≤2 routes so the diff stays reviewable.

**No caching.** Per spec, pages render dynamically — one DB round-trip per request. Cookie reads via the Supabase server client mark every consuming route as dynamic automatically; no `export const dynamic = 'force-dynamic'` needed.

---

## File structure (post-3c)

| Path                          | Purpose                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                | All TS types currently in `supabase/seed/data/types.ts` + `CATEGORY_COLOR` constant. **Moved** (was the seed-data types module).                                                                         |
| `lib/ui/calendar.ts`          | `CALENDAR_CHIPS`, the static May 2026 day-grid skeleton (which days are in-month / today / selected / closed), `SELECTED_DAY_LABEL`.                                                                     |
| `lib/ui/booking.ts`           | `BOOKING_TABS`, `BOOKING_ACTIVE_TAB`, `BOOKING_PERIODS`, `BOOKING_CONFIRM_EYEBROW`, the static May day grid for booking, `BOOKING_ROOM_STATUS_BY_NAME` map.                                              |
| `lib/ui/pshare.ts`            | `PSHARE_TAGS`, `PSHARE_ACTIVE_TAG`.                                                                                                                                                                      |
| `lib/ui/portfolio.ts`         | `PORTFOLIO_TABS`, `PORTFOLIO_ACTIVE_TAB`.                                                                                                                                                                |
| `lib/ui/carelin.ts`           | `CARELIN_DESK_TABS`, `CARELIN_DESK_ACTIVE_TAB`.                                                                                                                                                          |
| `lib/ui/sport.ts`             | `SPORT_HERO` (label/title/meta).                                                                                                                                                                         |
| `lib/ui/admin.ts`             | `ADMIN_BOOKING_DATE`, `GANTT_HOURS`, `PLACEMENT_COLOR`.                                                                                                                                                  |
| `lib/queries/util.ts`         | Shared mapping helpers: `KEY_BY_HOUSE_ID`, `cssColorForCategory`.                                                                                                                                        |
| `lib/queries/houses.ts`       | `getHouses()`, `getScoreboard()`, `getLeaderboard()`.                                                                                                                                                    |
| `lib/queries/rooms.ts`        | `getMusicRooms()`, `getRoomsByKind(kind)`.                                                                                                                                                               |
| `lib/queries/events.ts`       | `getStudentMonth()`, `getStudentDayEvents(day)`, `getAdminMonth()`, `getAdminTodayEvents()`, `getStudentUpcomingSport()`, `getAdminUpcomingSport()`.                                                     |
| `lib/queries/sportResults.ts` | `getAdminSportResults()`, `getStudentLiveResults()`.                                                                                                                                                     |
| `lib/queries/bookings.ts`     | `getAdminTodayBookings()`, `getGanttRooms()`, `getRecentBookings()`.                                                                                                                                     |
| `lib/queries/projects.ts`     | `getStudentProjects()`, `getAdminPortfolioRows()`.                                                                                                                                                       |
| `lib/queries/pshare.ts`       | `getStudentPshareFeed()`.                                                                                                                                                                                |
| `lib/queries/carelin.ts`      | `getCarelinRequests()`, `getCarelinDeskRows()`.                                                                                                                                                          |
| `lib/queries/siteConfig.ts`   | `getHomeHero()`, `getAdminGreeting()`, `getOverviewKpis()`, `getPortfolioStats()`, `getPortfolioKpis()`, `getCarelinKpis()`, `getTrendChart()`.                                                          |
| `supabase/seed/data/*.ts`     | **Trimmed.** Each file retains only the typed mock arrays the seed script consumes — every static-UI export is moved out, and every `import … from "./types"` is rewritten to import from `@/lib/types`. |

---

## Constants used across the plan

**House key ↔ id:**

| `houses.id` | `House` key |
| ----------- | ----------- |
| 1           | `green`     |
| 2           | `purple`    |
| 3           | `orange`    |
| 4           | `pink`      |

`KEY_BY_HOUSE_ID` (in `lib/queries/util.ts`) is the inverse of the seed's `HOUSE_ID_BY_KEY`.

**Anchor month:** May 2026 (`year=2026, month=5`). The mock data was built around this month and 3c maintains that assumption.

**Today (in the prototype):** `2026-05-12` (mirrors the seeded BigCal `isToday` and the "today" state on the student calendar grid).

**Selected day (student calendar):** `2026-05-13`.

**Closed days (student booking grid):** May 1, 6, 21.

---

## Tasks

### Task 1: Move types and CATEGORY_COLOR to `lib/types.ts`

**Files:**

- Create: `lib/types.ts` (moved-from `supabase/seed/data/types.ts`)
- Delete: `supabase/seed/data/types.ts`
- Modify: every `app/**`, `components/**`, and `supabase/seed/data/*.ts` file that imports from `./types` or `@/supabase/seed/data/types`.

- [ ] **Step 1: Move the file**

```bash
git mv supabase/seed/data/types.ts lib/types.ts
```

- [ ] **Step 2: Rewrite imports under `app/` and `components/`**

```bash
grep -rln "@/supabase/seed/data/types" app components \
  | xargs sed -i '' 's|@/supabase/seed/data/types|@/lib/types|g'
```

- [ ] **Step 3: Rewrite relative imports inside the seed-data files**

`supabase/seed/data/*.ts` import `./types` for type definitions. Rewrite them to import from `@/lib/types`:

```bash
grep -rln 'from "./types"' supabase/seed/data \
  | xargs sed -i '' 's|from "./types"|from "@/lib/types"|g'
```

- [ ] **Step 4: Verify zero references to the old path remain**

```bash
grep -rn "supabase/seed/data/types\|from \"./types\"" app components supabase 2>/dev/null \
  || echo "ok: no stale type imports"
```

Expected: prints `ok: no stale type imports`.

- [ ] **Step 5: Lint + build**

```bash
npm run lint && npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "move types to lib/types.ts; rewrite imports"
```

---

### Task 2: Move static UI config out of seed-data

**Files:**

- Create: `lib/ui/calendar.ts`, `lib/ui/booking.ts`, `lib/ui/pshare.ts`, `lib/ui/portfolio.ts`, `lib/ui/carelin.ts`, `lib/ui/sport.ts`, `lib/ui/admin.ts`
- Modify: components that import these constants (CalendarLegend, EventResultsTable, others)

This task isolates static UI configuration so per-page swap tasks only need to swap dynamic data.

- [ ] **Step 1: Create `lib/ui/calendar.ts`**

```ts
import type { CalendarChip, CalendarDay } from "@/lib/types";

export const CALENDAR_CHIPS: CalendarChip[] = [
  { id: "all", labelEn: "All" },
  { id: "sport", labelEn: "Sport" },
  { id: "tradition", labelEn: "Tradition" },
  { id: "music", labelEn: "Music" },
  { id: "admin", labelEn: "Admin" },
  { id: "academic", labelEn: "Academic" },
];

export const SELECTED_DAY_LABEL = "Events on 13 May";

const make = (
  num: number,
  opts: Partial<Omit<CalendarDay, "num">> = {},
): CalendarDay => ({ num, inMonth: true, ...opts });

const other = (num: number): CalendarDay => ({ num, inMonth: false });

// Skeleton for May 2026 — which cells are in-month, today (12), selected (13).
// Dots are populated by the events query layer.
export const MAY_2026_SKELETON: CalendarDay[] = [
  // leading April 26–30 (Sun-Thu)
  other(26),
  other(27),
  other(28),
  other(29),
  other(30),
  make(1),
  make(2),
  // 3–9
  make(3),
  make(4),
  make(5),
  make(6),
  make(7),
  make(8),
  make(9),
  // 10–16
  make(10),
  make(11),
  make(12, { state: "today" }),
  make(13, { state: "selected" }),
  make(14),
  make(15),
  make(16),
  // 17–23
  make(17),
  make(18),
  make(19),
  make(20),
  make(21),
  make(22),
  make(23),
  // 24–30
  make(24),
  make(25),
  make(26),
  make(27),
  make(28),
  make(29),
  make(30),
  // 31 + trailing June 1–6
  make(31),
  other(1),
  other(2),
  other(3),
  other(4),
  other(5),
  other(6),
];
```

- [ ] **Step 2: Create `lib/ui/booking.ts`**

```ts
import type { BookingPeriod, BookingTab, CalendarDay } from "@/lib/types";

export const BOOKING_TABS: BookingTab[] = [
  { id: "music", labelEn: "Music", labelTh: "ห้องดนตรี" },
  { id: "meeting", labelEn: "Meeting", labelTh: "ห้องประชุม" },
];

export const BOOKING_ACTIVE_TAB: BookingTab["id"] = "music";

export const BOOKING_PERIODS: BookingPeriod[] = [
  { label: "Morning", time: "08:00 — 11:00", status: "available" },
  { label: "Midday", time: "11:30 — 14:30", status: "selected" },
  { label: "Evening", time: "15:00 — 18:00", status: "booked" },
];

export const BOOKING_CONFIRM_EYEBROW = "13 MAY · MIDDAY · MUSIC ROOM 1";

const make = (
  num: number,
  opts: Partial<Omit<CalendarDay, "num">> = {},
): CalendarDay => ({ num, inMonth: true, ...opts });

const other = (num: number): CalendarDay => ({ num, inMonth: false });

/** May 2026 with 1, 6, 21 closed, 12 today, 13 selected — booking variant has no dots. */
export const BOOKING_MAY_DAYS: CalendarDay[] = [
  other(26),
  other(27),
  other(28),
  other(29),
  other(30),
  make(1, { state: "closed" }),
  make(2),
  make(3),
  make(4),
  make(5),
  make(6, { state: "closed" }),
  make(7),
  make(8),
  make(9),
  make(10),
  make(11),
  make(12, { state: "today" }),
  make(13, { state: "selected" }),
  make(14),
  make(15),
  make(16),
  make(17),
  make(18),
  make(19),
  make(20),
  make(21, { state: "closed" }),
  make(22),
  make(23),
  make(24),
  make(25),
  make(26),
  make(27),
  make(28),
  make(29),
  make(30),
  make(31),
  other(1),
  other(2),
  other(3),
  other(4),
  other(5),
  other(6),
];

/** Demo "free/full" overlay for the 4 student-facing music rooms. */
export const BOOKING_ROOM_STATUS_BY_NAME: Record<string, "free" | "full"> = {
  "Music Room 1": "free",
  "Music Room 2": "free",
  "Music Room 3": "full",
  "Studio Room": "free",
};
```

- [ ] **Step 3: Create `lib/ui/pshare.ts`**

```ts
import type { PshareTagFilter } from "@/lib/types";

export const PSHARE_TAGS: PshareTagFilter[] = [
  "All",
  "#math-olympiad",
  "#physics",
  "#sci-project",
  "#thai-essay",
  "#tcas",
  "#life",
];

export const PSHARE_ACTIVE_TAG: PshareTagFilter = "All";
```

- [ ] **Step 4: Create `lib/ui/portfolio.ts`**

```ts
import type { AdminTabItem } from "@/lib/types";

export const PORTFOLIO_TABS: AdminTabItem[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "review", label: "Under review" },
  { id: "draft", label: "Draft" },
  { id: "featured", label: "Featured" },
];

export const PORTFOLIO_ACTIVE_TAB = "all";
```

- [ ] **Step 5: Create `lib/ui/carelin.ts`**

```ts
import type { AdminTabItem } from "@/lib/types";

export const CARELIN_DESK_TABS: AdminTabItem[] = [
  { id: "all", label: "All", count: 19 },
  { id: "open", label: "Open", count: 7 },
  { id: "answered", label: "Answered", count: 12 },
];

export const CARELIN_DESK_ACTIVE_TAB = "all";
```

- [ ] **Step 6: Create `lib/ui/sport.ts`**

```ts
export const SPORT_HERO = {
  label: "★ Chitralada Sport Day 2026",
  title: "Day 2 of 3",
  meta: "12 May · Live · 6 events remaining",
} as const;
```

- [ ] **Step 7: Create `lib/ui/admin.ts`**

```ts
import { CATEGORY_COLOR } from "@/lib/types";

export const ADMIN_BOOKING_DATE = "13 May 2026";

export const GANTT_HOURS = [
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
] as const;

/** Color used for placement-rank pills (rank → CSS color). */
export const PLACEMENT_COLOR: Record<1 | 2 | 3 | 4, string> = {
  1: CATEGORY_COLOR.academic,
  2: CATEGORY_COLOR.sport,
  3: CATEGORY_COLOR.tradition,
  4: CATEGORY_COLOR.music,
};
```

- [ ] **Step 8: Rewrite component imports for the moved constants**

`EventResultsTable.tsx` imports `PLACEMENT_COLOR` from `@/supabase/seed/data/admin-sport`. Retarget it to the new location:

```bash
sed -i '' \
  's|@/supabase/seed/data/admin-sport|@/lib/ui/admin|g' \
  components/admin/EventResultsTable.tsx
```

(`CalendarLegend.tsx` already imports `CATEGORY_COLOR` from `@/lib/types` after Task 1's rewrite — no change needed. `TrendChart` is refactored in Task 10.)

- [ ] **Step 9: Verify build is still green**

```bash
npm run lint && npm run build
```

Note: at this point seed-data files still contain their static-UI exports (we have NOT yet stripped them from `bookings.ts`, `calendar.ts`, etc.) — that strip happens in Task 16. Pages still import from seed-data for now. The new `lib/ui/` files duplicate the constants temporarily; that's intentional. Per-page swap tasks will retarget imports.

Expected: lint + build pass.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "extract static ui config to lib/ui/*"
```

---

### Task 3: Build query helpers — utility + houses + rooms

**Files:**

- Create: `lib/queries/util.ts`, `lib/queries/houses.ts`, `lib/queries/rooms.ts`

- [ ] **Step 1: Create `lib/queries/util.ts`**

```ts
import type { Database } from "@/lib/supabase/database.types";
import type { House } from "@/lib/types";

export type DB = Database;

export const KEY_BY_HOUSE_ID: Record<number, House> = {
  1: "green",
  2: "purple",
  3: "orange",
  4: "pink",
};

export function houseKeyFromId(id: number): House {
  const key = KEY_BY_HOUSE_ID[id];
  if (!key) throw new Error(`Unknown house id: ${id}`);
  return key;
}
```

- [ ] **Step 2: Create `lib/queries/houses.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { LeaderRow, ScoreboardEntry } from "@/lib/types";
import { houseKeyFromId } from "./util";

export async function getScoreboard(): Promise<ScoreboardEntry[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("houses")
    .select("id, name_en, name_th, current_score, stat_summary, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`getScoreboard: ${error.message}`);
  return (data ?? []).map((h, i) => ({
    house: houseKeyFromId(h.id),
    nameEn: h.name_en,
    nameTh: h.name_th,
    rankSubtitle: `House #${i + 1}`,
    score: h.current_score,
    stat: h.stat_summary ?? "",
  }));
}

export async function getLeaderboard(): Promise<LeaderRow[]> {
  const scoreboard = await getScoreboard();
  if (scoreboard.length === 0) return [];
  const top = scoreboard[0].score || 1;
  return scoreboard.map((s, i) => ({
    rank: i + 1,
    house: s.house,
    nameEn: s.nameEn,
    nameTh: s.nameTh,
    score: s.score,
    barPct: Math.round((s.score / top) * 100),
  }));
}
```

- [ ] **Step 3: Create `lib/queries/rooms.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";
import { BOOKING_ROOM_STATUS_BY_NAME } from "@/lib/ui/booking";

export async function getMusicRooms(): Promise<Room[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("rooms")
    .select("name_en, name_th, kind, sort_order")
    .eq("kind", "music")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`getMusicRooms: ${error.message}`);
  return (data ?? []).map((r) => ({
    nameEn: r.name_en,
    nameTh: r.name_th,
    status: BOOKING_ROOM_STATUS_BY_NAME[r.name_en] ?? "free",
  }));
}
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/queries/
git commit -m "queries: util + houses + rooms"
```

Expected: tsc clean. Commit creates 3 files.

---

### Task 4: Build query helpers — events

**Files:**

- Create: `lib/queries/events.ts`

`events` is the most reused entity. The helper provides shape-specific functions for each consumer:

- `getStudentMonth(year, month)` returns the student calendar grid (`CalendarDay[]`) with dots derived from category counts per day, layered on top of the static `MAY_2026_SKELETON`.
- `getStudentDayEvents(year, month, day)` returns `CalendarEvent[]` for that day, sorted by time.
- `getAdminMonth(year, month)` returns the admin BigCal grid (`BigCalDay[]`).
- `getAdminTodayEvents()` returns `AdminEvent[]` for today (2026-05-12), with `barColor` derived from category.
- `getStudentUpcomingSport(limit)` returns `CalendarEvent[]` of future `sport` events.
- `getAdminUpcomingSport(limit)` — same data, alias for the admin view.

- [ ] **Step 1: Write the file**

```ts
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_COLOR,
  type AdminEvent,
  type BigCalDay,
  type BigCalEvent,
  type CalendarCategory,
  type CalendarDay,
  type CalendarEvent,
} from "@/lib/types";
import { MAY_2026_SKELETON } from "@/lib/ui/calendar";

/**
 * Tag-based discriminator for which "view" each event belongs to:
 *
 *   tag IS NULL              → BigCal-style structural event (Phase 2 ADMIN_MAY_2026)
 *   tag LIKE 'Sport · %'     → admin overview today-card / student day-events on the selected day
 *   tag LIKE 'Music · %'     → same
 *   tag LIKE 'Admin · %'     → same
 *   tag LIKE 'Academic · %'  → same
 *   tag LIKE 'Tradition · %' → same
 *   tag LIKE 'Team · %'      → upcoming-sport chip
 *   tag LIKE 'Track · %'     → upcoming-sport chip
 *   tag LIKE 'Show · %'      → upcoming-sport chip
 *
 * The seed inserts events with tags matching these prefixes, so queries can
 * select the appropriate slice for each consumer.
 */
const TODAY_TAG_PREFIXES = ["Sport", "Music", "Admin", "Academic", "Tradition"];
const TODAY_TAG_FILTER = TODAY_TAG_PREFIXES.map(
  (p) => `tag.ilike.${p} · %`,
).join(",");

type EventRow = {
  id: string;
  title_th: string;
  title_en: string | null;
  tag: string | null;
  category: CalendarCategory;
  starts_at: string;
  highlight: boolean;
};

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`;
  const next =
    month === 12
      ? `${year + 1}-01-01T00:00:00+07:00`
      : `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+07:00`;
  return { start, next };
}

function dayOf(starts_at: string): number {
  // Asia/Bangkok-anchored ISO; we parse the day digits directly to avoid TZ drift.
  // Example: "2026-05-13T15:30:00+07:00" → 13
  const match = starts_at.match(/-\d{2}-(\d{2})T/);
  return match ? parseInt(match[1], 10) : 0;
}

function timeOf(starts_at: string): string {
  const match = starts_at.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "00:00";
}

export async function getStudentMonth(
  year: number,
  month: number,
): Promise<CalendarDay[]> {
  const db = await createClient();
  const { start, next } = monthRange(year, month);
  const { data, error } = await db
    .from("events")
    .select("title_th, category, starts_at, highlight")
    .gte("starts_at", start)
    .lt("starts_at", next)
    .is("tag", null) // BigCal-style only
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getStudentMonth: ${error.message}`);
  const rows = (data ?? []) as Pick<
    EventRow,
    "title_th" | "category" | "starts_at" | "highlight"
  >[];

  // Highlight events contribute YELLOW only (not their category color),
  // matching the prototype's `[C.sport, YELLOW]` shape on May 12.
  const yellow = "var(--color-yellow)";
  const dotsByDay = new Map<number, string[]>();
  for (const r of rows) {
    const day = dayOf(r.starts_at);
    if (!dotsByDay.has(day)) dotsByDay.set(day, []);
    const dots = dotsByDay.get(day)!;
    if (r.highlight) {
      if (!dots.includes(yellow)) dots.push(yellow);
    } else {
      const color = CATEGORY_COLOR[r.category];
      if (!dots.includes(color)) dots.push(color);
    }
  }

  return MAY_2026_SKELETON.map((cell) => {
    if (!cell.inMonth) return cell;
    const dots = dotsByDay.get(cell.num);
    return dots && dots.length ? { ...cell, dots } : cell;
  });
}

export async function getStudentDayEvents(
  year: number,
  month: number,
  day: number,
): Promise<CalendarEvent[]> {
  const db = await createClient();
  const dayStart = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+07:00`;
  const dayEnd = `${year}-${String(month).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}T00:00:00+07:00`;
  const { data, error } = await db
    .from("events")
    .select("title_th, tag, category, starts_at")
    .gte("starts_at", dayStart)
    .lt("starts_at", dayEnd)
    .not("tag", "is", null) // day-events have a tag
    .or(TODAY_TAG_FILTER) // exclude sport-upcoming Team/Track/Show tags
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getStudentDayEvents: ${error.message}`);
  return (data ?? []).map<CalendarEvent>((r) => ({
    time: timeOf(r.starts_at),
    titleTh: r.title_th,
    tag: r.tag ?? "",
    category: r.category as CalendarCategory,
  }));
}

export async function getAdminMonth(
  year: number,
  month: number,
): Promise<BigCalDay[]> {
  const db = await createClient();
  const { start, next } = monthRange(year, month);
  const { data, error } = await db
    .from("events")
    .select("title_th, category, starts_at, highlight")
    .gte("starts_at", start)
    .lt("starts_at", next)
    .is("tag", null) // BigCal-style only
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getAdminMonth: ${error.message}`);

  const byDay = new Map<number, BigCalEvent[]>();
  for (const r of (data ?? []) as Pick<
    EventRow,
    "title_th" | "category" | "starts_at" | "highlight"
  >[]) {
    const day = dayOf(r.starts_at);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({
      title: r.title_th,
      variant: r.highlight ? "highlight" : r.category,
    });
  }

  const make = (
    num: number,
    rest: Partial<Omit<BigCalDay, "num">> = {},
  ): BigCalDay => ({ num, inMonth: true, ...rest });
  const other = (num: number): BigCalDay => ({ num, inMonth: false });

  const grid: BigCalDay[] = [
    other(26),
    other(27),
    other(28),
    other(29),
    other(30),
    make(1),
    make(2),
    make(3),
    make(4),
    make(5),
    make(6),
    make(7),
    make(8),
    make(9),
    make(10),
    make(11),
    make(12, { isToday: true }),
    make(13),
    make(14),
    make(15),
    make(16),
    make(17),
    make(18),
    make(19),
    make(20),
    make(21),
    make(22),
    make(23),
    make(24),
    make(25),
    make(26),
    make(27),
    make(28),
    make(29),
    make(30),
    make(31),
    other(1),
    other(2),
    other(3),
    other(4),
    other(5),
    other(6),
  ];
  return grid.map((cell) => {
    if (!cell.inMonth) return cell;
    const events = byDay.get(cell.num);
    return events && events.length ? { ...cell, events } : cell;
  });
}

export async function getAdminTodayEvents(): Promise<AdminEvent[]> {
  // "Today" in the prototype is 2026-05-12. Today-card entries have tags
  // starting with a CalendarCategory name; upcoming-sport entries have
  // tag prefixes Team/Track/Show, which we explicitly exclude.
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select("title_th, tag, category, starts_at")
    .gte("starts_at", "2026-05-12T00:00:00+07:00")
    .lt("starts_at", "2026-05-13T00:00:00+07:00")
    .eq("highlight", false)
    .not("tag", "is", null)
    .or(TODAY_TAG_FILTER)
    .order("starts_at", { ascending: true })
    .limit(4);
  if (error) throw new Error(`getAdminTodayEvents: ${error.message}`);
  return (data ?? []).map<AdminEvent>((r) => ({
    time: timeOf(r.starts_at),
    title: r.title_th,
    tag: r.tag ?? "",
    barColor: CATEGORY_COLOR[r.category as CalendarCategory],
  }));
}

export async function getStudentUpcomingSport(
  limit = 2,
): Promise<CalendarEvent[]> {
  // Sport-upcoming entries have tag prefixes Team/Track/Show.
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select("title_th, tag, category, starts_at")
    .eq("category", "sport")
    .or("tag.ilike.Team · %,tag.ilike.Track · %,tag.ilike.Show · %")
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getStudentUpcomingSport: ${error.message}`);
  return (data ?? []).map<CalendarEvent>((r) => ({
    time: timeOf(r.starts_at),
    titleTh: r.title_th,
    tag: r.tag ?? "",
    category: "sport",
  }));
}

export async function getAdminUpcomingSport(
  limit = 3,
): Promise<CalendarEvent[]> {
  return getStudentUpcomingSport(limit);
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/queries/events.ts
git commit -m "queries: events (student + admin views, calendar grids)"
```

---

### Task 5: Build query helpers — sport_results, bookings, projects

**Files:**

- Create: `lib/queries/sportResults.ts`, `lib/queries/bookings.ts`, `lib/queries/projects.ts`

- [ ] **Step 1: Create `lib/queries/sportResults.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { LiveResult, SportResultRow } from "@/lib/types";
import { houseKeyFromId } from "./util";

export async function getAdminSportResults(): Promise<SportResultRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("sport_results")
    .select("title_th, title_en, category, placements, time_label, recorded_at")
    .order("recorded_at", { ascending: true });
  if (error) throw new Error(`getAdminSportResults: ${error.message}`);
  return (data ?? []).map<SportResultRow>((r) => ({
    titleTh: r.title_th,
    titleEn: r.title_en ?? "",
    category: r.category as SportResultRow["category"],
    placements: (r.placements ?? []).map(houseKeyFromId),
    time: r.time_label ?? "",
  }));
}

export async function getStudentLiveResults(limit = 2): Promise<LiveResult[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("sport_results")
    .select("title_th, category, placements")
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getStudentLiveResults: ${error.message}`);
  const labelByCategory: Record<string, string> = {
    Track: "Track · เพิ่งจบ",
    Team: "Team · จบเกม",
  };
  return (data ?? []).map<LiveResult>((r) => ({
    titleTh: r.title_th,
    metaEn: labelByCategory[r.category] ?? r.category,
    placements: (r.placements ?? []).map(houseKeyFromId),
    icon: r.category === "Track" ? "running" : "ball",
  }));
}
```

- [ ] **Step 2: Create `lib/queries/bookings.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type {
  AdminBookingRow,
  AdminTodayBookingRow,
  GanttBar,
  GanttBarVariant,
  GanttRoom,
} from "@/lib/types";

const TODAY = "2026-05-12";

function timeFromTimestamp(ts: string): string {
  const match = ts.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "00:00";
}

function ganttPctFromTime(
  time: string,
  dir: "left" | "width",
  end?: string,
): number {
  // Gantt spans 08:00 → 18:00 → 10 hours of width.
  const span = 10 * 60; // minutes
  const [hh, mm] = time.split(":").map(Number);
  const startMin = hh * 60 + mm - 8 * 60;
  if (dir === "left") return Math.round((startMin / span) * 100);
  if (!end) return 0;
  const [eh, em] = end.split(":").map(Number);
  const endMin = eh * 60 + em - 8 * 60;
  return Math.round(((endMin - startMin) / span) * 100);
}

export async function getAdminTodayBookings(): Promise<AdminTodayBookingRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select(
      "user_label, purpose, starts_at, ends_at, status, rooms!inner(name_en)",
    )
    .gte("starts_at", `${TODAY}T00:00:00+07:00`)
    .lt("starts_at", `2026-05-13T00:00:00+07:00`)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getAdminTodayBookings: ${error.message}`);
  return (data ?? []).map<AdminTodayBookingRow>((b) => {
    const room = b.rooms as unknown as { name_en: string } | null;
    return {
      room: room?.name_en ?? "",
      user: b.user_label,
      start: timeFromTimestamp(b.starts_at),
      end: timeFromTimestamp(b.ends_at),
      purpose: b.purpose ?? "",
      status: b.status as AdminTodayBookingRow["status"],
    };
  });
}

export async function getGanttRooms(): Promise<GanttRoom[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select(
      "user_label, starts_at, ends_at, bar_variant, purpose, rooms!inner(name_en, name_th, sort_order)",
    )
    .gte("starts_at", `${TODAY}T00:00:00+07:00`)
    .lt("starts_at", `2026-05-13T00:00:00+07:00`)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getGanttRooms: ${error.message}`);

  type Row = {
    user_label: string;
    starts_at: string;
    ends_at: string;
    bar_variant: GanttBarVariant;
    purpose: string | null;
    rooms: {
      name_en: string;
      name_th: string;
      sort_order: number | null;
    } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const byRoom = new Map<string, GanttRoom>();
  for (const r of rows) {
    if (!r.rooms) continue;
    const key = r.rooms.name_en;
    if (!byRoom.has(key)) {
      byRoom.set(key, {
        nameEn: r.rooms.name_en,
        nameTh: r.rooms.name_th,
        bars: [],
      });
    }
    const room = byRoom.get(key)!;
    const start = timeFromTimestamp(r.starts_at);
    const end = timeFromTimestamp(r.ends_at);
    const bar: GanttBar = {
      who: r.user_label,
      meta: `${start} — ${end}${r.purpose ? ` · ${r.purpose}` : ""}`,
      leftPct: ganttPctFromTime(start, "left"),
      widthPct: ganttPctFromTime(start, "width", end),
      variant: r.bar_variant === "default" ? undefined : r.bar_variant,
    };
    room.bars.push(bar);
  }
  // Also surface rooms with no bookings (for visual parity with the static GANTT_ROOMS).
  const allRoomsRes = await db
    .from("rooms")
    .select("name_en, name_th, sort_order")
    .order("sort_order", { ascending: true });
  if (allRoomsRes.error) {
    throw new Error(`getGanttRooms rooms: ${allRoomsRes.error.message}`);
  }
  for (const r of allRoomsRes.data ?? []) {
    if (!byRoom.has(r.name_en)) {
      byRoom.set(r.name_en, { nameEn: r.name_en, nameTh: r.name_th, bars: [] });
    }
  }
  const sortMap = new Map(
    (allRoomsRes.data ?? []).map((r) => [r.name_en, r.sort_order ?? 0]),
  );
  return [...byRoom.values()].sort(
    (a, b) => (sortMap.get(a.nameEn) ?? 0) - (sortMap.get(b.nameEn) ?? 0),
  );
}

const ROOM_TH_BY_EN: Record<string, string> = {
  "Music Room 1": "เปียโน · กลอง",
  "Music Room 2": "กีตาร์",
  "Music Room 3": "วงดุริยางค์",
  "Studio Room": "ห้องอัด",
  "Conference 2": "ห้องประชุมเล็ก",
  "Conference 3": "ห้องประชุมใหญ่",
};

function formatStart(ts: string): string {
  // "2026-05-13T11:30:00+07:00" → "13 May · 11:30"
  const match = ts.match(/-(\d{2})T(\d{2}:\d{2})/);
  if (!match) return ts;
  const monthMap: Record<string, string> = { "05": "May" };
  const dayMatch = ts.match(/-(\d{2})-(\d{2})T/);
  if (!dayMatch) return ts;
  return `${parseInt(dayMatch[2], 10)} ${monthMap[dayMatch[1]] ?? dayMatch[1]} · ${match[2]}`;
}

export async function getRecentBookings(limit = 5): Promise<AdminBookingRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select("user_label, starts_at, ends_at, status, rooms!inner(name_en)")
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getRecentBookings: ${error.message}`);
  return (data ?? []).map<AdminBookingRow>((b) => {
    const room = b.rooms as unknown as { name_en: string } | null;
    const roomEn = room?.name_en ?? "";
    return {
      roomEn,
      roomTh: ROOM_TH_BY_EN[roomEn] ?? "",
      user: b.user_label,
      klass: "—",
      start: formatStart(b.starts_at),
      end: timeFromTimestamp(b.ends_at),
      status: b.status as AdminBookingRow["status"],
    };
  });
}
```

- [ ] **Step 3: Create `lib/queries/projects.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type {
  PortfolioAdminRow,
  PortfolioIconKey,
  PortfolioTagPill,
  PortfolioThumbIcon,
  Project,
} from "@/lib/types";

function trimAuthor(line: string): string {
  // "ธรรศ์ × นนท์ — Y9 / 2025" → "ธรรศ์ × นนท์"
  const idx = line.indexOf("—");
  return idx === -1 ? line : line.slice(0, idx).trim();
}

function fmtSubmitted(d: string | null): string {
  if (!d) return "—";
  // "2026-03-14" → "14 Mar"
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return d;
  const monthMap: Record<string, string> = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
  };
  return `${parseInt(m[3], 10)} ${monthMap[m[2]] ?? m[2]}`;
}

// Student card uses a different (and smaller) icon registry than the admin
// thumb registry. The 3 student-facing projects map to specific student icons.
const STUDENT_PROJECT_TITLES = [
  "CropPlanner",
  "Solar Lab Monitor",
  "SHM Visualizer",
] as const;

const STUDENT_ICON_BY_TITLE: Record<string, PortfolioIconKey> = {
  CropPlanner: "crop",
  "Solar Lab Monitor": "solar",
  "SHM Visualizer": "shm",
};

const STUDENT_TITLE_ORDER: Record<string, number> = {
  CropPlanner: 0,
  "Solar Lab Monitor": 1,
  "SHM Visualizer": 2,
};

export async function getStudentProjects(): Promise<Project[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .select("title_en, title_th, desc_long, author_line, tags")
    .in("title_en", [...STUDENT_PROJECT_TITLES]);
  if (error) throw new Error(`getStudentProjects: ${error.message}`);
  return (data ?? [])
    .slice()
    .sort(
      (a, b) =>
        (STUDENT_TITLE_ORDER[a.title_en] ?? 99) -
        (STUDENT_TITLE_ORDER[b.title_en] ?? 99),
    )
    .map<Project>((p) => {
      const tags = (p.tags as PortfolioTagPill[] | null) ?? [];
      return {
        title: p.title_en,
        titleTh: p.title_th ?? "",
        desc: p.desc_long ?? "",
        authorLine: p.author_line ?? "",
        tags: tags.map((t) => t.label),
        iconKey: STUDENT_ICON_BY_TITLE[p.title_en] ?? "crop",
      };
    });
}

export async function getAdminPortfolioRows(): Promise<PortfolioAdminRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .select(
      "title_en, title_th, author_line, klass, icon_key, thumb_bg, tags, submitted_at, status",
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getAdminPortfolioRows: ${error.message}`);
  return (data ?? []).map<PortfolioAdminRow>((p) => ({
    thumb: {
      iconKey: (p.icon_key as PortfolioThumbIcon) ?? "trend",
      bg: p.thumb_bg ?? undefined,
    },
    titleEn: p.title_en,
    titleTh: p.title_th ?? "",
    author: trimAuthor(p.author_line ?? ""),
    klass: p.klass ?? "",
    tags: ((p.tags as PortfolioTagPill[] | null) ?? []) as PortfolioTagPill[],
    submitted: fmtSubmitted(p.submitted_at),
    status: p.status as PortfolioAdminRow["status"],
  }));
}
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/queries/sportResults.ts lib/queries/bookings.ts lib/queries/projects.ts
git commit -m "queries: sport_results, bookings, projects"
```

---

### Task 6: Build query helpers — pshare, carelin, siteConfig

**Files:**

- Create: `lib/queries/pshare.ts`, `lib/queries/carelin.ts`, `lib/queries/siteConfig.ts`

- [ ] **Step 1: Create `lib/queries/pshare.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { PsharePost } from "@/lib/types";

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function thaiDate(ts: string | null): string {
  if (!ts) return "";
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${parseInt(m[3], 10)} ${THAI_MONTHS[parseInt(m[2], 10) - 1]}`;
}

export async function getStudentPshareFeed(): Promise<PsharePost[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("pshare_posts")
    .select(
      "slug, num_label, title, snippet, author_alias, art_halftone, art_bg, art_num_color, tags, published_at",
    )
    .eq("status", "published")
    .order("num_label", { ascending: true });
  if (error) throw new Error(`getStudentPshareFeed: ${error.message}`);
  return (data ?? []).map<PsharePost>((p) => ({
    slug: p.slug,
    num: p.num_label ?? "",
    title: p.title,
    snippet: p.snippet ?? "",
    author: p.author_alias ?? "",
    date: thaiDate(p.published_at),
    tags: p.tags ?? [],
    art: {
      halftone:
        (p.art_halftone as PsharePost["art"]["halftone"]) ?? "halftone-bl",
      bg: p.art_bg ?? undefined,
      numColor: p.art_num_color ?? undefined,
    },
  }));
}
```

- [ ] **Step 2: Create `lib/queries/carelin.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { CarelinDeskRow, CarelinRequest } from "@/lib/types";

function relativeWhen(ts: string): string {
  // For the prototype: derive a Thai-friendly relative time from `created_at`.
  // Without real elapsed time, prefer a deterministic label derived from the date:
  // - same day as 2026-05-12 → "HH:MM"
  // - one day before     → "เมื่อวาน"
  // - otherwise          → ISO date stripped
  const m = ts.match(/-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  if (!m) return ts;
  const day = parseInt(m[2], 10);
  const hhmm = m[3];
  if (day === 12) return hhmm;
  if (day === 11) return "เมื่อวาน";
  return `${day} พ.ค.`;
}

export async function getCarelinRequests(): Promise<CarelinRequest[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("carelin_requests")
    .select(
      "id, title, body, who_name, student_id_4, status, created_at, carelin_replies(teacher_name, role_label, body, avatar_letter, created_at)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getCarelinRequests: ${error.message}`);
  return (data ?? []).map<CarelinRequest>((r) => {
    const replies =
      (r.carelin_replies as unknown as Array<{
        teacher_name: string | null;
        role_label: string | null;
        body: string;
        avatar_letter: string | null;
        created_at: string;
      }>) ?? [];
    const reply = replies[0];
    return {
      title: r.title,
      body: r.body,
      who: r.who_name,
      studentId: r.student_id_4,
      when: relativeWhen(r.created_at),
      status: r.status as CarelinRequest["status"],
      reply: reply
        ? {
            teacher: reply.teacher_name ?? "",
            role: reply.role_label ?? "",
            when: relativeWhen(reply.created_at),
            body: reply.body,
            avatar: reply.avatar_letter ?? "",
          }
        : undefined,
    };
  });
}

export async function getCarelinDeskRows(): Promise<CarelinDeskRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("carelin_requests")
    .select("title, body, who_name, student_id_4, klass, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getCarelinDeskRows: ${error.message}`);
  return (data ?? []).map<CarelinDeskRow>((r) => ({
    when: relativeWhen(r.created_at),
    requester: {
      name: r.who_name,
      studentId: r.student_id_4,
      klass: r.klass ?? "",
    },
    title: r.title,
    snippet: r.body.length > 60 ? r.body.slice(0, 60) + "..." : r.body,
    status: r.status === "answered" ? "Answered" : "Open",
  }));
}
```

- [ ] **Step 3: Create `lib/queries/siteConfig.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { AdminKpi, HomeHero, PortfolioStats } from "@/lib/types";

async function getValue<T>(key: string): Promise<T> {
  const db = await createClient();
  const { data, error } = await db
    .from("site_config")
    .select("value")
    .eq("key", key)
    .single();
  if (error) throw new Error(`siteConfig ${key}: ${error.message}`);
  return data.value as unknown as T;
}

export async function getHomeHero(): Promise<HomeHero> {
  return getValue<HomeHero>("home_hero");
}

export async function getAdminGreeting(): Promise<{ th: string; en: string }> {
  return getValue<{ th: string; en: string }>("admin_greeting");
}

export async function getOverviewKpis(): Promise<AdminKpi[]> {
  return getValue<AdminKpi[]>("overview_kpis");
}

export async function getPortfolioStats(): Promise<PortfolioStats[]> {
  return getValue<PortfolioStats[]>("portfolio_stats");
}

export async function getPortfolioKpis(): Promise<AdminKpi[]> {
  return getValue<AdminKpi[]>("portfolio_kpis");
}

export async function getCarelinKpis(): Promise<AdminKpi[]> {
  return getValue<AdminKpi[]>("carelin_kpis");
}

export type TrendChartData = {
  months: readonly string[];
  path: string;
  points: { x: number; y: number }[];
};

export async function getTrendChart(): Promise<TrendChartData> {
  return getValue<TrendChartData>("trend_chart");
}
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/queries/pshare.ts lib/queries/carelin.ts lib/queries/siteConfig.ts
git commit -m "queries: pshare, carelin, site_config"
```

---

### Task 7: Swap student home (`app/student/page.tsx`)

**Files:** Modify `app/student/page.tsx`.

- [ ] **Step 1: Rewrite the page**

```ts
import { MobileBody } from "@/components/layout/MobileBody";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { HeroCard } from "@/components/student/HeroCard";
import { MenuGrid } from "@/components/student/MenuGrid";
import {
  BookingIcon,
  CalendarIcon,
  CarelinIcon,
  PortfolioIcon,
  PshareIcon,
  SportIcon,
} from "@/components/student/MenuIcons";
import { MenuTile } from "@/components/student/MenuTile";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { getHomeHero } from "@/lib/queries/siteConfig";

export default async function StudentHome() {
  const hero = await getHomeHero();
  return (
    <>
      <StudentHeader />
      <MobileBody className="space-y-[18px]">
        <HeroCard hero={hero} />

        <SectionDivider>★ Menu · เมนูหลัก ★</SectionDivider>

        <MenuGrid>
          <MenuTile
            href="/student/calendar"
            labelEn="Calendar"
            labelTh="ปฏิทินกิจกรรม"
            art="bk"
            star={{ color: "ink", position: "tl" }}
          >
            <CalendarIcon />
          </MenuTile>
          <MenuTile
            href="/student/booking"
            labelEn="Booking"
            labelTh="จองห้อง"
            art="bl"
            star={{ color: "yellow", position: "tr" }}
          >
            <BookingIcon />
          </MenuTile>
          <MenuTile
            href="/student/sport"
            labelEn="Sport Day"
            labelTh="กีฬาสี · Live"
            art="bk"
          >
            <SportIcon />
          </MenuTile>
          <MenuTile
            href="/student/portfolio"
            labelEn="Portfolio"
            labelTh="รุ่นพี่ · Alumni"
            art="bl"
            star={{ color: "ink", position: "tl" }}
          >
            <PortfolioIcon />
          </MenuTile>
          <MenuTile
            href="/student/pshare"
            labelEn="P'share"
            labelTh="พี่แชร์ น้องชัวร์"
            art="bl"
            star={{ color: "blue", position: "tr" }}
          >
            <PshareIcon />
          </MenuTile>
          <MenuTile
            href="/student/carelin"
            labelEn="CD Carelin"
            labelTh="เรื่องที่อยากเล่า"
            art="bk"
            star={{ color: "pink", position: "tl" }}
          >
            <CarelinIcon />
          </MenuTile>
        </MenuGrid>
      </MobileBody>
    </>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build  # ensure the dynamic page compiles
git add app/student/page.tsx
git commit -m "swap: /student home reads HOME_HERO from site_config"
```

---

### Task 8: Swap student sport, pshare, portfolio, carelin

**Files:** Modify `app/student/sport/page.tsx`, `app/student/pshare/page.tsx`, `app/student/portfolio/page.tsx`, `app/student/carelin/page.tsx`.

- [ ] **Step 1: Rewrite `app/student/sport/page.tsx`**

```ts
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { CalendarEventCard } from "@/components/student/CalendarEventCard";
import { Leaderboard } from "@/components/student/Leaderboard";
import { SportFeedCard } from "@/components/student/SportFeedCard";
import { SportHero } from "@/components/student/SportHero";
import { IconButton } from "@/components/ui/IconButton";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { getLeaderboard } from "@/lib/queries/houses";
import { getStudentLiveResults } from "@/lib/queries/sportResults";
import { getStudentUpcomingSport } from "@/lib/queries/events";
import { SPORT_HERO } from "@/lib/ui/sport";

export default async function StudentSport() {
  const [leaderboard, liveResults, upcoming] = await Promise.all([
    getLeaderboard(),
    getStudentLiveResults(),
    getStudentUpcomingSport(),
  ]);
  return (
    <>
      <PageHead
        titleTh="กีฬาสี"
        titleEn="Sport Day · Live"
        action={
          <IconButton label="Live · ถ่ายทอดสด">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <SportHero {...SPORT_HERO} />
        <Leaderboard rows={leaderboard} />

        <SectionDivider>⚡ Live Results</SectionDivider>
        <div className="space-y-2.5">
          {liveResults.map((result, i) => (
            <SportFeedCard key={i} result={result} />
          ))}
        </div>

        <SectionDivider>★ Upcoming</SectionDivider>
        <div className="space-y-2">
          {upcoming.map((event, i) => (
            <CalendarEventCard key={i} event={event} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
```

- [ ] **Step 2: Rewrite `app/student/pshare/page.tsx`**

```ts
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { Blurb } from "@/components/student/Blurb";
import { PshareCard } from "@/components/student/PshareCard";
import { TagChipRow } from "@/components/student/TagChipRow";
import { IconButton } from "@/components/ui/IconButton";
import { getStudentPshareFeed } from "@/lib/queries/pshare";
import { PSHARE_ACTIVE_TAG, PSHARE_TAGS } from "@/lib/ui/pshare";

export default async function StudentPshare() {
  const posts = await getStudentPshareFeed();
  return (
    <>
      <PageHead
        titleTh="พี่แชร์ น้องชัวร์"
        titleEn="P'share N'sure"
        action={
          <IconButton label="Search · ค้นหา">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <Blurb accent="yellow">
          ★ พี่ ม.ปลาย เขียนแชร์ความรู้ให้น้อง — โอลิมปิก, โครงงาน, การบ้าน, life
          tips
        </Blurb>

        <TagChipRow tags={PSHARE_TAGS} activeTag={PSHARE_ACTIVE_TAG} />

        <div className="grid grid-cols-1 gap-3">
          {posts.map((post) => (
            <PshareCard key={post.slug} post={post} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
```

- [ ] **Step 3: Rewrite `app/student/portfolio/page.tsx`**

```ts
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { ProjectCard } from "@/components/student/ProjectCard";
import { StatsStrip } from "@/components/student/StatsStrip";
import { IconButton } from "@/components/ui/IconButton";
import { getStudentProjects } from "@/lib/queries/projects";
import { getPortfolioStats } from "@/lib/queries/siteConfig";

export default async function StudentPortfolio() {
  const [stats, projects] = await Promise.all([
    getPortfolioStats(),
    getStudentProjects(),
  ]);
  return (
    <>
      <PageHead
        titleTh="รุ่นพี่"
        titleEn="Alumni Portfolio"
        action={
          <IconButton label="Filter · ตัวกรอง">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <StatsStrip stats={stats} />
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
```

- [ ] **Step 4: Rewrite `app/student/carelin/page.tsx`**

```ts
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { Blurb } from "@/components/student/Blurb";
import { CarelinCard } from "@/components/student/CarelinCard";
import { CarelinCta } from "@/components/student/CarelinCta";
import { IconButton } from "@/components/ui/IconButton";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { getCarelinRequests } from "@/lib/queries/carelin";

export default async function StudentCarelin() {
  const requests = await getCarelinRequests();
  return (
    <>
      <PageHead
        titleTh="ซีดีแคร์ลิน"
        titleEn="CD Carelin"
        action={
          <IconButton label="Filter · ตัวกรอง">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <Blurb accent="pink">
          อยากขอความช่วยเหลือเรื่องอะไรก็ได้ ★ ครู / รุ่นพี่ จะมาตอบ
        </Blurb>

        <CarelinCta />

        <SectionDivider>⚡ Public Board</SectionDivider>

        <div className="space-y-2.5">
          {requests.map((request) => (
            <CarelinCard key={request.title} request={request} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
```

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add app/student/sport/page.tsx app/student/pshare/page.tsx app/student/portfolio/page.tsx app/student/carelin/page.tsx
git commit -m "swap: /student sport/pshare/portfolio/carelin read from supabase"
```

---

### Task 9: Swap student calendar + booking (computed grids)

**Files:** Modify `app/student/calendar/page.tsx`, `app/student/booking/page.tsx`.

- [ ] **Step 1: Rewrite `app/student/calendar/page.tsx`**

```ts
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { CalendarChipRow } from "@/components/student/CalendarChipRow";
import { CalendarEventCard } from "@/components/student/CalendarEventCard";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { IconButton } from "@/components/ui/IconButton";
import {
  getStudentDayEvents,
  getStudentMonth,
} from "@/lib/queries/events";
import { CALENDAR_CHIPS, SELECTED_DAY_LABEL } from "@/lib/ui/calendar";

export default async function StudentCalendar() {
  const [days, events] = await Promise.all([
    getStudentMonth(2026, 5),
    getStudentDayEvents(2026, 5, 13),
  ]);
  return (
    <>
      <PageHead
        titleTh="ปฏิทินกิจกรรม"
        titleEn="Calendar"
        action={
          <IconButton label="Filter · ตัวกรอง">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <CalendarMonthRow titleTh="พฤษภาคม" subEn="May 2026" />
        <CalendarChipRow chips={CALENDAR_CHIPS} activeId="all" />
        <CalendarGrid days={days} />

        <div className="flex items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span>{SELECTED_DAY_LABEL}</span>
          <span aria-hidden className="h-px flex-1 bg-line" />
        </div>
        <div className="space-y-2">
          {events.map((event, i) => (
            <CalendarEventCard key={i} event={event} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
```

- [ ] **Step 2: Rewrite `app/student/booking/page.tsx`**

```ts
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { BookingTabs } from "@/components/student/BookingTabs";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { PeriodPicker } from "@/components/student/PeriodPicker";
import { RoomList } from "@/components/student/RoomList";
import { CtaButton } from "@/components/ui/CtaButton";
import { IconButton } from "@/components/ui/IconButton";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { getMusicRooms } from "@/lib/queries/rooms";
import {
  BOOKING_ACTIVE_TAB,
  BOOKING_CONFIRM_EYEBROW,
  BOOKING_MAY_DAYS,
  BOOKING_PERIODS,
  BOOKING_TABS,
} from "@/lib/ui/booking";

export default async function StudentBooking() {
  const rooms = await getMusicRooms();
  return (
    <>
      <PageHead
        titleTh="จองห้อง"
        titleEn="Room Booking"
        action={
          <IconButton label="New booking · จองใหม่">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <BookingTabs tabs={BOOKING_TABS} activeId={BOOKING_ACTIVE_TAB} />

        <CalendarMonthRow titleTh="May 2026" subEn="เลือกวันที่จอง" compact />
        <CalendarGrid days={BOOKING_MAY_DAYS} compact />

        <SectionDivider>★ Time period · ช่วงเวลา ★</SectionDivider>
        <PeriodPicker periods={BOOKING_PERIODS} />

        <SectionDivider>★ Choose room · เลือกห้อง ★</SectionDivider>
        <RoomList rooms={rooms} />

        <CtaButton eyebrow={BOOKING_CONFIRM_EYEBROW}>
          Confirm Booking →
        </CtaButton>
      </MobileBody>
    </>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add app/student/calendar/page.tsx app/student/booking/page.tsx
git commit -m "swap: /student calendar + booking use db reads"
```

---

### Task 10: Refactor `TrendChart` to take props

**Files:** Modify `components/admin/TrendChart.tsx`.

The component currently imports `ADMIN_TREND_*` constants directly. After 3c, the admin overview page queries `getTrendChart()` and passes the result as props.

- [ ] **Step 1: Rewrite the component**

```ts
import type { TrendChartData } from "@/lib/queries/siteConfig";

export function TrendChart({ data }: { data: TrendChartData }) {
  const { months, path, points } = data;
  const lastIndex = points.length - 1;
  return (
    <>
      <div className="-mx-1.5 mt-1 h-[120px]">
        <svg
          viewBox="0 0 600 120"
          preserveAspectRatio="none"
          className="block h-full w-full"
        >
          <defs>
            <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1E2EE4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1E2EE4" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="#DAD6C4" strokeDasharray="3,3" strokeWidth="1">
            <line x1="0" y1="30" x2="600" y2="30" />
            <line x1="0" y1="60" x2="600" y2="60" />
            <line x1="0" y1="90" x2="600" y2="90" />
          </g>
          <path d={`${path} L600,120 L0,120 Z`} fill="url(#trendGrad)" />
          <path d={path} stroke="#1E2EE4" strokeWidth="2.5" fill="none" />
          <g fill="#0A0A0A">
            {points.map((p, i) =>
              i === lastIndex ? (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill="#F7E33A"
                  stroke="#0A0A0A"
                  strokeWidth="1.5"
                />
              ) : (
                <circle key={i} cx={p.x} cy={p.y} r="3" />
              ),
            )}
          </g>
        </svg>
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[9px] text-mute-500">
        {months.map((m, i) => (
          <span
            key={m}
            className={
              i === months.length - 1 ? "font-semibold text-blue" : ""
            }
          >
            {m}
          </span>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check (build will fail until admin overview is swapped — expected)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected output: ONE error about `app/admin/page.tsx` not passing `data` to `<TrendChart />`. That's normal — it's fixed in Task 11. Any OTHER error means something else broke; STOP and report it.

- [ ] **Step 3: Commit**

```bash
git add components/admin/TrendChart.tsx
git commit -m "swap: TrendChart accepts trend data as props"
```

(Build is intentionally broken between this commit and the next — Task 11 fixes it.)

---

### Task 11: Swap `/admin` overview

**Files:** Modify `app/admin/page.tsx`.

- [ ] **Step 1: Rewrite the page**

```ts
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { GreetingBanner } from "@/components/admin/GreetingBanner";
import { KpiCard } from "@/components/admin/KpiCard";
import { RecentBookingsTable } from "@/components/admin/RecentBookingsTable";
import { TodayEventsCard } from "@/components/admin/TodayEventsCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { getRecentBookings } from "@/lib/queries/bookings";
import { getAdminTodayEvents } from "@/lib/queries/events";
import {
  getAdminGreeting,
  getOverviewKpis,
  getTrendChart,
} from "@/lib/queries/siteConfig";

export default async function AdminOverview() {
  const [greeting, kpis, trend, todayEvents, recentBookings] = await Promise.all([
    getAdminGreeting(),
    getOverviewKpis(),
    getTrendChart(),
    getAdminTodayEvents(),
    getRecentBookings(),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="ภาพรวม"
        eyebrow="Overview · Term 1 / Week 6 of 16"
        actions={
          <>
            <AdminSearch />
            <Btn>Export ↓</Btn>
            <Btn variant="primary">+ New Event</Btn>
          </>
        }
      />

      <GreetingBanner th={greeting.th} en={greeting.en} />

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[2fr_1fr]">
        <Card accent>
          <CardTitle th="กิจกรรม 12 เดือน" en="12-month trend" menu="↗ View report" />
          <TrendChart data={trend} />
        </Card>
        <TodayEventsCard events={todayEvents} />
      </div>

      <Card className="mt-[18px]">
        <CardTitle th="การจองล่าสุด" en="Recent bookings" menu="View all →" />
        <RecentBookingsTable rows={recentBookings} />
      </Card>
    </>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add app/admin/page.tsx
git commit -m "swap: /admin overview reads from supabase"
```

Build should now be green again (TrendChart's data prop is satisfied).

---

### Task 12: Swap `/admin/calendar` + `/admin/sport`

**Files:** Modify `app/admin/calendar/page.tsx`, `app/admin/sport/page.tsx`.

- [ ] **Step 1: Rewrite `app/admin/calendar/page.tsx`**

```ts
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { BigCalGrid } from "@/components/admin/BigCalGrid";
import { Btn } from "@/components/admin/Btn";
import { CalendarLegend } from "@/components/admin/CalendarLegend";
import { getAdminMonth } from "@/lib/queries/events";

export default async function AdminCalendar() {
  const days = await getAdminMonth(2026, 5);
  return (
    <>
      <AdminTopbar
        titleTh="ปฏิทิน"
        eyebrow="Calendar · May 2026"
        actions={
          <>
            <Btn>◀ Apr</Btn>
            <Btn>May 2026</Btn>
            <Btn>Jun ▶</Btn>
            <Btn variant="primary">+ Add Event</Btn>
          </>
        }
      />
      <CalendarLegend />
      <BigCalGrid days={days} />
    </>
  );
}
```

- [ ] **Step 2: Rewrite `app/admin/sport/page.tsx`**

```ts
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { EventResultsTable } from "@/components/admin/EventResultsTable";
import { LiveIndicator } from "@/components/admin/LiveIndicator";
import { ScoreboardCard } from "@/components/admin/ScoreboardCard";
import { UpcomingGrid } from "@/components/admin/UpcomingGrid";
import { getScoreboard } from "@/lib/queries/houses";
import { getAdminSportResults } from "@/lib/queries/sportResults";
import { getAdminUpcomingSport } from "@/lib/queries/events";

export default async function AdminSport() {
  const [scoreboard, results, upcoming] = await Promise.all([
    getScoreboard(),
    getAdminSportResults(),
    getAdminUpcomingSport(),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="กีฬาสี"
        eyebrow="Sport Day · Day 2 of 3 · Live"
        actions={
          <>
            <LiveIndicator label="Broadcasting live" />
            <Btn>Export</Btn>
            <Btn variant="primary">+ Add event</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {scoreboard.map((entry) => (
          <ScoreboardCard key={entry.house} entry={entry} />
        ))}
      </div>

      <Card className="mt-[18px]">
        <CardTitle
          th="ผลการแข่งขัน"
          en="Event results"
          menu="↗ Full bracket"
        />
        <EventResultsTable rows={results} />
      </Card>

      <Card className="mt-[18px]">
        <CardTitle th="การแข่งขันถัดไป" en="Upcoming matches" />
        <UpcomingGrid events={upcoming} />
      </Card>
    </>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add app/admin/calendar/page.tsx app/admin/sport/page.tsx
git commit -m "swap: /admin calendar + sport read from supabase"
```

---

### Task 13: Swap `/admin/bookings` + `/admin/portfolio` + `/admin/carelin`

**Files:** Modify three admin pages.

- [ ] **Step 1: Rewrite `app/admin/bookings/page.tsx`**

```ts
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminTodayBookingsTable } from "@/components/admin/AdminTodayBookingsTable";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { Gantt } from "@/components/admin/Gantt";
import {
  getAdminTodayBookings,
  getGanttRooms,
} from "@/lib/queries/bookings";
import { ADMIN_BOOKING_DATE, GANTT_HOURS } from "@/lib/ui/admin";

export default async function AdminBookings() {
  const [todayBookings, ganttRooms] = await Promise.all([
    getAdminTodayBookings(),
    getGanttRooms(),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="จองห้อง"
        eyebrow={`Bookings · ${ADMIN_BOOKING_DATE}`}
        actions={
          <>
            <Btn>◀ 12 May</Btn>
            <Btn variant="ink">13 May (TUE)</Btn>
            <Btn>14 May ▶</Btn>
            <Btn variant="primary">+ New Booking</Btn>
          </>
        }
      />

      <Gantt hours={GANTT_HOURS} rooms={ganttRooms} />

      <Card className="mt-[18px]">
        <CardTitle
          th="รายการจองวันนี้"
          en="Today's bookings"
          menu="12 active · 2 pending"
        />
        <AdminTodayBookingsTable rows={todayBookings} />
      </Card>
    </>
  );
}
```

- [ ] **Step 2: Rewrite `app/admin/portfolio/page.tsx`**

```ts
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import { Card } from "@/components/admin/Card";
import { KpiCard } from "@/components/admin/KpiCard";
import { PortfolioAdminTable } from "@/components/admin/PortfolioAdminTable";
import { TabBar } from "@/components/admin/TabBar";
import { getAdminPortfolioRows } from "@/lib/queries/projects";
import { getPortfolioKpis } from "@/lib/queries/siteConfig";
import {
  PORTFOLIO_ACTIVE_TAB,
  PORTFOLIO_TABS,
} from "@/lib/ui/portfolio";

export default async function AdminPortfolio() {
  const [kpis, rows] = await Promise.all([
    getPortfolioKpis(),
    getAdminPortfolioRows(),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="จัดการ Portfolio"
        eyebrow="Portfolio Manager · รุ่นพี่"
        actions={
          <>
            <AdminSearch placeholder="🔍  Search projects, authors…" />
            <Btn>Export ↓</Btn>
            <Btn variant="primary">+ Add Project</Btn>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <TabBar tabs={PORTFOLIO_TABS} activeId={PORTFOLIO_ACTIVE_TAB} />

      <Card className="!p-0">
        <PortfolioAdminTable rows={rows} />
      </Card>
    </>
  );
}
```

- [ ] **Step 3: Rewrite `app/admin/carelin/page.tsx`**

```ts
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { CarelinDeskTable } from "@/components/admin/CarelinDeskTable";
import { KpiCard } from "@/components/admin/KpiCard";
import { TabBar } from "@/components/admin/TabBar";
import { getCarelinDeskRows } from "@/lib/queries/carelin";
import { getCarelinKpis } from "@/lib/queries/siteConfig";
import {
  CARELIN_DESK_ACTIVE_TAB,
  CARELIN_DESK_TABS,
} from "@/lib/ui/carelin";

export default async function AdminCarelin() {
  const [kpis, rows] = await Promise.all([
    getCarelinKpis(),
    getCarelinDeskRows(),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="ซีดีแคร์ลิน"
        eyebrow="Carelin Desk · the campus care line"
        actions={
          <>
            <AdminSearch />
            <Btn>Export ↓</Btn>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <Card>
        <CardTitle th="คำขอความช่วยเหลือ" en="All requests" />
        <TabBar tabs={CARELIN_DESK_TABS} activeId={CARELIN_DESK_ACTIVE_TAB} />
        <CarelinDeskTable rows={rows} />
      </Card>
    </>
  );
}
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add app/admin/bookings/page.tsx app/admin/portfolio/page.tsx app/admin/carelin/page.tsx
git commit -m "swap: /admin bookings + portfolio + carelin read from supabase"
```

---

### Task 14: Strip static-UI exports from seed-data files

**Files:** Modify every `supabase/seed/data/*.ts` that currently exports a UI constant. The seed script must still find the entity arrays it reads.

By this point, all pages import static config from `lib/ui/*`. The duplicates in `supabase/seed/data/*.ts` are now unused by app/components — only the seed script reads from those files. We can safely delete the static-UI exports.

- [ ] **Step 1: Verify no app/components imports remain**

```bash
grep -rn "@/supabase/seed/data" app components 2>/dev/null \
  || echo "ok: no app/component imports from seed-data"
```

Expected: prints `ok: no app/component imports from seed-data`. If anything shows up, the corresponding page swap missed something — STOP and fix.

- [ ] **Step 2: Strip `supabase/seed/data/calendar.ts`**

Replace its content with the seed-only portion (only `SELECTED_DAY_EVENTS` is consumed by the seed). The final file should be:

```ts
import type { CalendarEvent } from "@/lib/types";

export const SELECTED_DAY_EVENTS: CalendarEvent[] = [
  {
    time: "08:30",
    titleTh: "กีฬาสี Day 3 · Finals",
    tag: "Sport · ลานกีฬากลาง",
    category: "sport",
  },
  {
    time: "15:30",
    titleTh: "ประชุมคณะกรรมการนักเรียน",
    tag: "Admin · ห้องประชุม 3",
    category: "admin",
  },
  {
    time: "17:00",
    titleTh: "ซ้อมวงดุริยางค์",
    tag: "Music · ห้องดนตรี 1",
    category: "music",
  },
];
```

- [ ] **Step 3: Strip `supabase/seed/data/bookings.ts`**

The seed doesn't read from this file at all (the seed pulls bookings from `admin-bookings.ts`, not student `bookings.ts`). The whole file can be deleted:

```bash
rm supabase/seed/data/bookings.ts
```

- [ ] **Step 4: Strip `supabase/seed/data/pshare-posts.ts`**

In `supabase/seed/data/pshare-posts.ts`, delete the `PSHARE_TAGS` array (its `export const PSHARE_TAGS: PshareTagFilter[] = [ ... ];` block) and the `PSHARE_ACTIVE_TAG` constant (its `export const PSHARE_ACTIVE_TAG ...` line). Also remove `PshareTagFilter` from the import on line 1 — only `PsharePost` is still used. The remaining file should contain just the type import and the `export const PSHARE_POSTS: PsharePost[] = [ ... ]` array (5 posts, unchanged).

- [ ] **Step 5: Strip `supabase/seed/data/admin-overview.ts`**

Keep `ADMIN_GREETING`, `ADMIN_KPIS`, `ADMIN_TODAY_EVENTS`, `ADMIN_TREND_MONTHS`, `ADMIN_TREND_PATH`, `ADMIN_TREND_POINTS`, `ADMIN_RECENT_BOOKINGS` — all are consumed by the seed. **All exports stay.** No changes.

- [ ] **Step 6: Strip `supabase/seed/data/admin-portfolio.ts`**

Keep `PORTFOLIO_KPIS` and `PORTFOLIO_ROWS` (consumed by the seed). Remove `PORTFOLIO_TABS` and `PORTFOLIO_ACTIVE_TAB`.

- [ ] **Step 7: Strip `supabase/seed/data/admin-carelin.ts`**

Keep `CARELIN_DESK_KPIS` and `CARELIN_DESK_ROWS`. Remove `CARELIN_DESK_TABS` and `CARELIN_DESK_ACTIVE_TAB`.

- [ ] **Step 8: Strip `supabase/seed/data/admin-sport.ts`**

Keep `ADMIN_SCOREBOARD`, `ADMIN_SPORT_RESULTS`, `ADMIN_SPORT_UPCOMING`. Remove `PLACEMENT_COLOR`.

- [ ] **Step 9: Strip `supabase/seed/data/admin-bookings.ts`**

Keep `ADMIN_TODAY_BOOKINGS` and `GANTT_ROOMS`. Remove `ADMIN_BOOKING_DATE` and `GANTT_HOURS`.

- [ ] **Step 10: Strip `supabase/seed/data/sport.ts`**

This file's only seed consumer is via `ADMIN_SCOREBOARD` in `admin-sport.ts`. Nothing in `sport.ts` is consumed by the seed. Delete it:

```bash
rm supabase/seed/data/sport.ts
```

- [ ] **Step 11: Strip `supabase/seed/data/portfolios.ts`**

Only `PORTFOLIO_PROJECTS` is consumed (for `desc_long` lookup in the seed). `PORTFOLIO_STATS` is now in `site_config` — but the seed still reads `PORTFOLIO_STATS` from this file. **Keep both exports.** No changes.

- [ ] **Step 12: Verify build is still green**

```bash
npm run lint && npm run build
```

Expected: both pass.

- [ ] **Step 13: Verify seed still runs**

```bash
npm run seed
```

Expected: same 10 step `ok` lines, same row counts as Phase 3b's final run.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "strip static ui exports from seed-data; seed still idempotent"
```

---

### Task 15: Final verification

- [ ] **Step 1: Lint + build**

```bash
npm run lint && npm run build
```

Expected: both pass.

- [ ] **Step 2: No app/components imports from `supabase/seed/data/`**

```bash
grep -rn "@/supabase/seed/data" app components 2>/dev/null \
  || echo "ok: clean separation"
```

Expected: `ok: clean separation`.

- [ ] **Step 3: Type-check the seed**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Re-run seed end-to-end**

```bash
npm run seed
```

Expected: 10 steps, all `ok`. Row counts unchanged from the end of 3b.

- [ ] **Step 5: Smoke-test the app**

Run `npm run dev` in the background. Visit (or `curl http://localhost:3000/<path>`) each of the 13 swapped routes and confirm content renders. Then stop the dev server.

- [ ] **Step 6: Sanity grep**

```bash
grep -rn "from \"@/lib/queries" app | wc -l
```

Expected: ≥13 imports — every swapped page calls at least one query helper.

- [ ] **Step 7: Stop after 3c for user review**

Don't proceed to 3d. Summarize what shipped, then ask whether to continue.
