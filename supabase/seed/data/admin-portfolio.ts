import type { AdminKpi, PortfolioAdminRow } from "@/lib/types";

// Seed rows live before the DB assigns a UUID, so the `id` field on
// PortfolioAdminRow is irrelevant here. Strip it for the seed fixtures.
type PortfolioSeedRow = Omit<PortfolioAdminRow, "id">;

export const PORTFOLIO_KPIS: AdminKpi[] = [
  {
    label: "Total",
    th: "โครงงานทั้งหมด",
    num: "142",
    delta: { kind: "up", text: "▲ 8 this term" },
  },
  {
    label: "Published",
    th: "เผยแพร่แล้ว",
    num: "96",
    delta: { kind: "up", text: "▲ 4" },
  },
  {
    label: "Under review",
    th: "รออนุมัติ",
    num: "12",
    delta: { kind: "flat", text: "— stable" },
  },
  {
    label: "Featured",
    th: "โครงงานเด่น",
    num: "9",
    delta: { kind: "up", text: "▲ 1 added" },
  },
];

const TAG_BLUE = { background: "var(--color-blue)" };
const TAG_YELLOW = {
  background: "var(--color-yellow)",
  textColor: "var(--color-ink)",
};
const TAG_GREEN = { background: "var(--color-house-green)" };
const TAG_PURPLE = { background: "var(--color-house-purple)" };
const TAG_ORANGE = { background: "var(--color-house-orange)" };

export const PORTFOLIO_ROWS: PortfolioSeedRow[] = [
  {
    thumb: { iconKey: "trend" },
    titleEn: "CropPlanner",
    titleTh: "ระบบช่วยตัดสินใจเพาะปลูกพืช",
    author: "ธรรศ์ × นนท์",
    klass: "Y9 / 2025",
    tags: [
      { label: "ML", ...TAG_BLUE },
      { label: "IEEE", ...TAG_YELLOW },
    ],
    submitted: "14 Mar",
    status: "Published",
  },
  {
    thumb: { iconKey: "sun", bg: "var(--color-house-orange)" },
    titleEn: "Solar Lab Monitor",
    titleTh: "เซ็นเซอร์วัดประสิทธิภาพแผงโซลาร์",
    author: "วีรชาติ ส.",
    klass: "Y8 / 2024",
    tags: [
      { label: "IoT", ...TAG_BLUE },
      { label: "Award", ...TAG_GREEN },
    ],
    submitted: "2 Feb",
    status: "Published",
  },
  {
    thumb: { iconKey: "wave", bg: "var(--color-house-pink)" },
    titleEn: "SHM Visualizer",
    titleTh: "เครื่องมือสอน Simple Harmonic Motion",
    author: "ปริญญ์ ก.",
    klass: "Y9 / 2025",
    tags: [{ label: "Physics", ...TAG_PURPLE }],
    submitted: "22 Apr",
    status: "Under Review",
  },
  {
    thumb: { iconKey: "cube", bg: "var(--color-house-green)" },
    titleEn: "3D Campus Map",
    titleTh: "แผนที่อาคารแบบ 3D ใช้ Three.js",
    author: "กฤษฎา ม.",
    klass: "Y8 / 2024",
    tags: [{ label: "Web", ...TAG_BLUE }],
    submitted: "11 May",
    status: "Draft",
  },
  {
    thumb: { iconKey: "calendar", bg: "var(--color-house-purple)" },
    titleEn: "CDS Smart Booking",
    titleTh: "ระบบจองห้องสำหรับโรงเรียน",
    author: "ฐาปนา ก.",
    klass: "Y9 / 2024",
    tags: [
      { label: "Web", ...TAG_BLUE },
      { label: "Award", ...TAG_GREEN },
    ],
    submitted: "5 Dec",
    status: "Published",
  },
  {
    thumb: { iconKey: "beakers" },
    titleEn: "Chemistry Sim",
    titleTh: "โปรแกรมจำลองปฏิกิริยา",
    author: "วรรณ์ ห.",
    klass: "Y8 / 2025",
    tags: [{ label: "Chemistry", ...TAG_ORANGE }],
    submitted: "3 May",
    status: "Under Review",
  },
];
