"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "";
}

async function uploadPshareImage(
  formData: FormData,
  postId: string,
): Promise<string | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_MIMES.has(file.type)) return null;
  if (file.size > IMAGE_MAX_BYTES) return null;

  const ext = extFromMime(file.type);
  const path = `pshare/${postId}.${ext}`;
  const db = await createClient();
  const { error } = await db.storage
    .from("assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`pshare upload: ${error.message}`);
  return path;
}

type DraftFields = {
  slug: string;
  title: string;
  num_label: string | null;
  snippet: string | null;
  body_md: string | null;
  author_alias: string | null;
  art_halftone: string | null;
  art_bg: string | null;
  art_num_color: string | null;
  tags: string[];
};

function parseDraft(
  formData: FormData,
): { ok: true; data: DraftFields } | { ok: false } {
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { ok: false };
  if (!title) return { ok: false };

  const num_label = String(formData.get("num_label") ?? "").trim() || null;
  const snippet = String(formData.get("snippet") ?? "").trim() || null;
  const body_md = String(formData.get("body_md") ?? "") || null;
  const author_alias =
    String(formData.get("author_alias") ?? "").trim() || null;
  const art_halftone =
    String(formData.get("art_halftone") ?? "").trim() || null;
  const art_bg = String(formData.get("art_bg") ?? "").trim() || null;
  const art_num_color =
    String(formData.get("art_num_color") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags =
    tagsRaw === ""
      ? []
      : tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

  return {
    ok: true,
    data: {
      slug,
      title,
      num_label,
      snippet,
      body_md,
      author_alias,
      art_halftone,
      art_bg,
      art_num_color,
      tags,
    },
  };
}

export async function saveDraft(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = parseDraft(formData);
  if (!parsed.ok) return;

  const id = String(formData.get("id") ?? "");
  const db = await createClient();
  let rowId = id;

  if (id) {
    const { error } = await db
      .from("pshare_posts")
      .update({ ...parsed.data, status: "draft" })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await db
      .from("pshare_posts")
      .insert({
        ...parsed.data,
        status: "draft",
        created_by_admin_id: admin.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    rowId = data.id;
  }

  const newPath = await uploadPshareImage(formData, rowId);
  if (newPath) {
    const { error } = await db
      .from("pshare_posts")
      .update({ art_image_path: newPath })
      .eq("id", rowId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/pshare");
  revalidatePath("/student/pshare");
  redirect("/admin/pshare");
}

export async function publishPost(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = parseDraft(formData);
  if (!parsed.ok) return;

  const id = String(formData.get("id") ?? "");
  const db = await createClient();
  const publishedAt = new Date().toISOString();
  let rowId = id;

  if (id) {
    const { error } = await db
      .from("pshare_posts")
      .update({
        ...parsed.data,
        status: "published",
        published_at: publishedAt,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await db
      .from("pshare_posts")
      .insert({
        ...parsed.data,
        status: "published",
        published_at: publishedAt,
        created_by_admin_id: admin.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    rowId = data.id;
  }

  const newPath = await uploadPshareImage(formData, rowId);
  if (newPath) {
    const { error } = await db
      .from("pshare_posts")
      .update({ art_image_path: newPath })
      .eq("id", rowId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/pshare");
  revalidatePath("/student/pshare");
  redirect("/admin/pshare");
}

export async function deletePost(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();

  const { data: row } = await db
    .from("pshare_posts")
    .select("art_image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("pshare_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (row?.art_image_path) {
    await db.storage.from("assets").remove([row.art_image_path]);
    // Ignore storage delete failures — row is gone, orphan acceptable.
  }

  revalidatePath("/admin/pshare");
  revalidatePath("/student/pshare");
  redirect("/admin/pshare");
}
