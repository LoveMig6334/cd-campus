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
