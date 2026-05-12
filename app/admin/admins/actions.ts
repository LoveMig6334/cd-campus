"use server";

import { revalidatePath } from "next/cache";
import { requireRootAdmin } from "@/lib/auth";
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";

export async function createAdmin(formData: FormData): Promise<void> {
  await requireRootAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const display_name = String(formData.get("display_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const tier = String(formData.get("tier") ?? "normal");

  if (!email || !display_name || !password) return;
  if (password.length < 12) return;
  if (tier !== "root" && tier !== "normal") return;

  const svc = getSupabaseServiceRole();

  const created = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw new Error(created.error?.message ?? "Failed to create auth user.");

  const { error: insertError } = await svc.from("admins").insert({
    auth_user_id: created.data.user.id,
    email,
    display_name,
    tier,
  });
  if (insertError) {
    await svc.auth.admin.deleteUser(created.data.user.id);
    throw new Error(insertError.message);
  }

  revalidatePath("/admin/admins");
}

export async function disableAdmin(formData: FormData): Promise<void> {
  const self = await requireRootAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  if (id === self.id) return;

  const svc = getSupabaseServiceRole();
  const { error } = await svc
    .from("admins")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/admins");
}
