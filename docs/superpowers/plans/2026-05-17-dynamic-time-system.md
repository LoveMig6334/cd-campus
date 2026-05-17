# Dynamic Time System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ~12 hardcoded "today is 2026-05-12 / current month is May 2026" sites across calendar, bookings, admin overview, and Carelin with a single Asia/Bangkok-resolved time module so the UI reflects the real calendar.

**Architecture:** A new `lib/time.ts` module owns "now" via `Intl.DateTimeFormat({ timeZone: "Asia/Bangkok" })`. The static `MAY_2026_SKELETON` and `BOOKING_MAY_DAYS` calendar exports become functions that build a 6×7 grid for any (year, month). Pages and queries call the new helpers; "selected day" collapses into "today" (no separate concept).

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase. Server Components only; no test framework — per-task verification is `npx tsc --noEmit && npm run lint`, functional verification is manual via dev server in Task 7.

**Spec:** `docs/superpowers/specs/2026-05-17-dynamic-time-system-design.md`

---

## File Map

- **Create** `lib/time.ts` — `today()`, `currentYearMonth()`, `relativeThaiDay()`, `buildMonthGrid()`, `monthDateSet()`, Thai/English month constants, internal `addDays()` and `bangkokParts()`.
- **Modify** `lib/ui/calendar.ts` — delete `MAY_2026_SKELETON` and `SELECTED_DAY_LABEL`; add `buildCalendarSkeleton(year, month, todayISO)`.
- **Modify** `lib/ui/booking.ts` — delete `BOOKING_MAY_DAYS`; add `buildBookingMonthDays(year, month, todayISO)`.
- **Modify** `app/student/calendar/page.tsx` — use new helpers; dynamic month label.
- **Modify** `app/admin/calendar/page.tsx` — same; topbar eyebrow + label-buttons dynamic.
- **Modify** `app/student/booking/page.tsx` — `MAY_DATES` → `monthDateSet`; `BOOKING_MAY_DAYS` → `buildBookingMonthDays`; iso construction dynamic; month label dynamic.
- **Modify** `app/admin/bookings/page.tsx` — `TODAY = "2026-05-12"` → `today()`.
- **Modify** `app/admin/calendar/new/page.tsx` — datetime-local default → `${today()}T09:00`.
- **Modify** `app/admin/bookings/new/page.tsx` — date default → `today()`.
- **Modify** `lib/queries/events.ts` — (a) `getStudentMonth` and `getAdminMonth` use `buildMonthGrid` instead of `MAY_2026_SKELETON` / hardcoded `make()` grid (Task 2); (b) `getAdminTodayEvents()` uses `today()` (Task 6).
- **Modify** `lib/queries/carelin.ts` — `relativeWhen()` becomes a thin wrapper over `relativeThaiDay()` (or replaced inline).

Verification: `npx tsc --noEmit && npm run lint` after every task. Manual browser checks in Task 7.

---

### Task 1: Create `lib/time.ts`

**Files:**

- Create: `lib/time.ts`

**Rationale:** Pure additive module. No existing consumers. All later tasks import from here.

- [ ] **Step 1: Write the new module**

Create `lib/time.ts` with this exact content:

```ts
const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

const THAI_MONTHS_ABBR = [
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
] as const;

const EN_MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const EN_MONTHS_ABBR = [
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

export { THAI_MONTHS_FULL, THAI_MONTHS_ABBR, EN_MONTHS_FULL, EN_MONTHS_ABBR };

/**
 * Bangkok-local Y/M/D parts for the current instant. Uses Intl so the
 * server's own TZ (UTC on Vercel) doesn't cause an off-by-one at midnight.
 */
function bangkokParts(): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** "YYYY-MM-DD" in Asia/Bangkok. */
export function today(): string {
  const { y, m, d } = bangkokParts();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Current Bangkok-local year + 1-indexed month with display labels. */
export function currentYearMonth(): {
  year: number;
  month: number;
  thaiLabel: string;
  enLabel: string;
} {
  const { y, m } = bangkokParts();
  return {
    year: y,
    month: m,
    thaiLabel: THAI_MONTHS_FULL[m - 1],
    enLabel: `${EN_MONTHS_FULL[m - 1]} ${y}`,
  };
}

/** Add `n` days to a YYYY-MM-DD string. Internal; mirrors bookings.ts addDays. */
function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const TIME_RE = /T(\d{2}:\d{2})/;
const MONTH_DAY_RE = /-(\d{2})-(\d{2})T/;

/**
 * Convert a full ISO timestamp to a Thai relative label:
 *   - same day as today: "HH:mm"
 *   - one day before today: "เมื่อวาน"
 *   - any other date: "D <Thai month abbr>"
 */
export function relativeThaiDay(ts: string): string {
  const dateISO = ts.slice(0, 10);
  const todayISO = today();
  if (dateISO === todayISO) {
    const t = ts.match(TIME_RE);
    return t ? t[1] : "";
  }
  if (dateISO === addDays(todayISO, -1)) return "เมื่อวาน";
  const m = ts.match(MONTH_DAY_RE);
  if (!m) return ts;
  const day = parseInt(m[2], 10);
  const mon = parseInt(m[1], 10);
  return `${day} ${THAI_MONTHS_ABBR[mon - 1]}`;
}

/**
 * 6-row × 7-col (42 cells, Mon-first) skeleton for a 1-indexed (year, month).
 * Leading days come from the previous month, trailing days from the next.
 * Layout is timezone-invariant — we never derive "today" from these Dates.
 */
export function buildMonthGrid(
  year: number,
  month: number,
): { num: number; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // JS Sunday=0 … Saturday=6; we want Monday=0 … Sunday=6
  const leadCount = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysInPrev = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

  const cells: { num: number; inMonth: boolean }[] = [];
  for (let i = leadCount; i > 0; i--) {
    cells.push({ num: daysInPrev - i + 1, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ num: d, inMonth: true });
  }
  let trailing = 1;
  while (cells.length < 42) {
    cells.push({ num: trailing++, inMonth: false });
  }
  return cells;
}

/**
 * Set of "YYYY-MM-DD" strings for every in-month day of (year, month).
 * Used as a validation set for URL params.
 */
export function monthDateSet(year: number, month: number): Set<string> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out = new Set<string>();
  for (let d = 1; d <= daysInMonth; d++) {
    out.add(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  return out;
}
```

- [ ] **Step 2: Verify types and lint**

Run from project root:

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean. No imports, no consumers yet — purely additive.

- [ ] **Step 3: Sanity-check grid output**

Quick interpreter check that `buildMonthGrid` produces the right shape for a known reference month. Run:

```bash
npx tsx -e 'import("./lib/time.ts").then(({ buildMonthGrid }) => { const g = buildMonthGrid(2026, 5); console.log("len", g.length); console.log("first row", g.slice(0, 7).map(c => (c.inMonth ? c.num : "·"+c.num)).join(" ")); console.log("today (12) at index", g.findIndex(c => c.inMonth && c.num === 12)); });'
```

Expected output: length `42`. First row: `·26 ·27 ·28 ·29 ·30 1 2`. Index of in-month day 12: `16` (third row, third column — Tuesday). This matches the existing `MAY_2026_SKELETON` layout.

- [ ] **Step 4: Commit**

```bash
git add lib/time.ts
git commit -m "feat: add lib/time module for Bangkok-resolved date helpers"
```

---

### Task 2: Convert calendar UI + both calendar pages

**Files:**

- Modify: `lib/ui/calendar.ts`
- Modify: `app/student/calendar/page.tsx`
- Modify: `app/admin/calendar/page.tsx`

**Rationale:** `MAY_2026_SKELETON` and `SELECTED_DAY_LABEL` are only consumed by these two pages. Convert builder + both consumers in one commit to keep tsc green.

- [ ] **Step 1: Replace `lib/ui/calendar.ts` with the dynamic version**

Overwrite `lib/ui/calendar.ts` (full file content):

```ts
import type { CalendarChip, CalendarDay } from "@/lib/types";
import { buildMonthGrid } from "@/lib/time";

export const CALENDAR_CHIPS: CalendarChip[] = [
  { id: "all", labelEn: "All" },
  { id: "sport", labelEn: "Sport" },
  { id: "tradition", labelEn: "Tradition" },
  { id: "music", labelEn: "Music" },
  { id: "admin", labelEn: "Admin" },
  { id: "academic", labelEn: "Academic" },
];

/**
 * Calendar skeleton for an arbitrary (year, month). Marks the cell matching
 * `todayISO` (a "YYYY-MM-DD" string) as state:"today". No "selected" state —
 * per design, selected = today.
 */
export function buildCalendarSkeleton(
  year: number,
  month: number,
  todayISO: string,
): CalendarDay[] {
  const [todayY, todayM, todayD] = todayISO.split("-").map(Number);
  const todayInMonth = todayY === year && todayM === month;
  return buildMonthGrid(year, month).map<CalendarDay>((cell) => {
    if (!cell.inMonth) return { num: cell.num, inMonth: false };
    if (todayInMonth && cell.num === todayD) {
      return { num: cell.num, inMonth: true, state: "today" };
    }
    return { num: cell.num, inMonth: true };
  });
}
```

- [ ] **Step 2: Rewrite `app/student/calendar/page.tsx`**

Overwrite the file (full content):

```tsx
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { CalendarChipRow } from "@/components/student/CalendarChipRow";
import { CalendarEventCard } from "@/components/student/CalendarEventCard";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { IconButton } from "@/components/ui/IconButton";
import { getStudentDayEvents, getStudentMonth } from "@/lib/queries/events";
import { CALENDAR_CHIPS, buildCalendarSkeleton } from "@/lib/ui/calendar";
import { EN_MONTHS_ABBR, currentYearMonth, today } from "@/lib/time";

export default async function StudentCalendar() {
  const { year, month, thaiLabel, enLabel } = currentYearMonth();
  const todayISO = today();
  const todayDay = Number(todayISO.slice(-2));
  const [monthDays, events] = await Promise.all([
    getStudentMonth(year, month),
    getStudentDayEvents(year, month, todayDay),
  ]);
  // Overlay today's "today" state on the month-with-dots from the query
  const skeleton = buildCalendarSkeleton(year, month, todayISO);
  const days = monthDays.map((d, i) => ({
    ...skeleton[i],
    dots: d.dots,
  }));
  const selectedLabel = `Events on ${todayDay} ${EN_MONTHS_ABBR[month - 1]}`;

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
        <CalendarMonthRow titleTh={thaiLabel} subEn={enLabel} />
        <CalendarChipRow chips={CALENDAR_CHIPS} activeId="all" />
        <CalendarGrid days={days} />

        <div className="flex items-center gap-2 pt-1 font-mono text-[10px] tracking-[0.18em] uppercase">
          <span>{selectedLabel}</span>
          <span aria-hidden className="bg-line h-px flex-1" />
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

- [ ] **Step 3: Rewrite `app/admin/calendar/page.tsx`**

Overwrite the file (full content):

```tsx
import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminCalendarEventList } from "@/components/admin/AdminCalendarEventList";
import { BigCalGrid } from "@/components/admin/BigCalGrid";
import { Btn } from "@/components/admin/Btn";
import { CalendarLegend } from "@/components/admin/CalendarLegend";
import { getAdminMonth, getAdminMonthEventList } from "@/lib/queries/events";
import { EN_MONTHS_ABBR, currentYearMonth } from "@/lib/time";

export default async function AdminCalendar() {
  const { year, month, enLabel } = currentYearMonth();
  const prevAbbr = EN_MONTHS_ABBR[(month + 10) % 12]; // (month-2 mod 12), so May (5) → Apr
  const nextAbbr = EN_MONTHS_ABBR[month % 12];
  const [days, list] = await Promise.all([
    getAdminMonth(year, month),
    getAdminMonthEventList(year, month),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="ปฏิทิน"
        eyebrow={`Calendar · ${enLabel}`}
        actions={
          <>
            <Btn type="button">◀ {prevAbbr}</Btn>
            <Btn type="button">{enLabel}</Btn>
            <Btn type="button">{nextAbbr} ▶</Btn>
            <Link
              href="/admin/calendar/new"
              className="border-line bg-blue hover:bg-blue-deep inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white uppercase [box-shadow:3px_3px_0_var(--color-ink)] transition-all hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:4px_4px_0_var(--color-ink)]"
            >
              + Add Event
            </Link>
          </>
        }
      />
      <CalendarLegend />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
        <BigCalGrid days={days} />
        <AdminCalendarEventList rows={list} />
      </div>
    </>
  );
}
```

The `(month + 10) % 12` expression returns the 0-indexed previous month: for May (1-indexed 5), `(5+10)%12 = 3` → `EN_MONTHS_ABBR[3]` = `"Apr"`. For January (1), `(1+10)%12 = 11` → `"Dec"`. Same logic for `nextAbbr` with `month % 12` → for May `5%12=5` → `EN_MONTHS_ABBR[5]` = `"Jun"`; for December (12), `12%12=0` → `"Jan"`.

- [ ] **Step 4: Update `lib/queries/events.ts` (`getStudentMonth` uses the removed skeleton)**

`lib/queries/events.ts` currently imports `MAY_2026_SKELETON` from `@/lib/ui/calendar` (around line 12) and uses it in `getStudentMonth` (around lines 102–106). Deleting the export in Step 1 of this task breaks tsc, so this update has to land in the same commit.

Open `lib/queries/events.ts`. Change the import:

```ts
import { MAY_2026_SKELETON } from "@/lib/ui/calendar";
```

to:

```ts
import { buildMonthGrid } from "@/lib/time";
```

Find the use site at the bottom of `getStudentMonth`:

```ts
return MAY_2026_SKELETON.map((cell) => {
  if (!cell.inMonth) return cell;
  const dots = dotsByDay.get(cell.num);
  return dots && dots.length ? { ...cell, dots } : cell;
});
```

Replace with:

```ts
return buildMonthGrid(year, month).map<CalendarDay>((cell) => {
  if (!cell.inMonth) return { num: cell.num, inMonth: false };
  const dots = dotsByDay.get(cell.num);
  if (dots && dots.length) {
    return { num: cell.num, inMonth: true, dots };
  }
  return { num: cell.num, inMonth: true };
});
```

`CalendarDay` is already imported at the top of `events.ts` (line 9 imports it from `@/lib/types`); no new import needed.

Similarly, check `getAdminMonth` — it builds a `BigCalDay[]` grid via a hardcoded `make`/`other` array (around lines 168–211 in the current file). That grid is also May-2026-specific (it has cells `make(12, { isToday: true })` and so on). Replace the hardcoded array with `buildMonthGrid(year, month)`:

Find the block in `getAdminMonth` that constructs `grid: BigCalDay[]` (currently starts around line 168 with `const make = (num, rest...) => ...` and ends around line 211 with the trailing `other(6),`).

Replace the entire `const make = ... ; const other = ... ; const grid: BigCalDay[] = [ /* 42 hardcoded cells */ ];` block with:

```ts
const grid: BigCalDay[] = buildMonthGrid(year, month).map((cell) =>
  cell.inMonth
    ? { num: cell.num, inMonth: true }
    : { num: cell.num, inMonth: false },
);
```

The `isToday: true` marker on day 12 is dropped from `getAdminMonth` — instead, the admin calendar page overlays it. `BigCalGrid` reads `day.isToday` for the blue cell styling (`components/admin/BigCalGrid.tsx:41`), so the overlay below is required.

Add this overlay in `app/admin/calendar/page.tsx` after the `getAdminMonth` call (before passing to `BigCalGrid`):

```ts
const todayISO = today();
const [todayY, todayM, todayD] = todayISO.split("-").map(Number);
const todayInMonth = todayY === year && todayM === month;
const daysWithToday = todayInMonth
  ? days.map((d) =>
      d.inMonth && d.num === todayD ? { ...d, isToday: true } : d,
    )
  : days;
```

…and pass `daysWithToday` (instead of `days`) to `<BigCalGrid>`. Add `import { today } from "@/lib/time";` to the admin calendar page imports.

- [ ] **Step 5: Verify types and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean. The old `MAY_2026_SKELETON` and `SELECTED_DAY_LABEL` exports are gone; their three consumers (`student calendar`, `admin calendar`, `getStudentMonth/getAdminMonth` in `events.ts`) now use the dynamic helpers.

- [ ] **Step 6: Commit**

```bash
git add lib/ui/calendar.ts app/student/calendar/page.tsx app/admin/calendar/page.tsx lib/queries/events.ts
git commit -m "feat: dynamic calendar grid for student and admin pages"
```

---

### Task 3: Convert booking UI + student booking page

**Files:**

- Modify: `lib/ui/booking.ts`
- Modify: `app/student/booking/page.tsx`

**Rationale:** `BOOKING_MAY_DAYS` is only consumed by the student booking page. Convert builder + consumer in one commit.

- [ ] **Step 1: Replace `lib/ui/booking.ts`**

Overwrite `lib/ui/booking.ts` (full file content):

```ts
import type { BookingPeriod, BookingTab, CalendarDay } from "@/lib/types";
import { buildMonthGrid } from "@/lib/time";

export const BOOKING_TABS: BookingTab[] = [
  { id: "music", labelEn: "Music", labelTh: "ห้องดนตรี" },
  { id: "meeting", labelEn: "Meeting", labelTh: "ห้องประชุม" },
];

export const PERIOD_HOURS = {
  morning: { start: "08:00", end: "11:00" },
  midday: { start: "11:30", end: "14:30" },
  evening: { start: "15:00", end: "18:00" },
} as const;

export type PeriodId = keyof typeof PERIOD_HOURS;

export const BOOKING_PERIODS: (BookingPeriod & { id: PeriodId })[] = [
  {
    id: "morning",
    label: "Morning",
    time: "08:00 — 11:00",
    status: "available",
  },
  { id: "midday", label: "Midday", time: "11:30 — 14:30", status: "selected" },
  { id: "evening", label: "Evening", time: "15:00 — 18:00", status: "booked" },
];

/**
 * Booking-grid days for (year, month). Marks today; marks Saturday & Sunday
 * as `closed`. Replaces the old static `BOOKING_MAY_DAYS` whose 1/6/21
 * closed-days were decorative — weekends are a more sensible default.
 */
export function buildBookingMonthDays(
  year: number,
  month: number,
  todayISO: string,
): CalendarDay[] {
  const [todayY, todayM, todayD] = todayISO.split("-").map(Number);
  const todayInMonth = todayY === year && todayM === month;
  // Build a flat 42-cell grid; weekday for in-month cells is index-derived.
  // Cell index 0 = Monday of the first row, so weekday = i % 7 (0=Mon … 6=Sun).
  return buildMonthGrid(year, month).map<CalendarDay>((cell, i) => {
    if (!cell.inMonth) return { num: cell.num, inMonth: false };
    const weekday = i % 7;
    const isWeekend = weekday === 5 || weekday === 6;
    if (todayInMonth && cell.num === todayD) {
      return { num: cell.num, inMonth: true, state: "today" };
    }
    if (isWeekend) {
      return { num: cell.num, inMonth: true, state: "closed" };
    }
    return { num: cell.num, inMonth: true };
  });
}

/** Demo "free/full" overlay for the 4 student-facing music rooms. */
export const BOOKING_ROOM_STATUS_BY_NAME: Record<string, "free" | "full"> = {
  "Music Room 1": "free",
  "Music Room 2": "free",
  "Music Room 3": "full",
  "Studio Room": "free",
};
```

- [ ] **Step 2: Rewrite `app/student/booking/page.tsx`**

Open `app/student/booking/page.tsx` and apply these surgical edits (do not rewrite the whole file — only these spans):

Change the imports block (top of file) so the imports include the new helpers. After the existing import block, the relevant additions are:

```ts
import {
  BOOKING_PERIODS,
  BOOKING_TABS,
  buildBookingMonthDays,
  type PeriodId,
} from "@/lib/ui/booking";
import {
  EN_MONTHS_ABBR,
  currentYearMonth,
  monthDateSet,
  today,
} from "@/lib/time";
```

Remove `BOOKING_MAY_DAYS` from the `@/lib/ui/booking` import (replaced by `buildBookingMonthDays`).

Delete this block (currently lines 31–36):

```ts
const MAY_DATES = new Set(
  Array.from(
    { length: 31 },
    (_, i) => `2026-05-${String(i + 1).padStart(2, "0")}`,
  ),
);
```

Inside `StudentBooking()`, immediately after `const sp = await searchParams;`, add:

```ts
const { year, month } = currentYearMonth();
const todayISO = today();
const validDates = monthDateSet(year, month);
const enMonthAbbr = EN_MONTHS_ABBR[month - 1];
const monthStr = String(month).padStart(2, "0");
```

Change the `date` validation to use the new set. Find:

```ts
const date = MAY_DATES.has(dateRaw) ? dateRaw : "";
```

Replace with:

```ts
const date = validDates.has(dateRaw) ? dateRaw : "";
```

Change the `days` mapping (currently uses `BOOKING_MAY_DAYS`). Find:

```ts
const days: CalendarDay[] = BOOKING_MAY_DAYS.map((d) => {
  if (!d.inMonth || d.state === "closed") return d;
  const iso = `2026-05-${String(d.num).padStart(2, "0")}`;
  return {
    ...d,
    href: buildHref(currentParams, { date: iso }),
    state: iso === date ? ("selected" as const) : d.state,
  };
});
```

Replace with:

```ts
const days: CalendarDay[] = buildBookingMonthDays(year, month, todayISO).map(
  (d) => {
    if (!d.inMonth || d.state === "closed") return d;
    const iso = `${year}-${monthStr}-${String(d.num).padStart(2, "0")}`;
    return {
      ...d,
      href: buildHref(currentParams, { date: iso }),
      state: iso === date ? ("selected" as const) : d.state,
    };
  },
);
```

Change the `buildEyebrow` call site's hardcoded month. Find the `buildEyebrow` function (currently lines 59–67):

```ts
function buildEyebrow(
  date: string,
  periodText: string,
  roomName: string,
): string {
  if (!date && !periodText && !roomName) return "";
  const day = date ? Number(date.slice(-2)) : "·";
  return `${day} MAY · ${periodText ? periodText.toUpperCase() : "·"} · ${roomName ? roomName.toUpperCase() : "·"}`;
}
```

Replace with:

```ts
function buildEyebrow(
  date: string,
  periodText: string,
  roomName: string,
  monthAbbr: string,
): string {
  if (!date && !periodText && !roomName) return "";
  const day = date ? Number(date.slice(-2)) : "·";
  return `${day} ${monthAbbr.toUpperCase()} · ${periodText ? periodText.toUpperCase() : "·"} · ${roomName ? roomName.toUpperCase() : "·"}`;
}
```

Update the `buildEyebrow` call site. Find:

```ts
const eyebrow = buildEyebrow(
  date,
  period ? periodLabel(period) : "",
  roomLabel(rooms, room),
);
```

Replace with:

```ts
const eyebrow = buildEyebrow(
  date,
  period ? periodLabel(period) : "",
  roomLabel(rooms, room),
  enMonthAbbr,
);
```

Change the `CalendarMonthRow` props. Find:

```tsx
<CalendarMonthRow titleTh="May 2026" subEn="เลือกวันที่จอง" compact />
```

Replace with — pull the Thai label from `currentYearMonth()` (already destructured): change the `currentYearMonth()` destructure at the top of the component to include `thaiLabel`:

```ts
const { year, month, thaiLabel, enLabel } = currentYearMonth();
```

(`thaiLabel` and `enLabel` added.) Then the row:

```tsx
<CalendarMonthRow titleTh={enLabel} subEn="เลือกวันที่จอง" compact />
```

(The prototype's `titleTh="May 2026"` is actually English text — the prop name is misleading. Keep using `enLabel` to match the original visual. If you want Thai-style instead, use `thaiLabel` — but the original used English in the `titleTh` slot, so keep `enLabel` for prototype fidelity.)

- [ ] **Step 3: Verify types and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean. `BOOKING_MAY_DAYS` is gone (replaced by `buildBookingMonthDays`); `MAY_DATES` is gone (replaced by `monthDateSet(year, month)`); month abbreviation is dynamic.

- [ ] **Step 4: Commit**

```bash
git add lib/ui/booking.ts app/student/booking/page.tsx
git commit -m "feat: dynamic booking calendar for student page"
```

---

### Task 4: Wire admin bookings page to live today

**Files:**

- Modify: `app/admin/bookings/page.tsx`

- [ ] **Step 1: Replace the hardcoded TODAY constant with a call to `today()`**

In `app/admin/bookings/page.tsx`:

Add to the imports at the top:

```ts
import { today } from "@/lib/time";
```

Delete the constant (currently line 19):

```ts
const TODAY = "2026-05-12";
```

Inside `AdminBookings()`, immediately after `const params = await searchParams;`, add:

```ts
const todayISO = today();
```

Change `selectedDate` (currently line 84):

```ts
const selectedDate = isValidDate(params.date) ? params.date : TODAY;
```

to:

```ts
const selectedDate = isValidDate(params.date) ? params.date : todayISO;
```

Change the `BookingsWeekGrid` prop (currently line 132):

```tsx
today = { TODAY };
```

to:

```tsx
today = { todayISO };
```

- [ ] **Step 2: Verify types and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/admin/bookings/page.tsx
git commit -m "feat: admin bookings defaults to real today"
```

---

### Task 5: Form defaults for new event + new booking

**Files:**

- Modify: `app/admin/calendar/new/page.tsx`
- Modify: `app/admin/bookings/new/page.tsx`

**Rationale:** Convert the static `defaultValue` form inputs to today-relative values.

- [ ] **Step 1: Update `app/admin/calendar/new/page.tsx`**

Convert the component from a sync `function` to `async function` (the file currently is `export default function NewEventPage()` — change to `export default async function NewEventPage()`).

Add to the imports:

```ts
import { today } from "@/lib/time";
```

Inside the component body (at the very top, before the `return`), compute the default:

```ts
const startsAtDefault = `${today()}T09:00`;
```

Change the `starts_at` input's `defaultValue` (currently line 99):

```tsx
defaultValue = "2026-05-12T09:00";
```

to:

```tsx
defaultValue = { startsAtDefault };
```

- [ ] **Step 2: Update `app/admin/bookings/new/page.tsx`**

(Already `async function` because it awaits `getMusicRooms`.)

Add to the imports:

```ts
import { today } from "@/lib/time";
```

Inside the component body, after `const rooms = await getMusicRooms();`, add:

```ts
const dateDefault = today();
```

Change the `date` input's `defaultValue` (currently line 81):

```tsx
defaultValue = "2026-05-13";
```

to:

```tsx
defaultValue = { dateDefault };
```

- [ ] **Step 3: Verify types and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/admin/calendar/new/page.tsx app/admin/bookings/new/page.tsx
git commit -m "feat: form defaults use today instead of pinned dates"
```

---

### Task 6: Wire `getAdminTodayEvents` and `relativeWhen` to lib/time

**Files:**

- Modify: `lib/queries/events.ts`
- Modify: `lib/queries/carelin.ts`

- [ ] **Step 1: Update `getAdminTodayEvents` in `lib/queries/events.ts`**

Add to the imports at the top:

```ts
import { today } from "@/lib/time";
```

Find the function (currently around lines 219–241):

```ts
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
```

Replace with:

```ts
export async function getAdminTodayEvents(): Promise<AdminEvent[]> {
  // Today-card entries have tags starting with a CalendarCategory name;
  // upcoming-sport entries (Team/Track/Show prefixes) are excluded.
  const db = await createClient();
  const todayISO = today();
  const start = `${todayISO}T00:00:00+07:00`;
  const [y, m, d] = todayISO.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d));
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tYear = tomorrow.getUTCFullYear();
  const tMonth = String(tomorrow.getUTCMonth() + 1).padStart(2, "0");
  const tDay = String(tomorrow.getUTCDate()).padStart(2, "0");
  const next = `${tYear}-${tMonth}-${tDay}T00:00:00+07:00`;
  const { data, error } = await db
    .from("events")
    .select("title_th, tag, category, starts_at")
    .gte("starts_at", start)
    .lt("starts_at", next)
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
```

- [ ] **Step 2: Update `relativeWhen` in `lib/queries/carelin.ts`**

Open `lib/queries/carelin.ts`. Add to the imports:

```ts
import { relativeThaiDay } from "@/lib/time";
```

Delete the local regex and helper (currently lines 4–14):

```ts
const RELATIVE_WHEN_RE = /-(\d{2})-(\d{2})T(\d{2}:\d{2})/;

function relativeWhen(ts: string): string {
  const m = ts.match(RELATIVE_WHEN_RE);
  if (!m) return ts;
  const day = parseInt(m[2], 10);
  const hhmm = m[3];
  if (day === 12) return hhmm;
  if (day === 11) return "เมื่อวาน";
  return `${day} พ.ค.`;
}
```

Find every call site (`relativeWhen(...)`) in the file and replace with `relativeThaiDay(...)`. There are three call sites — in `getCarelinRequests`, `getCarelinDeskRows`, and `getCarelinDetail`. The replacement is name-only; the argument is unchanged.

- [ ] **Step 3: Verify types and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/events.ts lib/queries/carelin.ts
git commit -m "refactor: route today-events and carelin labels through lib/time"
```

---

### Task 7: Manual browser verification

**Files:** none — verification only.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check `/student/calendar`**

Visit `http://localhost:3000/student/calendar` while logged in as a student (or anonymously if it doesn't require auth). The month label should show the current Thai month + English `Month Year`. Today's cell should have the `today` state highlight. The event list below labels "Events on D <MMM>" with today's day and month abbreviation. If no events exist for today in the seed, the list is empty — that's expected.

- [ ] **Step 3: Check `/admin/calendar`**

Log in as admin. The topbar eyebrow should read `Calendar · Month YYYY` for the current month, the three label-buttons should show `◀ <PrevMonth>`, `<CurrentMonth YYYY>`, `<NextMonth> ▶`. The BigCal grid should render the right number of leading/trailing other-month cells for the actual current month (not always 5 leading cells like May 2026 had).

- [ ] **Step 4: Check `/student/booking`**

Visit `/student/booking`. The calendar strip should show the current month. Saturday & Sunday cells should have `state="closed"` (visually struck through or whatever the design renders for closed). Click any in-month weekday — URL should add `?date=YYYY-MM-DD` and that cell should become `selected`.

- [ ] **Step 5: Check `/admin/bookings`**

Visit `/admin/bookings` with no query string. `selectedDate` should default to today; the week grid should center on the week containing today; the "Bookings on <D MMM>" card title should show today's date. The "Last week" / "Next week" links should still work.

- [ ] **Step 6: Check `/admin/calendar/new` and `/admin/bookings/new`**

Open both forms. The datetime-local input on the calendar form should prefill to `<today>T09:00`. The date input on the booking form should prefill to `<today>`. Submit a test entry and confirm it lands on the right day (open `/admin/calendar` or `/admin/bookings` and see the new row).

- [ ] **Step 7: Check the admin overview Today events card**

Visit `/admin`. The "Today's events" card should query for today's events (via `getAdminTodayEvents`). With seed data clustered around May 12, today (post-May-12) will likely be empty — that's expected. Add a quick test event for today via `/admin/calendar/new` and reload to confirm it appears.

- [ ] **Step 8: Check Carelin labels**

Visit `/admin/carelin`. Recent reply labels should follow the new rule: today → `HH:mm`, yesterday → `เมื่อวาน`, older → `D <Thai month abbr>`. Seeded replies (dated May 11 / 12) should now show as `11 พ.ค.` / `12 พ.ค.` (because real today is past those dates), not `เมื่อวาน` / `HH:mm` — this is the intended "labels become accurate" risk flagged in the spec.

- [ ] **Step 9: Bangkok timezone sanity (optional)**

If you want to confirm the timezone handling, run:

```bash
TZ=UTC npm run dev
```

…between roughly 17:00 UTC and 24:00 UTC (which is 00:00 → 07:00 Bangkok the _next_ day). `today()` should still return the Bangkok date, not the UTC date. Skip if it's not that time window — the `Intl.DateTimeFormat` approach is reliable.

- [ ] **Step 10: Final type + lint sweep**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean. No new commit unless something needed fixing.

---

## Notes for the executing engineer

- **No test framework.** Verification is `tsc --noEmit` + `npm run lint` after each task; functional verification is browser-based in Task 7. Do not add Jest/Vitest/etc. — out of scope.
- **Server Components only.** All affected pages are server-rendered. `today()` and `currentYearMonth()` execute on the server per request. No client-side hydration mismatch risk.
- **Bangkok-resolved time.** All date/time decisions in `lib/time.ts` use `Intl.DateTimeFormat({ timeZone: "Asia/Bangkok" })`. Never use `new Date().getFullYear()` etc. directly for "today" decisions — that reads the server's local TZ, which is UTC on Vercel.
- **Empty-content acceptance.** Once real time crosses past May 2026, calendar/bookings pages will render but show empty grids/lists because the seed only covers May 2026. The user has explicitly accepted this.
- **`MAY_2026_SKELETON` callers.** This plan assumes only `lib/ui/calendar.ts` exports the static skeleton, but `lib/queries/events.ts:getStudentMonth` may also reference it internally. Task 2 includes a conditional Step 4a that handles this — run it if you see an import error after Step 4.
- **Conventional commits.** Lowercase, no `Co-Authored-By` trailer (per AGENTS.md).
- **Branch is `main`.** Consistent with prior sessions.
