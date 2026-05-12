import { createClient } from "@/lib/supabase/server";
import type { PsharePost } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

const THAI_MONTHS = [
  "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค.",
];

function thaiDate(ts: string | null): string {
  if (!ts) return "";
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${parseInt(m[3], 10)} ${THAI_MONTHS[parseInt(m[2], 10) - 1]}`;
}

export async function getStudentPshareFeed(): Promise<PsharePost[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("pshare_posts")
    .select(
      "slug, num_label, title, snippet, author_alias, art_halftone, art_bg, art_num_color, tags, published_at",
    )
    .eq("status", "published")
    .order("num_label", { ascending: true });
  if (error) throw new Error(`getStudentPshareFeed: ${error.message}`);
  return (data ?? []).map<PsharePost>((p) => ({
    slug: p.slug,
    num: p.num_label ?? "",
    title: p.title,
    snippet: p.snippet ?? "",
    author: p.author_alias ?? "",
    date: thaiDate(p.published_at),
    tags: p.tags ?? [],
    art: {
      halftone: (p.art_halftone as PsharePost["art"]["halftone"]) ?? "halftone-bl",
      bg: p.art_bg ?? undefined,
      numColor: p.art_num_color ?? undefined,
    },
  }));
}

export type PshareAdminRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "review";
  author: string;
  num: string;
  publishedAt: string | null;
  updatedAt: string;
};

export async function getAllPsharePosts(): Promise<PshareAdminRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("pshare_posts")
    .select(
      "id, slug, title, status, author_alias, num_label, published_at, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`getAllPsharePosts: ${error.message}`);
  return (data ?? []).map<PshareAdminRow>((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status as PshareAdminRow["status"],
    author: p.author_alias ?? "",
    num: p.num_label ?? "",
    publishedAt: p.published_at,
    updatedAt: p.updated_at,
  }));
}

export type PsharePostFull =
  Database["public"]["Tables"]["pshare_posts"]["Row"];

export async function getPsharePostBySlug(
  slug: string,
): Promise<PsharePostFull | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("pshare_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`getPsharePostBySlug: ${error.message}`);
  return data;
}
