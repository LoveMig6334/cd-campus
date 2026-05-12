import {
  CATEGORY_COLOR,
  type CalendarChip,
  type CalendarDay,
  type CalendarEvent,
} from "./types";

export const CALENDAR_CHIPS: CalendarChip[] = [
  { id: "all", labelEn: "All" },
  { id: "sport", labelEn: "Sport" },
  { id: "tradition", labelEn: "Tradition" },
  { id: "music", labelEn: "Music" },
  { id: "admin", labelEn: "Admin" },
  { id: "academic", labelEn: "Academic" },
];

const C = CATEGORY_COLOR;
const YELLOW = "var(--color-yellow)";

const make = (
  num: number,
  opts: Partial<Omit<CalendarDay, "num">> = {},
): CalendarDay => ({ num, inMonth: true, ...opts });

const other = (num: number): CalendarDay => ({ num, inMonth: false });

/** May 2026 — 6 rows × 7 cols, May 1 falls on Friday */
export const MAY_2026_DAYS: CalendarDay[] = [
  // leading April 26–30 (Sun-Thu)
  other(26),
  other(27),
  other(28),
  other(29),
  other(30),
  make(1, { dots: [C.admin] }),
  make(2),
  // 3–9
  make(3),
  make(4, { dots: [C.academic] }),
  make(5),
  make(6, { dots: [C.tradition, C.music] }),
  make(7),
  make(8),
  make(9),
  // 10–16
  make(10),
  make(11, { dots: [C.sport] }),
  make(12, { state: "today", dots: [C.sport, YELLOW] }),
  make(13, { state: "selected", dots: [C.sport, C.admin] }),
  make(14, { dots: [C.sport] }),
  make(15, { dots: [C.admin] }),
  make(16),
  // 17–23
  make(17),
  make(18, { dots: [C.academic] }),
  make(19),
  make(20, { dots: [C.tradition] }),
  make(21),
  make(22, { dots: [C.music] }),
  make(23),
  // 24–30
  make(24),
  make(25, { dots: [C.academic] }),
  make(26),
  make(27),
  make(28),
  make(29, { dots: [C.admin] }),
  make(30),
  // 31 + trailing June 1–6 (Mon-Sat)
  make(31),
  other(1),
  other(2),
  other(3),
  other(4),
  other(5),
  other(6),
];

export const SELECTED_DAY_LABEL = "Events on 13 May";

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
