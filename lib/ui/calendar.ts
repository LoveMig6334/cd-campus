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
