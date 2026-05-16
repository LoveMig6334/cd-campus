"use server";

import "server-only";
import { requireAdmin } from "@/lib/auth";

export type UnsplashPhoto = {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  downloadLocation: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
};

type UnsplashSearchResponse = {
  results: Array<{
    id: string;
    urls: { thumb: string; regular: string };
    links: { download_location: string };
    alt_description: string | null;
    user: { name: string; links: { html: string } };
  }>;
};

export async function searchUnsplash(
  query: string,
): Promise<
  { ok: true; photos: UnsplashPhoto[] } | { ok: false; error: string }
> {
  await requireAdmin();

  const q = query.trim().slice(0, 80);
  if (!q) return { ok: true, photos: [] };

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return {
      ok: false,
      error: "UNSPLASH_ACCESS_KEY is not set on the server.",
    };
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", "12");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return { ok: false, error: `Unsplash search failed (${res.status}).` };
  }

  const data = (await res.json()) as UnsplashSearchResponse;
  const photos: UnsplashPhoto[] = data.results.map((p) => ({
    id: p.id,
    thumbUrl: p.urls.thumb,
    fullUrl: p.urls.regular,
    downloadLocation: p.links.download_location,
    alt: p.alt_description ?? "",
    photographer: p.user.name,
    photographerUrl: p.user.links.html,
  }));
  return { ok: true, photos };
}
