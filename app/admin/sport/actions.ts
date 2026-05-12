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
