import { createClient } from "@/lib/supabase/server";
import type { LeaderRow, ScoreboardEntry } from "@/lib/types";
import { houseKeyFromId } from "./util";

export async function getScoreboard(): Promise<ScoreboardEntry[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("houses")
    .select("id, name_en, name_th, current_score, stat_summary, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`getScoreboard: ${error.message}`);
  return (data ?? []).map((h, i) => ({
    house: houseKeyFromId(h.id),
    nameEn: h.name_en,
    nameTh: h.name_th,
    rankSubtitle: `House #${i + 1}`,
    score: h.current_score,
    stat: h.stat_summary ?? "",
  }));
}

export async function getLeaderboard(): Promise<LeaderRow[]> {
  const scoreboard = await getScoreboard();
  if (scoreboard.length === 0) return [];
  const top = scoreboard[0].score || 1;
  return scoreboard.map((s, i) => ({
    rank: i + 1,
    house: s.house,
    nameEn: s.nameEn,
    nameTh: s.nameTh,
    score: s.score,
    barPct: Math.round((s.score / top) * 100),
  }));
}
