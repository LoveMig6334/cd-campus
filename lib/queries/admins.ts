import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminListRow = Pick<
  Database["public"]["Tables"]["admins"]["Row"],
  "id" | "email" | "display_name" | "tier" | "is_active" | "created_at"
>;

export async function getAdmins(): Promise<AdminListRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("admins")
    .select("id, email, display_name, tier, is_active, created_at")
    .order("tier", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getAdmins: ${error.message}`);
  return (data ?? []).sort((a, b) => {
    if (a.tier === b.tier) return a.created_at.localeCompare(b.created_at);
    return a.tier === "root" ? -1 : 1;
  });
}
