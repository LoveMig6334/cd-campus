import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import { PORTFOLIO_PROJECTS } from "./data/portfolios";
import { PORTFOLIO_ROWS } from "./data/admin-portfolio";
import { logStep } from "./util";

type Insert = Database["public"]["Tables"]["projects"]["Insert"];

export async function seedProjects(
  db: SupabaseClient<Database>,
  adminId: string,
): Promise<void> {
  const done = logStep("projects");

  const descByTitle = new Map(
    PORTFOLIO_PROJECTS.map((p) => [p.title, p.desc]),
  );

  const rows: Insert[] = PORTFOLIO_ROWS.map((r) => ({
    title_en: r.titleEn,
    title_th: r.titleTh,
    desc_long: descByTitle.get(r.titleEn) ?? null,
    author_line: r.author,
    klass: r.klass,
    status: r.status,
    is_featured: false,
    icon_key: r.thumb.iconKey,
    thumb_bg: r.thumb.bg ?? null,
    tags: r.tags as unknown as Insert["tags"],
    submitted_at: null,
    created_by_admin_id: adminId,
  }));

  const { error: delErr } = await db
    .from("projects")
    .delete()
    .not("id", "is", null);
  if (delErr) throw new Error(`projects delete: ${delErr.message}`);
  const { error } = await db.from("projects").insert(rows);
  if (error) throw new Error(`projects insert: ${error.message}`);
  done(rows.length);
}
