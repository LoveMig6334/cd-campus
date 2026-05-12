import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import { ADMIN_SPORT_RESULTS } from "./data/admin-sport";
import { HOUSE_ID_BY_KEY, logStep } from "./util";

type Insert = Database["public"]["Tables"]["sport_results"]["Insert"];

export async function seedSportResults(
  db: SupabaseClient<Database>,
  adminId: string,
): Promise<void> {
  const done = logStep("sport_results");
  const rows: Insert[] = ADMIN_SPORT_RESULTS.map((r) => ({
    title_th: r.titleTh,
    title_en: r.titleEn,
    category: r.category,
    placements: r.placements.map((h) => HOUSE_ID_BY_KEY[h]),
    time_label: r.time,
    created_by_admin_id: adminId,
  }));
  const { error: delErr } = await db
    .from("sport_results")
    .delete()
    .not("id", "is", null);
  if (delErr) throw new Error(`sport_results delete: ${delErr.message}`);
  const { error } = await db.from("sport_results").insert(rows);
  if (error) throw new Error(`sport_results insert: ${error.message}`);
  done(rows.length);
}
