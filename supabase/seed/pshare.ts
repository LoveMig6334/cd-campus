import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import { PSHARE_POSTS } from "./data/pshare-posts";
import { logStep } from "./util";

type Insert = Database["public"]["Tables"]["pshare_posts"]["Insert"];

export async function seedPshare(
  db: SupabaseClient<Database>,
  adminId: string,
): Promise<void> {
  const done = logStep("pshare_posts");
  const rows: Insert[] = PSHARE_POSTS.map((p) => ({
    slug: p.slug,
    num_label: p.num,
    title: p.title,
    snippet: p.snippet,
    body_md: null,
    author_alias: p.author,
    art_halftone: p.art.halftone,
    art_bg: p.art.bg ?? null,
    art_num_color: p.art.numColor ?? null,
    status: "published",
    tags: p.tags,
    published_at: "2026-05-12T00:00:00+07:00",
    created_by_admin_id: adminId,
  }));
  const { error } = await db
    .from("pshare_posts")
    .upsert(rows, { onConflict: "slug" });
  if (error) throw new Error(`pshare_posts upsert: ${error.message}`);
  done(rows.length);
}
