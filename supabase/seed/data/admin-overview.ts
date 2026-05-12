import {
  CATEGORY_COLOR,
  type AdminBookingRow,
  type AdminEvent,
  type AdminKpi,
} from "./types";

export const ADMIN_GREETING = {
  th: "สวัสดี อ.อาทรง",
  en: "good morning",
} as const;

export const ADMIN_KPIS: AdminKpi[] = [
  {
    label: "Students",
    th: "นักเรียนทั้งหมด",
    num: "2,184",
    delta: { kind: "up", text: "▲ 38 this term" },
  },
  {
    label: "Events",
    th: "กิจกรรมเดือนนี้",
    num: "47",
    delta: { kind: "up", text: "▲ 12 vs Apr" },
  },
  {
    label: "Bookings · today",
    th: "การจองวันนี้",
    num: "28",
    delta: { kind: "flat", text: "— same as yesterday" },
  },
  {
    label: "Lost & Found",
    th: "ของหาย",
    num: "14",
    delta: { kind: "down", text: "▼ 3 returned" },
  },
];

const C = CATEGORY_COLOR;

export const ADMIN_TODAY_EVENTS: AdminEvent[] = [
  {
    time: "09:00",
    title: "Staff briefing",
    tag: "Admin · Conference 3",
    barColor: C.admin,
  },
  {
    time: "10:30",
    title: "Sport Day · Day 2 opening",
    tag: "Sport · Stadium",
    barColor: C.sport,
  },
  {
    time: "14:00",
    title: "Curriculum review",
    tag: "Academic · Library",
    barColor: C.academic,
  },
  {
    time: "17:00",
    title: "Orchestra rehearsal",
    tag: "Music · Music Room 3",
    barColor: C.music,
  },
];

/** 12 abscissa labels for the trend chart, last entry highlighted */
export const ADMIN_TREND_MONTHS = [
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
] as const;

/** Path coordinates for the trend chart (viewBox 0 0 600 120) */
export const ADMIN_TREND_PATH =
  "M0,90 L50,80 L100,72 L150,75 L200,55 L250,60 L300,40 L350,48 L400,30 L450,42 L500,25 L550,32 L600,20";

export const ADMIN_TREND_POINTS: { x: number; y: number }[] = [
  { x: 0, y: 90 },
  { x: 50, y: 80 },
  { x: 100, y: 72 },
  { x: 150, y: 75 },
  { x: 200, y: 55 },
  { x: 250, y: 60 },
  { x: 300, y: 40 },
  { x: 350, y: 48 },
  { x: 400, y: 30 },
  { x: 450, y: 42 },
  { x: 500, y: 25 },
  { x: 550, y: 32 },
  { x: 600, y: 20 },
];

export const ADMIN_RECENT_BOOKINGS: AdminBookingRow[] = [
  {
    roomEn: "Music Room 1",
    roomTh: "เปียโน · กลอง",
    user: "ธรรศ์ ภัทรกุล",
    klass: "9 / 4",
    start: "13 May · 11:30",
    end: "14:30",
    status: "Confirmed",
  },
  {
    roomEn: "Conference 2",
    roomTh: "ห้องประชุมเล็ก",
    user: "Sci Club",
    klass: "Club",
    start: "13 May · 15:30",
    end: "17:00",
    status: "Pending",
  },
  {
    roomEn: "Studio Room",
    roomTh: "ห้องอัด",
    user: "นพดล ส.",
    klass: "10 / 2",
    start: "14 May · 13:00",
    end: "15:30",
    status: "Confirmed",
  },
  {
    roomEn: "Music Room 2",
    roomTh: "กีตาร์",
    user: "ภูริ บ.",
    klass: "11 / 1",
    start: "14 May · 15:00",
    end: "17:00",
    status: "Review",
  },
  {
    roomEn: "Conference 3",
    roomTh: "ห้องประชุมใหญ่",
    user: "Drama Club",
    klass: "Club",
    start: "15 May · 11:30",
    end: "14:30",
    status: "Confirmed",
  },
];
