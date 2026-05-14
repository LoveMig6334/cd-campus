import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];

export const requireAdmin = cache(async (): Promise<AdminRow> => {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await db
    .from("admins")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();
  if (error || !data) throw new Error("Not an active admin");
  return data;
});

export const requireRootAdmin = cache(async (): Promise<AdminRow> => {
  const admin = await requireAdmin();
  if (admin.tier !== "root") throw new Error("Root admin required");
  return admin;
});
