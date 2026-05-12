import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import type { House } from "./data/types";

export const HOUSE_ID_BY_KEY: Record<House, number> = {
  green: 1,
  purple: 2,
  orange: 3,
  pink: 4,
};

export function assertEnvAllows(): void {
  if (process.env.SUPABASE_ALLOW_SEED !== "1") {
    console.error(
      "Refusing to seed: SUPABASE_ALLOW_SEED is not set to '1'.\n" +
        "Set it in .env.local for local dev. NEVER set it on Vercel.",
    );
    process.exit(1);
  }
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing env var: ${key}`);
      process.exit(1);
    }
  }
}

export function getServiceRoleClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function getRootAdminId(
  db: SupabaseClient<Database>,
): Promise<string> {
  const { data, error } = await db
    .from("admins")
    .select("id")
    .eq("tier", "root")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (error || !data) {
    throw new Error(
      "No root admin row found. Run supabase/seed.sql in Studio first.",
    );
  }
  return data.id;
}

export function logStep(label: string): (count: number) => void {
  const start = Date.now();
  process.stdout.write(`  · ${label} ... `);
  return (count: number) => {
    const ms = Date.now() - start;
    console.log(`ok (${count} rows, ${ms}ms)`);
  };
}
