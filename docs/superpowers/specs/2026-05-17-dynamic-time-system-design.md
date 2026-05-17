# Dynamic Time System — calendar + bookings + downstream surfaces

Status: design approved
Owner: Tom
Date: 2026-05-17

## Problem

The app hardcodes "today" to 2026-05-12 and "current month" to May 2026 in ~12 locations across pages, queries, and UI skeletons. The calendar grid skeleton in `lib/ui/calendar.ts` and `lib/ui/booking.ts` is a hand-built 42-cell layout that only renders correctly for May 2026 (which started on a Friday). Every other month would render with the wrong leading/trailing days. Form defaults, "today" event queries, and Carelin's relative-date labels (`"เมื่อวาน"` for day 11) all assume the prototype reference date. The result is a UI that looks identical every day instead of reflecting the actual calendar.

## Goal

A single source of truth for "now" in Asia/Bangkok timezone, threaded through every place the app currently asks "what is today / this month?":

- **Student calendar** (`/student/calendar`) renders the real current month with real today highlighted.
- **Admin calendar** (`/admin/calendar`) — same.
- **Student bookings** (`/student/booking`) — calendar strip uses real current month; date filter accepts any real date in that month.
- **Admin bookings** (`/admin/bookings`) — defaults `selectedDate` to real today (the existing `?date=YYYY-MM-DD` URL nav already works for other dates).
- **Admin overview Today events card** — `getAdminTodayEvents()` queries the real today's events.
- **Carelin relative-date labels** — `เมื่อวาน` / `today HH:mm` / `D MMM` derived from comparison to real today, not from a pinned day-of-month check.
- **Form defaults** — `/admin/calendar/new` and `/admin/bookings/new` default to today (`today()` for date-only, `${today()}T09:00` for datetime-local).

Selected day = today (always). No client-side calendar navigation. The existing `?date=` URL nav on admin bookings remains the only date-navigation surface.

## Non-goals

- No month navigation UI on calendar pages (no prev/next, no month picker). The "May 2026" label-button becomes a current-month label.
- No new client-side interactivity. All pages stay Server Components.
- No reseed / seed-data regeneration. Seed stays pinned to May 2026; user accepts that calendar/bookings pages will render empty grids once real time passes May 2026.
- No `DEMO_TODAY` env-var override. Real `new Date()` is the source.
- No new caching directives.

## Approach

### New module `lib/time.ts`

Single source of truth. All "now" / "today" / "current month" decisions flow through here. Computed in `Asia/Bangkok` timezone via `Intl.DateTimeFormat` so server clock (Vercel UTC) doesn't cause off-by-one at the day boundary.

Exports:

```ts
/**
 * Today's date in Asia/Bangkok, formatted as "YYYY-MM-DD".
 * Computed at call-time; never cached.
 */
export function today(): string;

/**
 * Current Bangkok-local year and 1-indexed month, plus display labels.
 * `thaiLabel` is e.g. "พฤษภาคม"; `enLabel` is e.g. "May 2026".
 */
export function currentYearMonth(): {
  year: number;
  month: number;
  thaiLabel: string;
  enLabel: string;
};

/**
 * Convert a `YYYY-MM-DD` date into a Thai relative label:
 *   - same day as today: "HH:mm" portion of timestamp (or empty if no time)
 *   - one day before today: "เมื่อวาน"
 *   - any other date: "D ม.ค./ก.พ./..."
 * `ts` is a full ISO timestamp (e.g. "2026-05-11T14:30:00+07:00").
 */
export function relativeThaiDay(ts: string): string;

/**
 * Build a 6-row × 7-col calendar grid (42 cells, Mon-first) for the given
 * 1-indexed (year, month). Returns leading "other month" days from the prev
 * month, the in-month days, and trailing "other month" days from the next
 * month. Caller layers `state`, dots, events, hrefs onto the cells.
 */
export function buildMonthGrid(
  year: number,
  month: number,
): { num: number; inMonth: boolean }[];

/**
 * Full list of `YYYY-MM-DD` strings for every in-month day of the given
 * (year, month). Used as the validation set for booking-page `?date=`.
 */
export function monthDateSet(year: number, month: number): Set<string>;
```

(A weekday-index helper is needed *inside* `buildBookingMonthDays` to mark Sat/Sun as closed — it stays a local helper in `lib/ui/booking.ts` (or `lib/time.ts` as an internal), not part of the public API.)

Thai month name constants (`THAI_MONTHS_FULL = ["มกราคม", …]` and `THAI_MONTHS_ABBR = ["ม.ค.", …]`) move into this module from `lib/queries/pshare.ts` / `lib/queries/carelin.ts` so there's one canonical list.

### UI skeleton functions

`lib/ui/calendar.ts` and `lib/ui/booking.ts` lose their static `MAY_2026_SKELETON` / `BOOKING_MAY_DAYS` exports and gain:

```ts
// lib/ui/calendar.ts
export function buildCalendarSkeleton(
  year: number,
  month: number,
  todayISO: string,
): CalendarDay[];
// Wraps buildMonthGrid; marks the cell matching `todayISO`'s day as state:"today".
// No "selected" state — per design, selected = today.

// lib/ui/booking.ts
export function buildBookingMonthDays(
  year: number,
  month: number,
  todayISO: string,
): CalendarDay[];
// Wraps buildMonthGrid; marks today; marks every Saturday/Sunday as state:"closed".
// (The current static export pins 1/6/21 as closed — those were decorative; weekends are a more sensible default.)
```

`SELECTED_DAY_LABEL` in `lib/ui/calendar.ts` is deleted; pages derive it inline: `` `Events on ${day} ${enMonthAbbr}` ``.

### Page changes (8 files)

| File | Change |
|---|---|
| `app/student/calendar/page.tsx` | Replace `getStudentMonth(2026, 5)` / `getStudentDayEvents(2026, 5, 13)` with `currentYearMonth()` + `today()` derived values. `CalendarMonthRow titleTh/subEn` use the dynamic labels. |
| `app/admin/calendar/page.tsx` | Same — `getAdminMonth(year, month)` and `getAdminMonthEventList(year, month)`. Topbar `eyebrow="Calendar · May 2026"` and `<Btn>May 2026</Btn>` become dynamic. |
| `app/student/booking/page.tsx` | `MAY_DATES` set → `monthDateSet(year, month)`. `BOOKING_MAY_DAYS` → `buildBookingMonthDays(year, month, today())`. `iso = ${year}-${MM}-${dd}` in the day-mapping callback. `CalendarMonthRow titleTh="May 2026"` → dynamic label. `buildEyebrow` "MAY" → dynamic month abbr. |
| `app/admin/bookings/page.tsx` | `TODAY = "2026-05-12"` → `today()`. Everything else (`?date=` parsing, default fallback, week grid) already takes any date as a string and works unchanged. |
| `app/admin/calendar/new/page.tsx` | Form `defaultValue="2026-05-12T09:00"` → `` `${today()}T09:00` ``. |
| `app/admin/calendar/[id]/edit/page.tsx` | No code change; the comment example uses 2026-05-12 but the actual value comes from the DB row. |
| `app/admin/bookings/new/page.tsx` | Form `defaultValue="2026-05-13"` → `today()`. |
| `app/admin/bookings/[id]/edit/page.tsx` | No code change; same as calendar edit. |

### Query / library changes (2 files)

| File | Change |
|---|---|
| `lib/queries/events.ts` | `getAdminTodayEvents()` — drop the hardcoded `2026-05-12T00:00:00+07:00` / `2026-05-13T00:00:00+07:00` bounds. Replace with `today()` and a `nextDayISO(today())` helper inside the function. Comment "// Today in the prototype is 2026-05-12." is deleted. |
| `lib/queries/carelin.ts` | `relativeWhen()` — currently checks `day === 12` / `day === 11`. Replace with calls to `relativeThaiDay(ts)` from `lib/time.ts`. Local `RELATIVE_WHEN_RE` regex and the inline logic are deleted. |

`lib/queries/pshare.ts` already has its own `THAI_MONTHS` and `thaiDate()` helper that doesn't depend on "today" — it stays as-is for now (the goal here is dynamic *today*, not refactoring all date formatters). Future cleanup: consolidate Thai month constants into `lib/time.ts`.

### Bangkok-timezone computation

`new Date()` returns a UTC-anchored instant; `.getFullYear()`/`.getMonth()`/`.getDate()` use the *server's* local timezone, which on Vercel is UTC. That means between 17:00 UTC and 24:00 UTC (00:00–07:00 Bangkok next day) we'd report "yesterday" as today for Bangkok users.

The fix:

```ts
function bangkokParts(): { y: number; m: number; d: number } {
  // en-CA gives YYYY-MM-DD with hyphens, which is trivial to split.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function today(): string {
  const { y, m, d } = bangkokParts();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function currentYearMonth() {
  const { y, m } = bangkokParts();
  return {
    year: y,
    month: m,
    thaiLabel: THAI_MONTHS_FULL[m - 1],
    enLabel: `${EN_MONTHS_FULL[m - 1]} ${y}`,
  };
}
```

`buildMonthGrid` uses `new Date(Date.UTC(year, month - 1, 1))` for first-day math (no timezone risk because we never derive "today" from this Date — we only need weekday position and days-in-month, which are timezone-invariant for explicit Y/M/D inputs).

### Calendar grid algorithm

```ts
export function buildMonthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // Mon=0 … Sun=6 (matches the existing mondayOf convention in bookings.ts)
  const leadCount = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysInPrev = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

  const cells: { num: number; inMonth: boolean }[] = [];

  // Leading other-month days
  for (let i = leadCount; i > 0; i--) {
    cells.push({ num: daysInPrev - i + 1, inMonth: false });
  }
  // In-month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ num: d, inMonth: true });
  }
  // Trailing other-month days to fill 42 cells (6 rows × 7 cols)
  let trailing = 1;
  while (cells.length < 42) {
    cells.push({ num: trailing++, inMonth: false });
  }

  return cells;
}
```

42 cells gives a fixed 6-row grid (handles months that span 5 or 6 calendar rows uniformly; matches the existing skeleton).

### Carelin `relativeThaiDay`

Replaces the day-of-month heuristic with a real comparison:

```ts
export function relativeThaiDay(ts: string): string {
  // ts: "2026-05-11T14:30:00+07:00"
  const dateISO = ts.slice(0, 10);
  const timeMatch = ts.match(/T(\d{2}:\d{2})/);
  const hhmm = timeMatch ? timeMatch[1] : "";
  const todayISO = today();
  if (dateISO === todayISO) return hhmm;
  // Yesterday in Bangkok terms
  const yesterdayISO = addBangkokDays(todayISO, -1);
  if (dateISO === yesterdayISO) return "เมื่อวาน";
  // "D ม.ค./ก.พ./..."
  const m = ts.match(/-(\d{2})-(\d{2})T/);
  if (!m) return ts;
  const day = parseInt(m[2], 10);
  const mon = parseInt(m[1], 10);
  return `${day} ${THAI_MONTHS_ABBR[mon - 1]}`;
}

function addBangkokDays(dateISO: string, n: number): string {
  // Reuses the same algorithm as bookings.ts addDays, in-module to avoid
  // pulling queries into the time util.
}
```

`addBangkokDays` and `bookings.ts:addDays` are intentionally not merged in this spec — they live in different layers (`lib/time.ts` vs `lib/queries/bookings.ts`). Future cleanup could consolidate; not needed now.

## Edge cases

- **Empty months.** Once real time crosses past May 2026, queries return zero results and the calendar grid renders correctly but blank. **User-accepted** in brainstorming (Q1). Manual test: trigger by editing the system clock or temporarily changing `today()` to return `"2026-07-01"` and reload.
- **Server clock != Bangkok.** Handled by `Intl.DateTimeFormat({timeZone: "Asia/Bangkok"})`. Verifiable by setting `TZ=UTC` env when running `npm run dev` and confirming `today()` still returns Bangkok's date.
- **Cross-month dates in `relativeThaiDay`.** Yesterday across a month boundary (e.g. today June 1, yesterday May 31) is handled by `addBangkokDays`, not by naive `day - 1`.
- **Saturdays/Sundays "closed" on booking grid.** Replaces the prototype's arbitrary 1/6/21 closed days with a real rule. If you ever need to add holidays, the function takes a `todayISO` and computes weekend membership — adding `holidays?: Set<string>` later is a small extension.
- **Form defaults at midnight.** `${today()}T09:00` for the calendar event form: even if a user opens it at 23:55 Bangkok, "today" is still today (consistent with the rest of the page).
- **Suspense / streaming.** All affected pages already use `await` at the top of the component (Next 16 dynamic). No change to their dynamism.

## What changes, file by file

**New**
- `lib/time.ts` — ~120 lines: `today`, `currentYearMonth`, `relativeThaiDay`, `buildMonthGrid`, `monthDateSet`, `weekdayIndex`, plus the two Thai month constant arrays and an English month abbr/full pair.

**Modified — UI builders**
- `lib/ui/calendar.ts` — delete `MAY_2026_SKELETON` and `SELECTED_DAY_LABEL`; add `buildCalendarSkeleton(year, month, todayISO)`.
- `lib/ui/booking.ts` — delete `BOOKING_MAY_DAYS`; add `buildBookingMonthDays(year, month, todayISO)`.

**Modified — pages (form + read)**
- `app/student/calendar/page.tsx`
- `app/admin/calendar/page.tsx`
- `app/student/booking/page.tsx`
- `app/admin/bookings/page.tsx`
- `app/admin/calendar/new/page.tsx`
- `app/admin/bookings/new/page.tsx`

**Modified — queries**
- `lib/queries/events.ts` (`getAdminTodayEvents`)
- `lib/queries/carelin.ts` (`relativeWhen` → use `relativeThaiDay`)

**Not touched** — `lib/queries/bookings.ts` (already parametrized), `lib/queries/pshare.ts` (own `thaiDate`, no "today" dependency), `lib/queries/util.ts:monthRange` (already parametrized), `*/edit/page.tsx` (default value comes from DB row).

## Risks

- **Carelin label semantics change.** Today (May 17), the existing seeded carelin replies show as `เมื่อวาน` / time-only because the seed pinned reply timestamps to May 11/12. After this change with real today = 2026-05-17 (or later), all those seed timestamps resolve to "11 พ.ค." / "12 พ.ค." (the real-date branch). This is the intended behavior — the labels now mean what they say. Worth flagging in the PR.
- **Booking grid `closed` rule change.** Switching from "1/6/21 closed" (decorative) to "weekends closed" (rule-based) means visible day strikethroughs move. Users haven't seen rule-based weekend closure in this prototype before; the visual diff is a feature, not a regression.
- **Empty UI past May 2026.** Once real time exits the seed window, calendar/bookings render blank. **User-accepted.**
- **`Intl.DateTimeFormat` performance.** Called per request, per affected page. Allocation is microseconds; not a real concern at prototype scale.

## Test plan

Manual (no test framework in repo). Run `npm run dev`:

- `/student/calendar` renders current month name (Thai + English) and grid with today highlighted; events list below shows today's events (or empty).
- `/admin/calendar` — same; the "May 2026" topbar eyebrow and button now show the current month label.
- `/student/booking` — calendar strip shows current month; Sat/Sun cells render `state="closed"`; clicking a date sets `?date=YYYY-MM-DD` and the date passes the validity check.
- `/admin/bookings` (no `?date=`) — defaults to today's date, week grid renders correctly with today highlighted.
- `/admin/bookings?date=2026-05-12` — still works (week grid renders around May 12 even though "today" is elsewhere).
- `/admin/calendar/new` — datetime-local input prefilled to today at 09:00.
- `/admin/bookings/new` — date input prefilled to today.
- `/admin` overview Today events card — populated by `getAdminTodayEvents()` for today (empty if no real-today events in seed).
- `/admin/carelin` — recent replies render with the new `relativeThaiDay` labels.
- Lint + types: `npx tsc --noEmit && npm run lint` clean.
- Bangkok timezone sanity: run `TZ=UTC npm run dev` between 17:00 UTC and 24:00 UTC (= early morning Bangkok next day); confirm `today()` reports the Bangkok date, not the UTC date.
