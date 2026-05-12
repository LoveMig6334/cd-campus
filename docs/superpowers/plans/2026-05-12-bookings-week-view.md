# Bookings Week View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a week-at-a-glance booking grid above the existing day Gantt at `/admin/bookings`, driven by a single `?date=YYYY-MM-DD` URL param.

**Architecture:** New RSC `BookingsWeekGrid` (rooms × 7 days, Mon→Sun) sits above the existing single-day Gantt. A new `getWeekBookings` query feeds it. `getAdminTodayBookings` and `getGanttRooms` become date-parametrized; `getAdminTodayBookings` is renamed `getDayBookings`. The file-level `TODAY = "2026-05-12"` constant in `lib/queries/bookings.ts` and `ADMIN_BOOKING_DATE` in `lib/ui/admin.ts` go away. State lives in `?date` (YYYY-MM-DD); week navigation buttons are `<Link>`s setting `?date=` to ±7 days of the current Monday. Date helpers (`mondayOf`, `addDays`, `weekDaysOf`) are exported from `lib/queries/bookings.ts`.

**Tech Stack:** Next 16 RSC + React 19 + Supabase. No new dependencies. No schema migration. Per-task commits on `main` (no `Co-Authored-By` trailer).

**Verification:** This codebase has no test runner. Each task verifies via `npx tsc --noEmit`. Task 4 also requires a manual browser walkthrough.

**Spec:** `docs/superpowers/specs/2026-05-12-bookings-week-view-design.md`

---

### Task 1: Date helpers + `getWeekBookings` query

Pure additions to `lib/queries/bookings.ts`. Existing call sites stay green; no other files change.

**Files:**

- Modify: `lib/queries/bookings.ts`

- [ ] **Step 1: Inspect current imports**

Run: `head -15 lib/queries/bookings.ts`

Confirm `GanttBarVariant` is already imported from `@/lib/types` (line 7). If not, add it.

- [ ] **Step 2: Add date helpers above the existing `TODAY` constant**

Open `lib/queries/bookings.ts`. After the import block (after the existing `BookingFull` export at line ~11), insert:

```ts
export type WeekChip = {
  id: string;
  startHHMM: string;
  variant: GanttBarVariant;
};

export function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function mondayOf(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Mon=0 … Sun=6 (Mon-first ordering)
  const dayIdx = (dt.getUTCDay() + 6) % 7;
  return addDays(dateISO, -dayIdx);
}

export function weekDaysOf(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
```

- [ ] **Step 3: Add `getWeekBookings` after `getGanttRooms`**

Open `lib/queries/bookings.ts`. After the `getGanttRooms` function (the one ending at the `return [...byRoom.values()].sort(...)` block around line 148), insert:

```ts
export async function getWeekBookings(
  weekStart: string,
  weekEnd: string,
): Promise<{
  rooms: { id: string; nameEn: string; nameTh: string }[];
  bookingsByRoomDay: Record<string, Record<string, WeekChip[]>>;
}> {
  const db = await createClient();
  const nextDay = addDays(weekEnd, 1);
  const { data, error } = await db
    .from("bookings")
    .select("id, starts_at, bar_variant, room_id")
    .gte("starts_at", `${weekStart}T00:00:00+07:00`)
    .lt("starts_at", `${nextDay}T00:00:00+07:00`)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getWeekBookings: ${error.message}`);

  const { data: roomRows, error: roomsErr } = await db
    .from("rooms")
    .select("id, name_en, name_th, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (roomsErr) throw new Error(`getWeekBookings rooms: ${roomsErr.message}`);

  const bookingsByRoomDay: Record<string, Record<string, WeekChip[]>> = {};
  for (const b of data ?? []) {
    const dayISO = b.starts_at.slice(0, 10);
    const startHHMM = timeFromTimestamp(b.starts_at);
    const room = (bookingsByRoomDay[b.room_id] ??= {});
    (room[dayISO] ??= []).push({
      id: b.id,
      startHHMM,
      variant: b.bar_variant as GanttBarVariant,
    });
  }

  return {
    rooms: (roomRows ?? []).map((r) => ({
      id: r.id,
      nameEn: r.name_en,
      nameTh: r.name_th,
    })),
    bookingsByRoomDay,
  };
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`

Expected: clean (no output).

- [ ] **Step 5: Commit**

```bash
git add lib/queries/bookings.ts
git commit -m "add: getWeekBookings query + date helpers"
```

---

### Task 2: Date-parametrize `getGanttRooms` and rename `getAdminTodayBookings` → `getDayBookings`

The two existing day-scoped queries get a `dateISO` parameter, and the file-level `TODAY` constant is removed. The single call site in the bookings page is updated to pass the (still-hardcoded for now) date so the build stays green.

**Files:**

- Modify: `lib/queries/bookings.ts`
- Modify: `app/admin/bookings/page.tsx`

- [ ] **Step 1: Remove the `TODAY` constant**

In `lib/queries/bookings.ts`, delete the line:

```ts
const TODAY = "2026-05-12";
```

- [ ] **Step 2: Parametrize `getGanttRooms`**

Change the signature and the two date bounds:

```ts
export async function getGanttRooms(dateISO: string): Promise<GanttRoom[]> {
  const db = await createClient();
  const nextDay = addDays(dateISO, 1);
  const { data, error } = await db
    .from("bookings")
    .select(
      "user_label, starts_at, ends_at, bar_variant, purpose, rooms!inner(name_en, name_th, sort_order)",
    )
    .gte("starts_at", `${dateISO}T00:00:00+07:00`)
    .lt("starts_at", `${nextDay}T00:00:00+07:00`)
    .order("starts_at", { ascending: true });
  // … rest of function body unchanged
```

Only the function signature, the two `.gte`/`.lt` lines, and the `nextDay` derivation change. Everything below (the `byRoom` map building, the "include rooms with no bookings" fallback, the final sort/return) is untouched.

- [ ] **Step 3: Rename `getAdminTodayBookings` to `getDayBookings` and parametrize**

In `lib/queries/bookings.ts`:

```ts
export async function getDayBookings(
  dateISO: string,
): Promise<AdminTodayBookingRow[]> {
  const db = await createClient();
  const nextDay = addDays(dateISO, 1);
  const { data, error } = await db
    .from("bookings")
    .select(
      "id, user_label, purpose, starts_at, ends_at, status, rooms!inner(name_en)",
    )
    .gte("starts_at", `${dateISO}T00:00:00+07:00`)
    .lt("starts_at", `${nextDay}T00:00:00+07:00`)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getDayBookings: ${error.message}`);
  return (data ?? []).map<AdminTodayBookingRow>((b) => {
    const room = b.rooms as unknown as { name_en: string } | null;
    return {
      id: b.id,
      room: room?.name_en ?? "",
      user: b.user_label,
      start: timeFromTimestamp(b.starts_at),
      end: timeFromTimestamp(b.ends_at),
      purpose: b.purpose ?? "",
      status: b.status as AdminTodayBookingRow["status"],
    };
  });
}
```

Note: the only structural change vs the original `getAdminTodayBookings` is the renamed function, the new `dateISO` parameter, and the `nextDay` derivation replacing the hardcoded `2026-05-13` bound. Error message also updates from `getAdminTodayBookings:` to `getDayBookings:`.

- [ ] **Step 4: Update the call site in the bookings page**

Open `app/admin/bookings/page.tsx`. Replace the import line:

```ts
import { getAdminTodayBookings, getGanttRooms } from "@/lib/queries/bookings";
```

with:

```ts
import { getDayBookings, getGanttRooms } from "@/lib/queries/bookings";
```

And update the `Promise.all` block:

```tsx
const [todayBookings, ganttRooms] = await Promise.all([
  getDayBookings("2026-05-12"),
  getGanttRooms("2026-05-12"),
]);
```

(The hardcoded `"2026-05-12"` lives here only until Task 4 wires it to `?date`.)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/queries/bookings.ts app/admin/bookings/page.tsx
git commit -m "refactor: date-parametrize day-scoped booking queries"
```

---

### Task 3: New `BookingsWeekGrid` component

Add the rooms × 7-days RSC component. File created but not yet rendered anywhere — Task 4 wires it in. Safe additive change.

**Files:**

- Create: `components/admin/BookingsWeekGrid.tsx`

- [ ] **Step 1: Create the component**

Write the file:

```tsx
import Link from "next/link";
import type { GanttBarVariant } from "@/lib/types";
import type { WeekChip } from "@/lib/queries/bookings";
import { cn } from "@/lib/cn";

const CHIP_VARIANT: Record<GanttBarVariant, string> = {
  default: "bg-blue text-white",
  y: "bg-yellow text-ink",
  p: "bg-house-purple text-white",
  g: "bg-house-green text-white",
  o: "bg-house-orange text-white",
};

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_ABBR = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function dayHeader(dateISO: string, idx: number, today: string) {
  const [, m, d] = dateISO.split("-").map(Number);
  return {
    weekday: WEEKDAY_LABELS[idx],
    dayNum: d,
    monthAbbr: MONTH_ABBR[m - 1],
    isToday: dateISO === today,
  };
}

export function BookingsWeekGrid({
  weekDays,
  selectedDate,
  today,
  rooms,
  bookingsByRoomDay,
}: {
  weekDays: string[];
  selectedDate: string;
  today: string;
  rooms: { id: string; nameEn: string; nameTh: string }[];
  bookingsByRoomDay: Record<string, Record<string, WeekChip[]>>;
}) {
  return (
    <div className="border-line bg-cream overflow-x-auto border-[1.5px] p-3.5">
      <div className="grid min-w-[820px] grid-cols-[160px_repeat(7,1fr)]">
        <div className="border-ink bg-paper text-mute-500 border-b-[1.5px] px-2.5 py-2 font-mono text-[10px] tracking-[0.1em] uppercase">
          Room
        </div>
        {weekDays.map((dayISO, i) => {
          const h = dayHeader(dayISO, i, today);
          const isSelected = dayISO === selectedDate;
          return (
            <Link
              key={dayISO}
              href={`?date=${dayISO}`}
              className={cn(
                "border-ink border-b-[1.5px] px-2.5 py-2 text-left",
                i < 6 && "border-mute-300 border-r border-dashed",
                isSelected ? "bg-blue text-white" : "bg-paper",
              )}
            >
              <div
                className={cn(
                  "font-mono text-[10px] tracking-[0.1em] uppercase",
                  isSelected ? "text-white/80" : "text-mute-500",
                )}
              >
                {h.weekday}
                {h.isToday && " · today"}
              </div>
              <div
                className={cn(
                  "font-display text-[14px] leading-tight italic",
                  isSelected ? "text-white" : "text-ink",
                )}
              >
                {h.dayNum} {h.monthAbbr}
              </div>
            </Link>
          );
        })}

        {rooms.map((room) => (
          <RoomRow
            key={room.id}
            room={room}
            weekDays={weekDays}
            bookings={bookingsByRoomDay[room.id] ?? {}}
          />
        ))}
      </div>
    </div>
  );
}

function RoomRow({
  room,
  weekDays,
  bookings,
}: {
  room: { id: string; nameEn: string; nameTh: string };
  weekDays: string[];
  bookings: Record<string, WeekChip[]>;
}) {
  return (
    <>
      <div className="border-mute-300 border-r-ink bg-paper font-display border-r-[1.5px] border-b border-dashed px-2.5 py-3 text-[15px] italic">
        {room.nameEn}
        <small className="text-mute-500 mt-0.5 block font-mono text-[9px] tracking-[0.14em] uppercase not-italic">
          {room.nameTh}
        </small>
      </div>
      {weekDays.map((dayISO, i) => {
        const chips = bookings[dayISO] ?? [];
        return (
          <div
            key={dayISO}
            className={cn(
              "border-mute-300 bg-paper relative min-h-16 overflow-hidden border-b border-dashed px-1.5 py-1.5",
              i < 6 && "border-mute-300 border-r border-dashed",
            )}
          >
            {chips.map((c) => (
              <Link
                key={c.id}
                href={`/admin/bookings/${c.id}/edit`}
                className={cn(
                  "border-ink mt-0.5 block border-[1.5px] px-1.5 py-0.5 font-mono text-[10px] [box-shadow:1px_1px_0_var(--color-ink)] first:mt-0",
                  CHIP_VARIANT[c.variant],
                )}
              >
                {c.startHHMM}
              </Link>
            ))}
          </div>
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/admin/BookingsWeekGrid.tsx
git commit -m "add: BookingsWeekGrid component"
```

---

### Task 4: Wire the page to `?date` + week navigation

Final task: rewrite the page to read `?date`, render the week grid, switch the lower Gantt and table over to the selected date, and drop the now-dead `ADMIN_BOOKING_DATE` constant.

**Files:**

- Modify: `app/admin/bookings/page.tsx`
- Modify: `lib/ui/admin.ts`

- [ ] **Step 1: Drop `ADMIN_BOOKING_DATE` from `lib/ui/admin.ts`**

Open `lib/ui/admin.ts`. Delete the line:

```ts
export const ADMIN_BOOKING_DATE = "13 May 2026";
```

The `GANTT_HOURS` export below it stays. `PLACEMENT_COLOR` and `CATEGORY_COLOR` imports also stay.

- [ ] **Step 2: Verify no other consumer of `ADMIN_BOOKING_DATE`**

Run: `grep -rn "ADMIN_BOOKING_DATE" --include="*.ts" --include="*.tsx"`

Expected: only the import line in `app/admin/bookings/page.tsx` (which we are about to rewrite). If any other consumer appears, stop and investigate.

- [ ] **Step 3: Rewrite `app/admin/bookings/page.tsx`**

Replace the entire file with:

```tsx
import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminTodayBookingsTable } from "@/components/admin/AdminTodayBookingsTable";
import { BookingsWeekGrid } from "@/components/admin/BookingsWeekGrid";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { Gantt } from "@/components/admin/Gantt";
import {
  addDays,
  getDayBookings,
  getGanttRooms,
  getWeekBookings,
  mondayOf,
  weekDaysOf,
} from "@/lib/queries/bookings";
import { GANTT_HOURS } from "@/lib/ui/admin";

const TODAY = "2026-05-12";
const MONTHS = [
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
];
const MONTHS_TH = [
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

function isValidDate(s: string | undefined): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function fmtEn(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function fmtEnShort(dateISO: string): string {
  const [, m, d] = dateISO.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function fmtTh(dateISO: string): string {
  const [, m, d] = dateISO.split("-").map(Number);
  return `${d} ${MONTHS_TH[m - 1]}`;
}

function fmtWeekRange(start: string, end: string): string {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  if (sm === em) return `Week of ${sd}–${ed} ${MONTHS[sm - 1]}`;
  return `Week of ${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]}`;
}

const LINK_BTN =
  "inline-block border-[1.5px] border-line bg-paper px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all hover:bg-cream-2";

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const selectedDate = isValidDate(params.date) ? params.date : TODAY;
  const weekStart = mondayOf(selectedDate);
  const weekEnd = addDays(weekStart, 6);
  const days = weekDaysOf(weekStart);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const [week, ganttRooms, dayBookings] = await Promise.all([
    getWeekBookings(weekStart, weekEnd),
    getGanttRooms(selectedDate),
    getDayBookings(selectedDate),
  ]);

  const activeCount = dayBookings.filter(
    (b) => b.status === "Confirmed",
  ).length;
  const pendingCount = dayBookings.filter((b) => b.status === "Pending").length;

  return (
    <>
      <AdminTopbar
        titleTh="จองห้อง"
        eyebrow={`Bookings · ${fmtEn(selectedDate)}`}
        actions={
          <>
            <Link href={`?date=${prevWeek}`} className={LINK_BTN}>
              ◀ Last week
            </Link>
            <Btn variant="ink">{fmtWeekRange(weekStart, weekEnd)}</Btn>
            <Link href={`?date=${nextWeek}`} className={LINK_BTN}>
              Next week ▶
            </Link>
            <Link
              href="/admin/bookings/new"
              className="border-line bg-blue hover:bg-blue-deep inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white uppercase [box-shadow:3px_3px_0_var(--color-ink)] transition-all hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:4px_4px_0_var(--color-ink)]"
            >
              + New Booking
            </Link>
          </>
        }
      />

      <BookingsWeekGrid
        weekDays={days}
        selectedDate={selectedDate}
        today={TODAY}
        rooms={week.rooms}
        bookingsByRoomDay={week.bookingsByRoomDay}
      />

      <div className="mt-[18px]">
        <Gantt hours={GANTT_HOURS} rooms={ganttRooms} />
      </div>

      <Card className="mt-[18px]">
        <CardTitle
          th={`รายการจอง ${fmtTh(selectedDate)}`}
          en={`Bookings on ${fmtEnShort(selectedDate)}`}
          menu={`${activeCount} active · ${pendingCount} pending`}
        />
        <AdminTodayBookingsTable rows={dayBookings} />
      </Card>
    </>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`

Expected: clean (no output).

- [ ] **Step 5: Manual browser verification**

Start the dev server: `npm run dev`

Log in as an admin, then visit `/admin/bookings`. Walk through:

1. Default load (no `?date`): top bar reads `Bookings · 12 May 2026`. The week-range button reads `Week of 11–17 May`. The Tuesday column header is highlighted (`bg-blue text-white`) and has `· today` after the weekday label.
2. Week grid: each room row has 7 day-cells (Mon → Sun). Bookings appear as time chips inside the matching (room, day) cell, ordered by start.
3. Click a different day-column header (e.g. `Thu 14`). URL becomes `?date=2026-05-14`. Lower Gantt and bottom-table swap to that day's bookings. Top eyebrow and CardTitle update. The Thursday header is now `bg-blue`; Tuesday loses the highlight but keeps `· today`.
4. Click `Next week ▶`. URL becomes `?date=2026-05-18` (Monday of next week). Grid shows week of 18–24 May. Selected day header is Monday (the new week's Monday).
5. Click `◀ Last week`. URL becomes `?date=2026-05-04`. Grid shows week of 4–10 May.
6. Click any time chip in a week-grid cell → navigates to `/admin/bookings/{id}/edit`.
7. Pick a day with no bookings (e.g. an empty Sunday). The week grid renders the column with empty cells (dashed borders intact). The lower Gantt renders empty rooms. The bottom table shows zero rows. `menu` text reads `0 active · 0 pending`.
8. Refresh on each URL → state survives.

If any step fails, stop and capture the failing behavior before continuing.

- [ ] **Step 6: Commit**

```bash
git add app/admin/bookings/page.tsx lib/ui/admin.ts
git commit -m "add: bookings page week view + ?date URL state"
```

---

## Self-review checklist (run after Task 4)

- [ ] `npx tsc --noEmit` → clean.
- [ ] `grep -rn "ADMIN_BOOKING_DATE" --include="*.ts" --include="*.tsx"` → no results.
- [ ] `grep -rn "getAdminTodayBookings" --include="*.ts" --include="*.tsx"` → no results.
- [ ] `grep -rn "TODAY = \"2026-05-12\"" lib/queries/` → no results.
- [ ] The 8 manual-walkthrough items in Task 4 Step 5 all pass.

If any check fails, the corresponding task is incomplete — go back and finish it before declaring done.
