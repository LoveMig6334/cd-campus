import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import { HOME_HERO } from "./data/home-hero";
import {
  ADMIN_KPIS,
  ADMIN_TREND_MONTHS,
  ADMIN_TREND_PATH,
  ADMIN_TREND_POINTS,
} from "./data/admin-overview";
import { PORTFOLIO_STATS } from "./data/portfolios";
import { PORTFOLIO_KPIS } from "./data/admin-portfolio";
import { CARELIN_DESK_KPIS } from "./data/admin-carelin";
import { logStep } from "./util";

type Insert = Database["public"]["Tables"]["site_config"]["Insert"];
type JsonValue = Insert["value"];

// The mock arrays have richer TS types than Supabase's recursive Json, so cast
// through `unknown` to the column type. Service-role insert serializes them as JSON.
const json = <T>(v: T) => v as unknown as JsonValue;

export async function seedSiteConfig(
  db: SupabaseClient<Database>,
  adminId: string,
): Promise<void> {
  const done = logStep("site_config");
  const rows: Insert[] = [
    { key: "home_hero", value: json(HOME_HERO), updated_by_admin_id: adminId },
    {
      key: "overview_kpis",
      value: json(ADMIN_KPIS),
      updated_by_admin_id: adminId,
    },
    {
      key: "trend_chart",
      value: json({
        months: ADMIN_TREND_MONTHS,
        path: ADMIN_TREND_PATH,
        points: ADMIN_TREND_POINTS,
      }),
      updated_by_admin_id: adminId,
    },
    {
      key: "portfolio_stats",
      value: json(PORTFOLIO_STATS),
      updated_by_admin_id: adminId,
    },
    {
      key: "portfolio_kpis",
      value: json(PORTFOLIO_KPIS),
      updated_by_admin_id: adminId,
    },
    {
      key: "carelin_kpis",
      value: json(CARELIN_DESK_KPIS),
      updated_by_admin_id: adminId,
    },
  ];
  const { error } = await db
    .from("site_config")
    .upsert(rows, { onConflict: "key" });
  if (error) throw new Error(`site_config upsert: ${error.message}`);
  done(rows.length);
}
