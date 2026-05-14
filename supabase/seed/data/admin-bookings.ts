import type { AdminTodayBookingRow, GanttRoom } from "@/lib/types";

export const GANTT_ROOMS: GanttRoom[] = [
  {
    nameEn: "Music Room 1",
    nameTh: "เปียโน · กลอง",
    bars: [
      {
        who: "ธรรศ์ ภัทรกุล",
        meta: "11:30 — 14:30 · Music",
        leftPct: 35,
        widthPct: 30,
      },
      {
        who: "ภูริ บ.",
        meta: "15:30 — 17:00",
        leftPct: 75,
        widthPct: 20,
        variant: "p",
      },
    ],
  },
  {
    nameEn: "Music Room 2",
    nameTh: "กีตาร์ · เครื่องสาย",
    bars: [
      {
        who: "String ensemble",
        meta: "09:00 — 10:50",
        leftPct: 10,
        widthPct: 18,
        variant: "y",
      },
      {
        who: "Guitar Club",
        meta: "14:00 — 16:15",
        leftPct: 60,
        widthPct: 22,
        variant: "g",
      },
    ],
  },
  {
    nameEn: "Music Room 3",
    nameTh: "วงดุริยางค์",
    bars: [
      {
        who: "Orchestra rehearsal",
        meta: "08:00 — 14:00 · All-day",
        leftPct: 0,
        widthPct: 60,
        variant: "o",
      },
      {
        who: "Choir Y9",
        meta: "15:30 — 18:00",
        leftPct: 75,
        widthPct: 25,
        variant: "p",
      },
    ],
  },
  {
    nameEn: "Studio Room",
    nameTh: "ห้องอัด",
    bars: [
      { who: "นพดล ส.", meta: "10:30 — 13:00", leftPct: 25, widthPct: 25 },
    ],
  },
  {
    nameEn: "Conference 2",
    nameTh: "ห้องประชุมเล็ก",
    bars: [
      {
        who: "Sci Club",
        meta: "15:30 — 17:00",
        leftPct: 75,
        widthPct: 15,
        variant: "y",
      },
    ],
  },
  {
    nameEn: "Conference 3",
    nameTh: "ห้องประชุมใหญ่",
    bars: [
      {
        who: "Staff briefing",
        meta: "09:00 — 10:30",
        leftPct: 10,
        widthPct: 15,
      },
      {
        who: "Curriculum review",
        meta: "14:00 — 17:00",
        leftPct: 60,
        widthPct: 30,
        variant: "g",
      },
    ],
  },
];

export const ADMIN_TODAY_BOOKINGS: Omit<AdminTodayBookingRow, "id">[] = [
  {
    room: "Music Room 1",
    user: "ธรรศ์ ภัทรกุล",
    start: "11:30",
    end: "14:30",
    purpose: "Piano practice",
    status: "Confirmed",
  },
  {
    room: "Music Room 1",
    user: "ภูริ บ.",
    start: "15:30",
    end: "17:00",
    purpose: "Vocal training",
    status: "Confirmed",
  },
  {
    room: "Music Room 2",
    user: "String Ensemble",
    start: "09:00",
    end: "10:50",
    purpose: "Rehearsal",
    status: "Confirmed",
  },
  {
    room: "Music Room 3",
    user: "School Orchestra",
    start: "08:00",
    end: "14:00",
    purpose: "Concert prep",
    status: "Confirmed",
  },
  {
    room: "Studio Room",
    user: "นพดล ส.",
    start: "10:30",
    end: "13:00",
    purpose: "Recording project",
    status: "Confirmed",
  },
  {
    room: "Conference 2",
    user: "Sci Club",
    start: "15:30",
    end: "17:00",
    purpose: "Camp planning",
    status: "Pending",
  },
  {
    room: "Conference 3",
    user: "Curriculum committee",
    start: "14:00",
    end: "17:00",
    purpose: "Term review",
    status: "Review",
  },
];
