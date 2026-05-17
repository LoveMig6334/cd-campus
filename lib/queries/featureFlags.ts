import { createClient } from "@/lib/supabase/server";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/ui/features";

export type FeatureFlags = Record<FeatureKey, boolean>;

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const db = await createClient();
  const { data, error } = await db.from("feature_flags").select("key, enabled");
  if (error) throw new Error(`feature_flags: ${error.message}`);

  // Default every key to enabled, then override with whatever rows came back.
  // A missing row never dark-fails a feature; the CHECK constraint blocks
  // unknown keys from ever reaching the table.
  const out = Object.fromEntries(
    FEATURE_KEYS.map((k) => [k, true]),
  ) as FeatureFlags;
  for (const row of data ?? []) {
    if ((FEATURE_KEYS as readonly string[]).includes(row.key)) {
      out[row.key as FeatureKey] = row.enabled;
    }
  }
  return out;
}

export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[key];
}
