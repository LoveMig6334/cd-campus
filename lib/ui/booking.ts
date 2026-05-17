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
  const monthStr = String(month).padStart(2, "0");
  // Cell index 0 = Sunday of the first row; weekday = i % 7 (0=Sun … 6=Sat).
  return buildMonthGrid(year, month).map<CalendarDay>((cell, i) => {
    if (!cell.inMonth) return { num: cell.num, inMonth: false };
    const iso = `${year}-${monthStr}-${String(cell.num).padStart(2, "0")}`;
    if (iso === todayISO) {
      return { num: cell.num, inMonth: true, state: "today" };
    }
    if (iso < todayISO) {
      return { num: cell.num, inMonth: true, state: "closed" };
    }
    const weekday = i % 7;
    if (weekday === 0 || weekday === 6) {
      return { num: cell.num, inMonth: true, state: "closed" };
    }
    return { num: cell.num, inMonth: true };
  });
}
