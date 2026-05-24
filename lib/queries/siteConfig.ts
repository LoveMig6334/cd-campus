import { createClient } from "@/lib/supabase/server";
import type { AdminKpi, HomeHero, PortfolioStats } from "@/lib/types";
import { today, daysBetween, EN_MONTHS_ABBR } from "@/lib/time";
import type { SportDayConfig, TermWeekConfig } from "@/lib/types";

export async function getConfigByKey<T>(key: string): Promise<T> {
  return getValue<T>(key);
}

async function getValue<T>(key: string): Promise<T> {
  const db = await createClient();
  const { data, error } = await db
    .from("site_config")
    .select("value")
    .eq("key", key)
    .single();
  if (error) throw new Error(`siteConfig ${key}: ${error.message}`);
  return data.value as unknown as T;
}

export async function getHomeHero(): Promise<HomeHero> {
  return getValue<HomeHero>("home_hero");
}

export async function getPortfolioStats(): Promise<PortfolioStats[]> {
  return getValue<PortfolioStats[]>("portfolio_stats");
}

export async function getPortfolioKpis(): Promise<AdminKpi[]> {
  return getValue<AdminKpi[]>("portfolio_kpis");
}

export async function getCarelinKpis(): Promise<AdminKpi[]> {
  return getValue<AdminKpi[]>("carelin_kpis");
}

export type SportDay = {
  label: string;
  dayOfN: number;
  totalDays: number;
  /** "D Mon" in English, e.g. "24 May". */
  dateLabel: string;
  eventsRemaining: number;
  isLive: boolean;
};

export async function getSportDay(): Promise<SportDay> {
  const cfg = await getValue<SportDayConfig>("sport_day");
  const todayISO = today();
  const elapsed = daysBetween(cfg.startDate, todayISO); // 0 on day 1
  const dayOfN = Math.min(Math.max(elapsed + 1, 1), cfg.totalDays);
  const isLive = elapsed >= 0 && elapsed < cfg.totalDays;

  const [, m, d] = todayISO.split("-").map(Number);
  const dateLabel = `${d} ${EN_MONTHS_ABBR[m - 1]}`;

  // "Remaining" = upcoming sport matches (same Team/Track/Show tag filter as
  // getStudentUpcomingSport) that have not started yet.
  const db = await createClient();
  const { count, error } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("category", "sport")
    .or("tag.ilike.Team · %,tag.ilike.Track · %,tag.ilike.Show · %")
    .gte("starts_at", new Date().toISOString());
  if (error) throw new Error(`getSportDay events: ${error.message}`);

  return {
    label: cfg.label,
    dayOfN,
    totalDays: cfg.totalDays,
    dateLabel,
    eventsRemaining: count ?? 0,
    isLive,
  };
}

export type TermWeek = { term: number; week: number; totalWeeks: number };

export async function getTermWeek(): Promise<TermWeek> {
  const cfg = await getValue<TermWeekConfig>("term_week");
  const elapsed = daysBetween(cfg.startDate, today());
  const week = Math.min(
    Math.max(Math.floor(elapsed / 7) + 1, 1),
    cfg.totalWeeks,
  );
  return { term: cfg.term, week, totalWeeks: cfg.totalWeeks };
}
