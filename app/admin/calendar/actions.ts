"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const CATEGORIES = [
  "sport",
  "tradition",
  "music",
  "admin",
  "academic",
] as const;
type Category = (typeof CATEGORIES)[number];

function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

export async function addEvent(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const title_th = String(formData.get("title_th") ?? "").trim();
  const title_en_raw = String(formData.get("title_en") ?? "").trim();
  const tag_raw = String(formData.get("tag") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const starts_at_local = String(formData.get("starts_at") ?? "").trim();
  const location_raw = String(formData.get("location") ?? "").trim();
  const highlight = formData.get("highlight") === "on";

  if (!title_th) return;
  if (!isCategory(category)) return;
  if (!starts_at_local) return;

  // <input type="datetime-local"> produces e.g. "2026-05-12T15:30".
  // Anchor to Asia/Bangkok (+07:00) per project convention.
  const starts_at = `${starts_at_local}:00+07:00`;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/.test(starts_at)) {
    return;
  }

  const db = await createClient();
  const { error } = await db.from("events").insert({
    title_th,
    title_en: title_en_raw || null,
    tag: tag_raw || null,
    category,
    starts_at,
    location: location_raw || null,
    highlight,
    created_by_admin_id: admin.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/admin");
  revalidatePath("/student");
  redirect("/admin/calendar");
}

export async function updateEvent(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const title_th = String(formData.get("title_th") ?? "").trim();
  const title_en_raw = String(formData.get("title_en") ?? "").trim();
  const tag_raw = String(formData.get("tag") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const starts_at_local = String(formData.get("starts_at") ?? "").trim();
  const location_raw = String(formData.get("location") ?? "").trim();
  const highlight = formData.get("highlight") === "on";

  if (!title_th) return;
  if (!isCategory(category)) return;
  if (!starts_at_local) return;

  const starts_at = `${starts_at_local}:00+07:00`;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/.test(starts_at)) return;

  const db = await createClient();
  const { error } = await db
    .from("events")
    .update({
      title_th,
      title_en: title_en_raw || null,
      tag: tag_raw || null,
      category,
      starts_at,
      location: location_raw || null,
      highlight,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/admin");
  revalidatePath("/student");
  redirect("/admin/calendar");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  const { error } = await db.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/admin");
  revalidatePath("/student");
  redirect("/admin/calendar");
}
