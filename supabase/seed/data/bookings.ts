import type {
  BookingPeriod,
  BookingTab,
  CalendarDay,
  Room,
} from "./types";

export const BOOKING_TABS: BookingTab[] = [
  { id: "music", labelEn: "Music", labelTh: "ห้องดนตรี" },
  { id: "meeting", labelEn: "Meeting", labelTh: "ห้องประชุม" },
];

export const BOOKING_ACTIVE_TAB: BookingTab["id"] = "music";

const make = (
  num: number,
  opts: Partial<Omit<CalendarDay, "num">> = {},
): CalendarDay => ({ num, inMonth: true, ...opts });

const other = (num: number): CalendarDay => ({ num, inMonth: false });

/** May 2026 with 1, 6, 21 closed (line-through), 12 today, 13 selected */
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

export const BOOKING_PERIODS: BookingPeriod[] = [
  { label: "Morning", time: "08:00 — 11:00", status: "available" },
  { label: "Midday", time: "11:30 — 14:30", status: "selected" },
  { label: "Evening", time: "15:00 — 18:00", status: "booked" },
];

export const BOOKING_ROOMS: Room[] = [
  { nameEn: "Music Room 1", nameTh: "เปียโน · กลอง", status: "free" },
  { nameEn: "Music Room 2", nameTh: "กีตาร์ · เครื่องสาย", status: "free" },
  { nameEn: "Music Room 3", nameTh: "วงดุริยางค์", status: "full" },
  { nameEn: "Studio Room", nameTh: "ห้องอัด", status: "free" },
];

export const BOOKING_CONFIRM_EYEBROW = "13 MAY · MIDDAY · MUSIC ROOM 1";
