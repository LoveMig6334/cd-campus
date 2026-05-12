"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";
import { requireAdmin, requireRootAdmin } from "@/lib/auth";

export async function replyToCarelin(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const request_id = String(formData.get("request_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const role_label_raw = String(formData.get("role_label") ?? "").trim();
  const role_label = role_label_raw === "" ? null : role_label_raw;
  if (!request_id) return;
  if (!body) return;

  const db = await createClient();
  const { error } = await db.from("carelin_replies").insert({
    request_id,
    body,
    teacher_name: admin.display_name,
    role_label,
    avatar_letter: admin.display_name.slice(0, 1),
    created_by_admin_id: admin.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/carelin");
  revalidatePath(`/admin/carelin/${request_id}`);
  revalidatePath("/student/carelin");
}

export async function deleteCarelinRequest(formData: FormData): Promise<void> {
  await requireRootAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const svc = getSupabaseServiceRole();
  const { error } = await svc.from("carelin_requests").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/carelin");
  revalidatePath(`/admin/carelin/${id}`);
  revalidatePath("/student/carelin");
  redirect("/admin/carelin");
}

export async function markAnswered(formData: FormData): Promise<void> {
  await requireAdmin();
  const request_id = String(formData.get("request_id") ?? "");
  if (!request_id) return;

  const db = await createClient();
  const { error } = await db
    .from("carelin_requests")
    .update({ status: "answered" })
    .eq("id", request_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/carelin");
  revalidatePath(`/admin/carelin/${request_id}`);
  revalidatePath("/student/carelin");
}
