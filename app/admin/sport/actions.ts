"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function editScoreboard(formData: FormData): Promise<void> {
  await requireAdmin();
  const db = await createClient();

  for (const id of [1, 2, 3, 4] as const) {
    const raw = String(formData.get(`score_${id}`) ?? "");
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100000 || !Number.isInteger(n)) {
      return; // silent — client-side number inputs constrain this already
    }
    const { error } = await db
      .from("houses")
      .update({ current_score: n })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/sport");
  revalidatePath("/student/sport");
  revalidatePath("/student");
  revalidatePath("/admin");
  redirect("/admin/sport");
}

const SPORT_CATEGORIES = ["Track", "Team"] as const;
type SportCategory = (typeof SPORT_CATEGORIES)[number];

function isSportCategory(v: string): v is SportCategory {
  return (SPORT_CATEGORIES as readonly string[]).includes(v);
}

function parsePlacements(formData: FormData): number[] | null {
  const out: number[] = [];
  for (const slot of ["p1", "p2", "p3", "p4"] as const) {
    const raw = String(formData.get(slot) ?? "");
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 4) return null;
    if (out.includes(n)) return null; // disallow duplicates
    out.push(n);
  }
  return out;
}

function parseResult(formData: FormData):
  | { ok: true; data: {
      title_th: string;
      title_en: string | null;
      category: SportCategory;
      placements: number[];
      time_label: string | null;
    } }
  | { ok: false } {
  const title_th = String(formData.get("title_th") ?? "").trim();
  const title_en_raw = String(formData.get("title_en") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const time_label_raw = String(formData.get("time_label") ?? "").trim();
  const placements = parsePlacements(formData);

  if (!title_th) return { ok: false };
  if (!isSportCategory(category)) return { ok: false };
  if (!placements) return { ok: false };

  return {
    ok: true,
    data: {
      title_th,
      title_en: title_en_raw || null,
      category,
      placements,
      time_label: time_label_raw || null,
    },
  };
}

export async function recordSportResult(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = parseResult(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { error } = await db
    .from("sport_results")
    .insert({ ...parsed.data, created_by_admin_id: admin.id });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sport");
  revalidatePath("/student/sport");
  redirect("/admin/sport");
}

export async function updateSportResult(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const parsed = parseResult(formData);
  if (!parsed.ok) return;

  const db = await createClient();
  const { error } = await db
    .from("sport_results")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sport");
  revalidatePath("/student/sport");
  redirect("/admin/sport");
}

export async function deleteSportResult(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  const { error } = await db.from("sport_results").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sport");
  revalidatePath("/student/sport");
  redirect("/admin/sport");
}
