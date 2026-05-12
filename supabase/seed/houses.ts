import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import { ADMIN_SCOREBOARD } from "./data/admin-sport";
import { HOUSE_ID_BY_KEY, logStep } from "./util";

export async function seedHouses(db: SupabaseClient<Database>): Promise<void> {
  const done = logStep("houses");
  const rows = ADMIN_SCOREBOARD.map((entry, i) => ({
    id: HOUSE_ID_BY_KEY[entry.house],
    name_en: entry.nameEn,
    name_th: entry.nameTh,
    color_token: `house-${entry.house}`,
    current_score: entry.score,
    stat_summary: entry.stat,
    sort_order: i + 1,
  }));
  const { error } = await db.from("houses").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`houses upsert: ${error.message}`);
  done(rows.length);
}
