"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const PROJECT_STATUSES = ["Published", "Under Review", "Draft"] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number];

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
  const { error } = await db
    .from("projects")
    .update({ status })
    .eq("id", id);
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
};

function parseProject(formData: FormData):
  | { ok: true; data: ProjectFields }
  | { ok: false } {
  const title_en = String(formData.get("title_en") ?? "").trim();
  if (!title_en) return { ok: false };

  const status = String(formData.get("status") ?? "");
  if (!isProjectStatus(status)) return { ok: false };

  const title_th = String(formData.get("title_th") ?? "").trim() || null;
  const author_line =
    String(formData.get("author_line") ?? "").trim() || null;
  const klass = String(formData.get("klass") ?? "").trim() || null;
  const desc_long = String(formData.get("desc_long") ?? "").trim() || null;
  const icon_key = String(formData.get("icon_key") ?? "").trim() || null;
  const thumb_bg = String(formData.get("thumb_bg") ?? "").trim() || null;
  const submitted_at_raw = String(formData.get("submitted_at") ?? "").trim();
  const submitted_at = submitted_at_raw || null;

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
    },
  };
}

export async function updateProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const parsed = parseProject(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { error } = await db
    .from("projects")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
  redirect("/admin/portfolio");
}

export async function deleteProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
  redirect("/admin/portfolio");
}
