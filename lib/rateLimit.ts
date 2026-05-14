import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AnonAction = "carelin" | "booking";

const ANON_LIMIT = 5;

export async function checkAnonRateLimit(
  action: AnonAction,
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const ip = await ipFromHeaders();
  const db = await createClient();
  const { data, error } = await db.rpc("record_anon_hit", {
    p_ip: ip,
    p_action: action,
  });
  // Fail-open: a Supabase outage shouldn't lock out legit students.
  if (error || data == null) return { ok: true };
  if (data > ANON_LIMIT) {
    return { ok: false, retryAfterSeconds: 60 - new Date().getSeconds() };
  }
  return { ok: true };
}

async function ipFromHeaders(): Promise<string> {
  const fwd = (await headers()).get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "0.0.0.0";
}
