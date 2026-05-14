"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  normalizeTags,
  PROJECT_STATUSES,
  type ProjectStatus,
} from "@/lib/ui/portfolio";
import { uploadAsset } from "@/lib/uploads";

function isProjectStatus(v: string): v is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(v);
}

export async function setProjectStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return;
  if (!isProjectStatus(status)) return;

  const db = await createClient();
  const { error } = await db.from("projects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
}

type ProjectFields = {
  title_en: string;
  title_th: string | null;
  author_line: string | null;
  klass: string | null;
  desc_long: string | null;
  icon_key: string | null;
  thumb_bg: string | null;
  status: ProjectStatus;
  submitted_at: string | null;
  tags: ReturnType<typeof normalizeTags>;
};

function parseProject(
  formData: FormData,
): { ok: true; data: ProjectFields } | { ok: false } {
  const title_en = String(formData.get("title_en") ?? "").trim();
  if (!title_en) return { ok: false };

  const status = String(formData.get("status") ?? "");
  if (!isProjectStatus(status)) return { ok: false };

  const title_th = String(formData.get("title_th") ?? "").trim() || null;
  const author_line = String(formData.get("author_line") ?? "").trim() || null;
  const klass = String(formData.get("klass") ?? "").trim() || null;
  const desc_long = String(formData.get("desc_long") ?? "").trim() || null;
  const icon_key = String(formData.get("icon_key") ?? "").trim() || null;
  const thumb_bg = String(formData.get("thumb_bg") ?? "").trim() || null;
  const submitted_at_raw = String(formData.get("submitted_at") ?? "").trim();
  const submitted_at = submitted_at_raw || null;

  const tagsRaw = String(formData.get("tags") ?? "");
  let tagsParsed: unknown = [];
  if (tagsRaw) {
    try {
      tagsParsed = JSON.parse(tagsRaw);
    } catch {
      tagsParsed = [];
    }
  }
  const tags = normalizeTags(tagsParsed);

  return {
    ok: true,
    data: {
      title_en,
      title_th,
      author_line,
      klass,
      desc_long,
      icon_key,
      thumb_bg,
      status,
      submitted_at,
      tags,
    },
  };
}

export async function createProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = parseProject(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const path = await uploadAsset(formData, "portfolio", data.id);
  if (path) {
    const { error: updErr } = await db
      .from("projects")
      .update({ image_path: path })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
  }

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
  redirect("/admin/portfolio");
}

export async function updateProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const parsed = parseProject(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { error } = await db.from("projects").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);

  const path = await uploadAsset(formData, "portfolio", id);
  if (path) {
    const { error: updErr } = await db
      .from("projects")
      .update({ image_path: path })
      .eq("id", id);
    if (updErr) throw new Error(updErr.message);
  }

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
  redirect("/admin/portfolio");
}

export async function deleteProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();

  const { data: row } = await db
    .from("projects")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (row?.image_path) {
    const { error: storageErr } = await db.storage
      .from("assets")
      .remove([row.image_path]);
    if (storageErr) {
      console.error("storage delete failed", {
        surface: "portfolio",
        path: row.image_path,
        error: storageErr.message,
      });
    }
  }

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
  redirect("/admin/portfolio");
}
