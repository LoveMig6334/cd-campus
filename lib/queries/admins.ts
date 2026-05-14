import "server-only";
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";
import type { Database } from "@/lib/supabase/database.types";

export type AdminListRow = Pick<
  Database["public"]["Tables"]["admins"]["Row"],
  "id" | "email" | "display_name" | "tier" | "is_active" | "created_at"
>;

// Service-role: the admins RLS policy only exposes the caller's own row
// (admins_select_self), so listing every admin requires bypassing RLS.
// Safe because the sole caller (/admin/admins) gates on requireRootAdmin().
export async function getAdmins(): Promise<AdminListRow[]> {
  const db = getSupabaseServiceRole();
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
