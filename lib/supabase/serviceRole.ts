import "server-only";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY. Bypasses RLS — only call from Server Actions or Route Handlers
 * that have already verified the caller is authorised (e.g. is_root_admin()).
 */
export function getSupabaseServiceRole() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
