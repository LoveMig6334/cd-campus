import "server-only";
import { createClient } from "@/lib/supabase/server";

export const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PDF_MIME = "application/pdf";
export const PDF_MAX_BYTES = 10 * 1024 * 1024;

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
  previousPath?: string | null,
): Promise<string | null> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_MIMES.has(file.type)) return null;
    if (file.size > IMAGE_MAX_BYTES) return null;

    const ext = extFromMime(file.type);
    const path = versionedPath(folder, id, ext);
    const db = await createClient();
    const { error } = await db.storage
      .from("assets")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(`${folder} upload: ${error.message}`);
    await removeIfStale(previousPath, path);
    return path;
  }

  const url = String(formData.get("image_url") ?? "").trim();
  if (url) {
    const downloadLocation = String(
      formData.get("image_download_location") ?? "",
    ).trim();
    return uploadFromUnsplashUrl(
      url,
      downloadLocation,
      folder,
      id,
      previousPath,
    );
  }

  return null;
}

// Versioned filename so a replacement is served from a brand-new URL — the
// browser, the Vercel image optimizer, and the Supabase CDN all key off the
// path, so reusing `${folder}/${id}.${ext}` (with upsert) would silently
// return the cached old bytes after a re-upload.
function versionedPath(folder: AssetFolder, id: string, ext: string): string {
  return `${folder}/${id}-${Date.now()}.${ext}`;
}

export async function uploadPdfAsset(
  formData: FormData,
  folder: AssetFolder,
  id: string,
  previousPath?: string | null,
): Promise<string | null> {
  const file = formData.get("portfolio_pdf");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.type !== PDF_MIME) return null;
  if (file.size > PDF_MAX_BYTES) return null;

  const path = versionedPath(folder, id, "pdf");
  const db = await createClient();
  const { error } = await db.storage
    .from("assets")
    .upload(path, file, { upsert: true, contentType: PDF_MIME });
  if (error) throw new Error(`${folder} pdf upload: ${error.message}`);
  await removeIfStale(previousPath, path);
  return path;
}

export async function uploadAuthorImage(
  formData: FormData,
  folder: AssetFolder,
  id: string,
  previousPath?: string | null,
): Promise<string | null> {
  const file = formData.get("author_image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_MIMES.has(file.type)) return null;
  if (file.size > IMAGE_MAX_BYTES) return null;

  const ext = extFromMime(file.type);
  const path = versionedPath(folder, `${id}-author`, ext);
  const db = await createClient();
  const { error } = await db.storage
    .from("assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`${folder} author image upload: ${error.message}`);
  await removeIfStale(previousPath, path);
  return path;
}

async function removeIfStale(
  previousPath: string | null | undefined,
  newPath: string,
): Promise<void> {
  if (!previousPath || previousPath === newPath) return;
  const db = await createClient();
  const { error } = await db.storage.from("assets").remove([previousPath]);
  if (error) {
    console.error("storage cleanup failed", {
      path: previousPath,
      error: error.message,
    });
  }
}

async function uploadFromUnsplashUrl(
  url: string,
  downloadLocation: string,
  folder: AssetFolder,
  id: string,
  previousPath: string | null | undefined,
): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.hostname !== "images.unsplash.com") return null;

  const res = await fetch(url);
  if (!res.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim();
  if (!IMAGE_MIMES.has(contentType)) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > IMAGE_MAX_BYTES) return null;

  const ext = extFromMime(contentType);
  const path = versionedPath(folder, id, ext);
  const db = await createClient();
  const { error } = await db.storage
    .from("assets")
    .upload(path, buf, { upsert: true, contentType });
  if (error) throw new Error(`${folder} upload (unsplash): ${error.message}`);

  await removeIfStale(previousPath, path);

  if (downloadLocation) {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (key) {
      // Per Unsplash API guidelines: ping download_location when an image is
      // actually used. Fire-and-forget; never block the save on this.
      void fetch(downloadLocation, {
        headers: { Authorization: `Client-ID ${key}` },
      }).catch(() => undefined);
    }
  }

  return path;
}
