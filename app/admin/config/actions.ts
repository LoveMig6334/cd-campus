"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type {
  AdminKpi,
  HomeHero,
  House,
  PortfolioStats,
  SportDayConfig,
  TermWeekConfig,
} from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";
import {
  isEditableKey,
  HOUSE_KEYS,
  KPI_KINDS,
  type EditableKey,
} from "@/lib/ui/siteConfig";

function revalidateFor(key: EditableKey): void {
  revalidatePath("/admin/config");
  revalidatePath(`/admin/config/${key}/edit`);

  if (key === "home_hero") {
    revalidatePath("/student");
    return;
  }
  if (key === "trend_chart") {
    revalidatePath("/admin");
    return;
  }
  if (key === "portfolio_kpis" || key === "portfolio_stats") {
    revalidatePath("/admin/portfolio");
    revalidatePath("/student/portfolio");
    return;
  }
  if (key === "carelin_kpis") {
    revalidatePath("/admin/carelin");
    return;
  }
  if (key === "sport_day") {
    revalidatePath("/student/sport");
    revalidatePath("/admin/sport");
    return;
  }
  if (key === "term_week") {
    revalidatePath("/admin");
    return;
  }
}

function str(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function strRaw(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function parseHomeHero(formData: FormData): HomeHero {
  const eyebrow = str(formData, "eyebrow");
  const whereTh = str(formData, "whereTh");
  const titleLinesRaw = strRaw(formData, "titleLines");
  const titleLines = titleLinesRaw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const houseRaw = str(formData, "leading_house");
  const house: House = (HOUSE_KEYS as readonly string[]).includes(houseRaw)
    ? (houseRaw as House)
    : "green";
  const label = str(formData, "leading_label");
  const points = Number.parseInt(str(formData, "leading_points"), 10);
  const degrees = Number.parseInt(str(formData, "weather_degrees"), 10);
  const glyph = str(formData, "weather_glyph");

  if (!eyebrow) throw new Error("eyebrow required");
  if (titleLines.length === 0) throw new Error("titleLines required");
  if (!whereTh) throw new Error("whereTh required");
  if (!label) throw new Error("leading.label required");
  if (!Number.isFinite(points))
    throw new Error("leading.points must be a number");
  if (!Number.isFinite(degrees))
    throw new Error("weather.degrees must be a number");
  if (!glyph) throw new Error("weather.glyph required");

  return {
    eyebrow,
    titleLines,
    whereTh,
    leading: { house, label, points },
    weather: { degrees, glyph },
  };
}

function parseKpiArray(formData: FormData): AdminKpi[] {
  const out: AdminKpi[] = [];
  for (let i = 0; i < 4; i++) {
    const label = str(formData, `kpi_${i}_label`);
    const th = str(formData, `kpi_${i}_th`);
    const num = str(formData, `kpi_${i}_num`);
    const kindRaw = str(formData, `kpi_${i}_kind`);
    const text = str(formData, `kpi_${i}_text`);
    const kind = (KPI_KINDS as readonly string[]).includes(kindRaw)
      ? (kindRaw as (typeof KPI_KINDS)[number])
      : "flat";
    if (!label || !th || !num) throw new Error(`KPI #${i + 1} missing fields`);
    out.push({ label, th, num, delta: { kind, text } });
  }
  return out;
}

function parsePortfolioStats(formData: FormData): PortfolioStats[] {
  const out: PortfolioStats[] = [];
  for (let i = 0; i < 3; i++) {
    const num = Number.parseInt(str(formData, `stat_${i}_num`), 10);
    const label = str(formData, `stat_${i}_label`);
    if (!Number.isFinite(num)) throw new Error(`Stat #${i + 1} num invalid`);
    if (!label) throw new Error(`Stat #${i + 1} label required`);
    out.push({ num, label });
  }
  return out;
}

function parseSportDay(formData: FormData): SportDayConfig {
  const label = str(formData, "label");
  const startDate = str(formData, "startDate");
  const totalDays = Number.parseInt(str(formData, "totalDays"), 10);
  if (!label) throw new Error("label required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    throw new Error("startDate must be YYYY-MM-DD");
  if (!Number.isFinite(totalDays) || totalDays < 1)
    throw new Error("totalDays must be ≥ 1");
  return { label, startDate, totalDays };
}

function parseTermWeek(formData: FormData): TermWeekConfig {
  const term = Number.parseInt(str(formData, "term"), 10);
  const startDate = str(formData, "startDate");
  const totalWeeks = Number.parseInt(str(formData, "totalWeeks"), 10);
  if (!Number.isFinite(term) || term < 1) throw new Error("term must be ≥ 1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    throw new Error("startDate must be YYYY-MM-DD");
  if (!Number.isFinite(totalWeeks) || totalWeeks < 1)
    throw new Error("totalWeeks must be ≥ 1");
  return { term, startDate, totalWeeks };
}

type TrendChartValue = {
  months: string[];
  path: string;
  points: { x: number; y: number }[];
};

function parseTrendChart(formData: FormData): TrendChartValue {
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const m = str(formData, `month_${i}`);
    if (!m) throw new Error(`Month #${i + 1} required`);
    months.push(m);
  }
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 13; i++) {
    const x = Number.parseInt(str(formData, `point_${i}_x`), 10);
    const y = Number.parseInt(str(formData, `point_${i}_y`), 10);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Point #${i + 1} x/y must be numbers`);
    }
    points.push({ x, y });
  }
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  return { months, path, points };
}

export async function updateSiteConfig(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const key = str(formData, "key");
  if (!isEditableKey(key)) throw new Error("Unknown config key");

  let value: Json;
  switch (key) {
    case "home_hero":
      value = parseHomeHero(formData) as unknown as Json;
      break;
    case "portfolio_kpis":
    case "carelin_kpis":
      value = parseKpiArray(formData) as unknown as Json;
      break;
    case "portfolio_stats":
      value = parsePortfolioStats(formData) as unknown as Json;
      break;
    case "trend_chart":
      value = parseTrendChart(formData) as unknown as Json;
      break;
    case "sport_day":
      value = parseSportDay(formData) as unknown as Json;
      break;
    case "term_week":
      value = parseTermWeek(formData) as unknown as Json;
      break;
  }

  const db = await createClient();
  const { error } = await db
    .from("site_config")
    .update({
      value,
      updated_by_admin_id: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);
  if (error) throw new Error(error.message);

  revalidateFor(key);
  redirect("/admin/config");
}
