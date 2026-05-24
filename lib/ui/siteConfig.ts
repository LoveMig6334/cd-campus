import type { House } from "@/lib/types";

export const EDITABLE_KEYS = [
  "home_hero",
  "trend_chart",
  "portfolio_stats",
  "portfolio_kpis",
  "carelin_kpis",
  "sport_day",
  "term_week",
] as const;

export type EditableKey = (typeof EDITABLE_KEYS)[number];

export function isEditableKey(k: string): k is EditableKey {
  return (EDITABLE_KEYS as readonly string[]).includes(k);
}

export const KEY_LABELS: Record<EditableKey, { en: string; th: string }> = {
  home_hero: { en: "Home hero", th: "หน้าจอแรกของนักเรียน" },
  trend_chart: { en: "Trend chart", th: "กราฟแนวโน้ม" },
  portfolio_stats: { en: "Portfolio stats", th: "ตัวเลขโครงงาน · นักเรียน" },
  portfolio_kpis: { en: "Portfolio KPIs", th: "ตัวเลขโครงงาน · ครู" },
  carelin_kpis: { en: "Carelin KPIs", th: "ตัวเลขพี่แคร์ลิน · ครู" },
  sport_day: { en: "Sport day", th: "วันกีฬาสี" },
  term_week: { en: "Term & week", th: "ภาคเรียน · สัปดาห์" },
};

export const HOUSE_KEYS: readonly House[] = [
  "green",
  "purple",
  "orange",
  "pink",
];

export function isHouse(v: string): v is House {
  return (HOUSE_KEYS as readonly string[]).includes(v);
}

export const KPI_KINDS = ["up", "down", "flat"] as const;
export type KpiKind = (typeof KPI_KINDS)[number];
