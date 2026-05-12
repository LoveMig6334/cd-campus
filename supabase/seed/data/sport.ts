import type { CalendarEvent, LeaderRow, LiveResult } from "@/lib/types";

export const SPORT_HERO = {
  label: "★ Chitralada Sport Day 2026",
  title: "Day 2 of 3",
  meta: "12 May · Live · 6 events remaining",
} as const;

export const SPORT_LEADERBOARD: LeaderRow[] = [
  {
    rank: 1,
    house: "green",
    nameEn: "Green",
    nameTh: "เขียว",
    score: 248,
    barPct: 100,
  },
  {
    rank: 2,
    house: "purple",
    nameEn: "Purple",
    nameTh: "ม่วง",
    score: 219,
    barPct: 88,
  },
  {
    rank: 3,
    house: "orange",
    nameEn: "Orange",
    nameTh: "ส้ม",
    score: 198,
    barPct: 80,
  },
  {
    rank: 4,
    house: "pink",
    nameEn: "Pink",
    nameTh: "ชมพู",
    score: 176,
    barPct: 71,
  },
];

export const SPORT_LIVE_RESULTS: LiveResult[] = [
  {
    titleTh: "วิ่งผลัด 4×100 · หญิง",
    metaEn: "Track · เพิ่งจบ",
    placements: ["green", "orange", "purple", "pink"],
    icon: "running",
  },
  {
    titleTh: "บาสเก็ตบอล · ม.ปลาย",
    metaEn: "Team · จบเกม",
    placements: ["purple", "green", "pink", "orange"],
    icon: "ball",
  },
];

export const SPORT_UPCOMING: CalendarEvent[] = [
  {
    time: "14:00",
    titleTh: "วอลเลย์บอล รอบรอง · ม.ปลาย ชาย",
    tag: "Team · โรงยิม 1",
    category: "sport",
  },
  {
    time: "15:30",
    titleTh: "วิ่ง 800 ม. · หญิง",
    tag: "Track · ลู่กลาง",
    category: "sport",
  },
];
