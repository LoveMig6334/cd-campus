"use server";

import { revalidatePath } from "next/cache";
import { requireRootAdmin } from "@/lib/auth";
import { getSupabaseServiceRole } from "@/lib/supabase/serviceRole";
import { isFeatureKey } from "@/lib/ui/features";

export async function toggleFeature(formData: FormData): Promise<void> {
  const self = await requireRootAdmin();

  const key = String(formData.get("key") ?? "");
  if (!isFeatureKey(key)) return;

  const svc = getSupabaseServiceRole();

  // Read-modify-write is safe here because only the root admin can toggle and
  // concurrent flips are not a real concern. Avoids a custom RPC.
  const { data: current, error: readErr } = await svc
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .single();
  if (readErr || !current) {
    throw new Error(readErr?.message ?? "Flag missing.");
  }

  const { error } = await svc
    .from("feature_flags")
    .update({
      enabled: !current.enabled,
      updated_at: new Date().toISOString(),
      updated_by: self.id,
    })
    .eq("key", key);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/features");
  revalidatePath("/student", "layout");
}
