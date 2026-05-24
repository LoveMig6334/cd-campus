import { createClient } from "@/lib/supabase/server";
import type { HomeHero, PortfolioStats } from "@/lib/types";

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
