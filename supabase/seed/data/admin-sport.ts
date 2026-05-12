import type { ScoreboardEntry, SportResultRow } from "@/lib/types";
import type { CalendarEvent } from "@/lib/types";

export const ADMIN_SCOREBOARD: ScoreboardEntry[] = [
  {
    house: "green",
    nameEn: "Green",
    nameTh: "เขียว",
    rankSubtitle: "House #1",
    score: 248,
    stat: "7 wins · 3 second · 1 third",
  },
  {
    house: "purple",
    nameEn: "Purple",
    nameTh: "ม่วง",
    rankSubtitle: "House #2",
    score: 219,
    stat: "5 wins · 4 second · 2 third",
  },
  {
    house: "orange",
    nameEn: "Orange",
    nameTh: "ส้ม",
    rankSubtitle: "House #3",
    score: 198,
    stat: "4 wins · 3 second · 4 third",
  },
  {
    house: "pink",
    nameEn: "Pink",
    nameTh: "ชมพู",
    rankSubtitle: "House #4",
    score: 176,
    stat: "3 wins · 5 second · 4 third",
  },
];

export const ADMIN_SPORT_RESULTS: SportResultRow[] = [
  {
    titleTh: "วิ่งผลัด 4×100 หญิง",
    titleEn: "4×100m Relay (W)",
    category: "Track",
    placements: ["green", "orange", "purple", "pink"],
    time: "10:42",
  },
  {
    titleTh: "บาสเก็ตบอล รอบรอง",
    titleEn: "Basketball semi-final, HS",
    category: "Team",
    placements: ["purple", "green", "pink", "orange"],
    time: "11:30",
  },
  {
    titleTh: "วิ่ง 100 ม. ชาย",
    titleEn: "100m Sprint (M)",
    category: "Track",
    placements: ["green", "purple", "orange", "pink"],
    time: "13:05",
  },
  {
    titleTh: "ฟุตซอล ม.ต้น",
    titleEn: "Futsal, MS",
    category: "Team",
    placements: ["purple", "orange", "green", "pink"],
    time: "13:40",
  },
  {
    titleTh: "ว่ายน้ำ 50 ม. ฟรีสไตล์",
    titleEn: "50m Freestyle",
    category: "Track",
    placements: ["green", "pink", "purple", "orange"],
    time: "09:15",
  },
];

export const ADMIN_SPORT_UPCOMING: CalendarEvent[] = [
  {
    time: "14:00",
    titleTh: "วอลเลย์บอล รอบรอง",
    tag: "Team · โรงยิม 1",
    category: "sport",
  },
  {
    time: "15:30",
    titleTh: "วิ่ง 800 ม. หญิง",
    tag: "Track · ลู่กลาง",
    category: "sport",
  },
  {
    time: "16:30",
    titleTh: "เชียร์ลีดเดอร์",
    tag: "Show · สนามกลาง",
    category: "sport",
  },
];

