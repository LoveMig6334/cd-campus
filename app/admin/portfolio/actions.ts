"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/ui/portfolio";
import { uploadAuthorImage, uploadPdfAsset } from "@/lib/uploads";

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
  author_line: string | null;
  klass: string | null;
  applied_to: string | null;
  desc_long: string | null;
};

function parseProject(
  formData: FormData,
): { ok: true; data: ProjectFields } | { ok: false } {
  const title_en = String(formData.get("title_en") ?? "").trim();
  if (!title_en) return { ok: false };

  const author_line = String(formData.get("author_line") ?? "").trim() || null;
  const klass = String(formData.get("klass") ?? "").trim() || null;
  const applied_to = String(formData.get("applied_to") ?? "").trim() || null;
  const desc_long = String(formData.get("desc_long") ?? "").trim() || null;

  return {
    ok: true,
    data: { title_en, author_line, klass, applied_to, desc_long },
  };
}

export async function createProject(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = parseProject(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { data, error } = await db
    .from("projects")
    .insert({
      ...parsed.data,
      status: "Draft" as ProjectStatus,
      icon_key: "profile",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const [pdfPath, authorImagePath] = await Promise.all([
    uploadPdfAsset(formData, "portfolio", data.id),
    uploadAuthorImage(formData, "portfolio", data.id),
  ]);
  const fileUpdate: { pdf_path?: string; author_image_path?: string } = {};
  if (pdfPath) fileUpdate.pdf_path = pdfPath;
  if (authorImagePath) fileUpdate.author_image_path = authorImagePath;
  if (Object.keys(fileUpdate).length > 0) {
    const { error: updErr } = await db
      .from("projects")
      .update(fileUpdate)
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
  const { data: existing } = await db
    .from("projects")
    .select("pdf_path, author_image_path")
    .eq("id", id)
    .maybeSingle();
  const previousPdf = existing?.pdf_path ?? null;
  const previousAuthorImage = existing?.author_image_path ?? null;

  const { error } = await db.from("projects").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);

  const [pdfPath, authorImagePath] = await Promise.all([
    uploadPdfAsset(formData, "portfolio", id, previousPdf),
    uploadAuthorImage(formData, "portfolio", id, previousAuthorImage),
  ]);
  const fileUpdate: { pdf_path?: string; author_image_path?: string } = {};
  if (pdfPath) fileUpdate.pdf_path = pdfPath;
  if (authorImagePath) fileUpdate.author_image_path = authorImagePath;
  if (Object.keys(fileUpdate).length > 0) {
    const { error: updErr } = await db
      .from("projects")
      .update(fileUpdate)
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
    .select("image_path, pdf_path, author_image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const toRemove = [
    row?.image_path,
    row?.pdf_path,
    row?.author_image_path,
  ].filter((p): p is string => !!p);
  if (toRemove.length > 0) {
    const { error: storageErr } = await db.storage
      .from("assets")
      .remove(toRemove);
    if (storageErr) {
      console.error("storage delete failed", {
        surface: "portfolio",
        paths: toRemove,
        error: storageErr.message,
      });
    }
  }

  revalidatePath("/admin/portfolio");
  revalidatePath("/student/portfolio");
  redirect("/admin/portfolio");
}
