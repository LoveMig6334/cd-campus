"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { DISPLAY_MODE_KEY, isDisplayMode } from "@/lib/sport/displayMode";

/** Flip the hall board between the live match and the holding screen. */
export async function setDisplayMode(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const mode = String(formData.get("mode") ?? "");
  if (!isDisplayMode(mode)) return;

  const db = await createClient();
  const { error } = await db.from("site_config").upsert(
    {
      key: DISPLAY_MODE_KEY,
      value: { mode },
      updated_by_admin_id: admin.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/scoreboard");
  revalidatePath("/console/display");
}
