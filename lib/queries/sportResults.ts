import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { LiveResult, SportResultRow } from "@/lib/types";
import { houseKeyFromId } from "./util";

export type SportResultRowFull =
  Database["public"]["Tables"]["sport_results"]["Row"];

export async function getAdminSportResults(): Promise<SportResultRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("sport_results")
    .select("id, title_th, title_en, category, placements, time_label, recorded_at")
    .order("recorded_at", { ascending: true });
  if (error) throw new Error(`getAdminSportResults: ${error.message}`);
  return (data ?? []).map<SportResultRow>((r) => ({
    id: r.id,
    titleTh: r.title_th,
    titleEn: r.title_en ?? "",
    category: r.category as SportResultRow["category"],
    placements: (r.placements ?? []).map(houseKeyFromId),
    time: r.time_label ?? "",
  }));
}

export async function getSportResultById(
  id: string,
): Promise<SportResultRowFull | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("sport_results")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getSportResultById: ${error.message}`);
  return data;
}

export async function getStudentLiveResults(
  limit = 2,
): Promise<LiveResult[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("sport_results")
    .select("title_th, category, placements")
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getStudentLiveResults: ${error.message}`);
  const labelByCategory: Record<string, string> = {
    Track: "Track · เพิ่งจบ",
    Team: "Team · จบเกม",
  };
  return (data ?? []).map<LiveResult>((r) => ({
    titleTh: r.title_th,
    metaEn: labelByCategory[r.category] ?? r.category,
    placements: (r.placements ?? []).map(houseKeyFromId),
    icon: r.category === "Track" ? "running" : "ball",
  }));
}
