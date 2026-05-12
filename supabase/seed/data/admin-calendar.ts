import type { BigCalDay } from "@/lib/types";

const make = (
  num: number,
  rest: Partial<Omit<BigCalDay, "num">> = {},
): BigCalDay => ({ num, inMonth: true, ...rest });

const other = (num: number): BigCalDay => ({ num, inMonth: false });

/** Admin month grid for May 2026 — same calendar geometry as student calendar. */
export const ADMIN_MAY_2026: BigCalDay[] = [
  other(26),
  other(27),
  other(28),
  other(29),
  other(30),
  make(1, { events: [{ title: "Labor Day · holiday", variant: "admin" }] }),
  make(2),
  make(3),
  make(4, { events: [{ title: "Coronation Day", variant: "academic" }] }),
  make(5),
  make(6, {
    events: [
      { title: "Wai Khru rehearsal", variant: "tradition" },
      { title: "Choir audition", variant: "music" },
    ],
  }),
  make(7),
  make(8),
  make(9),
  make(10),
  make(11, { events: [{ title: "Sport Day · Day 1", variant: "sport" }] }),
  make(12, {
    isToday: true,
    events: [
      { title: "Sport Day · Day 2", variant: "sport" },
      { title: "Briefing", variant: "highlight" },
    ],
  }),
  make(13, {
    events: [
      { title: "Sport Day · Day 3", variant: "sport" },
      { title: "Council mtg.", variant: "admin" },
    ],
  }),
  make(14, { events: [{ title: "Awards Ceremony", variant: "sport" }] }),
  make(15, { events: [{ title: "Open House prep", variant: "admin" }] }),
  make(16),
  make(17),
  make(18, { events: [{ title: "Mid-term Math", variant: "academic" }] }),
  make(19, { events: [{ title: "Mid-term Eng", variant: "academic" }] }),
  make(20, {
    events: [{ title: "Visit royal project", variant: "tradition" }],
  }),
  make(21),
  make(22, { events: [{ title: "Orchestra concert", variant: "music" }] }),
  make(23),
  make(24),
  make(25, {
    events: [{ title: "Science Camp briefing", variant: "academic" }],
  }),
  make(26),
  make(27),
  make(28),
  make(29, { events: [{ title: "Parent-Teacher", variant: "admin" }] }),
  make(30),
  make(31),
  other(1),
  other(2),
  other(3),
  other(4),
  other(5),
  other(6),
];
