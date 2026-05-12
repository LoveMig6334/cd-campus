# Bookings — week view (rooms × 7 days)

**Status:** design, awaiting plan
**Owner:** admin bookings page
**Date:** 2026-05-12

## Problem

`/admin/bookings` currently shows a single-day view: rooms × hours (08:00–18:00) Gantt plus a today-only bookings table. To see another day, the admin has three day buttons (`◀ 12 May`, `13 May`, `14 May ▶`). There is no way to scan the week as a whole, and the hardcoded `ADMIN_BOOKING_DATE = "13 May 2026"` in `lib/ui/admin.ts` makes the eyebrow text drift from the queried date (which is `2026-05-12`).

## Goal

Add a week-at-a-glance grid above the existing day Gantt so the admin can see all rooms' bookings across a calendar week (Mon–Sun) and drill into any single day's hour-level view without navigating away.

## Out of scope

- Drag-to-reschedule on either grid.
- Multi-day bookings or recurring bookings.
- Filtering the week grid by room, status, or variant.
- Re-coloring chips — the week grid reuses the existing `GanttBarVariant` palette.

## URL state

Single search param: `?date=YYYY-MM-DD`. Default = `2026-05-12` (today, matching the rest of the prototype's date anchor).

Derived in `app/admin/bookings/page.tsx`:

- `selectedDate` = `?date`
- `weekStart` = Monday of the week containing `selectedDate` (ISO weekday: Mon = 1 … Sun = 7).
- `weekEnd` = `weekStart` + 6 days, end-of-day.
- `weekDays` = array of 7 `YYYY-MM-DD` strings, Mon→Sun.

All three queries below take `selectedDate` / `weekStart` / `weekEnd`.

## Page structure

```
AdminTopbar
  ◀ Last week    Week of 11–17 May    Next week ▶    + New Booking

BookingsWeekGrid                          ← NEW
  rooms × 7 day-columns (Mon→Sun)
  cells contain stacked time chips
  selected day's column header is highlighted

Gantt                                     ← unchanged shape
  rooms × hours 08:00–18:00 for selectedDate

Card "Bookings for {selectedDate}"        ← renamed from "Today's bookings"
  AdminTodayBookingsTable (unchanged shape)
```

### Top bar

Three week-nav buttons replace the three day-nav buttons:

- `◀ Last week` — `<Link href="?date={weekStart-7d}">`
- `Week of {weekStart day}–{weekEnd day} {month}` — non-link `<Btn variant="ink">` showing the current week range.
- `Next week ▶` — `<Link href="?date={weekStart+7d}">`

`+ New Booking` is unchanged.

### BookingsWeekGrid (new component)

`components/admin/BookingsWeekGrid.tsx` — pure RSC, no client code.

**Props:**

```ts
type WeekChip = { id: string; startHHMM: string; variant: GanttBarVariant };

type BookingsWeekGridProps = {
  weekDays: string[]; // 7 ISO dates Mon→Sun
  selectedDate: string; // one of weekDays
  today: string; // YYYY-MM-DD; drives the "· today" marker
  rooms: { id: string; nameEn: string; nameTh: string }[];
  // bookingsByRoomDay[roomId]?.[dayISO] = chips for that cell, sorted by start.
  bookingsByRoomDay: Record<string, Record<string, WeekChip[]>>;
};
```

**Layout.**

- Outer wrapper mirrors the day Gantt's `overflow-x-auto border-[1.5px] border-line bg-cream p-3.5`.
- Inner grid: `grid grid-cols-[160px_repeat(7,1fr)] min-w-[820px]`.
- Header row: room-label cell ("Room"), then 7 day-column headers.
  - Each day header is `<Link href="?date={dayISO}">` so clicking selects that day for the lower Gantt.
  - Header content: `font-mono text-[10px]` weekday (`MON`, `TUE`…) on line 1, then the day number in `font-display italic text-[14px]` followed by the lowercase month abbreviation (`13 may`) on line 2.
  - Today's header gets a small `· today` marker.
  - The `selectedDate` header gets `bg-blue text-white` (matches the BigCal "today" treatment we saw on the calendar fix).
- Body rows: one per room. Each row is `room-label cell + 7 day cells`.
  - Room label cell mirrors the day Gantt's room cell exactly (English name + Thai sub).
  - Each day cell: `relative overflow-hidden border-b border-r border-dashed border-mute-300 bg-paper px-1.5 py-1.5`. The `overflow-hidden` is load-bearing — without it a cell with many chips would stretch its row and the row's other cells would inherit that height (same failure mode we just fixed on the calendar grid).
  - Inside each cell: stacked time chips. One `<Link href="/admin/bookings/{chip.id}/edit">` per chip, `block` layout, `mt-0.5` between them. Chip styles reuse the day Gantt's `BAR_VARIANT` map (`bg-blue text-white`, `bg-yellow text-ink`, etc.), `font-mono text-[10px] px-1.5 py-0.5 border-[1.5px] border-ink [box-shadow:1px_1px_0_var(--color-ink)]`. Text = `chip.startHHMM` only — enough for scan, full detail is in the lower Gantt and the table.
  - Empty cell: nothing rendered. The dashed grid lines still show the cell boundary.

**Variant fallback.** A chip whose `variant === "default"` renders with the same blue+white as the Gantt's default. We pass `bar_variant` through unchanged.

### Day Gantt (existing)

`<Gantt hours={GANTT_HOURS} rooms={ganttRooms} />` — markup unchanged. `ganttRooms` now comes from a date-parametrized version of `getGanttRooms(date)` (see Data layer below). The eyebrow above (currently `Bookings · 13 May 2026`) becomes `Bookings · {D MMM YYYY}` derived from `selectedDate` (e.g. `Bookings · 13 May 2026`).

### Day table (existing)

`AdminTodayBookingsTable` shape unchanged. The `CardTitle`'s `th` / `en` props become `"รายการจอง {D MMM Thai-abbr}" / "Bookings on {D MMM}"` derived from `selectedDate`. The `menu` text (currently hardcoded `"12 active · 2 pending"`) is replaced with a count derived from the actual rows for `selectedDate`: e.g. `"{N} active · {M} pending"` where N = rows with `status === "Confirmed"` and M = rows with `status === "Pending"` (other statuses excluded from the chip).

## Data layer

`lib/queries/bookings.ts`:

1. **Drop the file-level `TODAY` constant.** It is currently used by `getAdminTodayBookings` and `getGanttRooms`. Both become date-parametrized.

2. **`getDayBookings(dateISO: string)`** — renamed from `getAdminTodayBookings`. Same select, same return type (`AdminTodayBookingRow[]`); only the `.gte` / `.lt` bounds change to `${dateISO}T00:00:00+07:00` / next day same time. One call site (the bookings page).

3. **`getGanttRooms(dateISO: string)`** — same as today but accepts a date. The `.gte` / `.lt` use `dateISO`. The "all rooms with no bookings" fallback select stays.

4. **`getWeekBookings(weekStart: string, weekEnd: string)`** — new. Returns `{ rooms, bookingsByRoomDay }`.

   ```ts
   export async function getWeekBookings(
     weekStart: string, // YYYY-MM-DD (Monday)
     weekEnd: string, // YYYY-MM-DD (Sunday)
   ): Promise<{
     rooms: { id: string; nameEn: string; nameTh: string }[];
     bookingsByRoomDay: Record<string, Record<string, WeekChip[]>>;
   }>;
   ```

   Implementation: one select on `bookings` joined to `rooms!inner(id, name_en, name_th, sort_order)` filtered by `starts_at >= ${weekStart}T00:00:00+07:00` and `starts_at < ${weekEnd+1day}T00:00:00+07:00`. Group rows by `room_id` then by day (parsed from `starts_at` with the same regex `dayOf`-style trick we use elsewhere — no TZ math). Within each (room, day) bucket, sort chips by `startHHMM`. The "include rooms with no bookings" select on `rooms` (mirror of `getGanttRooms`) ensures the week grid renders every active room.

`lib/ui/admin.ts`:

- Remove `ADMIN_BOOKING_DATE` (dead after this change).
- `GANTT_HOURS` unchanged.

## Date helpers

Exported from `lib/queries/bookings.ts`. Both the page (for prev/next-week URLs) and the new query consume them, so they cannot be private. Promote to a dedicated `lib/date.ts` only if a third caller appears.

- `mondayOf(dateISO: string): string` — returns the ISO date string for the Monday of the week containing the input. Implementation: parse Y/M/D from the string directly (no `Date` arithmetic in user TZ to avoid drift; reuse the pattern in `dayOf`), construct a `Date` at `T00:00:00Z`, compute weekday, subtract, format back to `YYYY-MM-DD`. Pure function, easy to unit-test if needed.
- `addDays(dateISO: string, n: number): string` — same pattern.
- `weekDays(weekStart: string): string[]` — 7 ISO dates.

These are the only computations that need real `Date` math; everything user-facing keeps the regex-extract pattern used elsewhere.

## Click semantics

- Click a day-column header → `?date=` is set to that day; the lower Gantt and table update; the week grid stays on the same week.
- Click a time chip in the week grid → navigates to `/admin/bookings/{id}/edit` (same destination as the existing table's "Edit" link).
- Lower Gantt bars remain non-clickable (current behavior).

## Risks / non-issues

- **Empty week grid.** If `?date` lands on a week with no bookings, the grid still renders every active room as empty rows. Confirmed by the "include rooms with no bookings" fallback.
- **Invalid `?date`.** Treat as default (current today). No throw.
- **Row stretching.** Mitigated by `overflow-hidden` on every cell in the week grid (lesson from the calendar fix earlier today).
- **`bookings_anon_insert` policy.** Not touched by this change — week view is read-only.
- **Performance.** A week with N bookings is one select with a `rooms` join; current scale (≤ a few dozen bookings per week) doesn't need pagination or indexing changes.

## Files touched

```
app/admin/bookings/page.tsx               edit
lib/queries/bookings.ts                   edit (rename + add)
lib/ui/admin.ts                           edit (remove constant)
components/admin/BookingsWeekGrid.tsx     new
```

No new dependencies. No schema migration. No RLS change.

## Open questions

None blocking. (`useDate()` / SWR-style client state is explicitly _not_ needed; the URL is the state.)
