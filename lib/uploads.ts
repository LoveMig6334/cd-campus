import "server-only";
import { createClient } from "@/lib/supabase/server";

export const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type AssetFolder = "pshare" | "portfolio";

export function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "";
}

export async function uploadAsset(
  formData: FormData,
  folder: AssetFolder,
  id: string,
): Promise<string | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_MIMES.has(file.type)) return null;
  if (file.size > IMAGE_MAX_BYTES) return null;

  const ext = extFromMime(file.type);
  const path = `${folder}/${id}.${ext}`;
  const db = await createClient();
  const { error } = await db.storage
    .from("assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`${folder} upload: ${error.message}`);
  return path;
}
