const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Public URL for an object in the `assets` bucket. Synchronous — does not
 * construct a Supabase client. Safe in server and client components.
 */
export function getAssetUrl(path: string): string {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return `${SUPABASE_URL}/storage/v1/object/public/assets/${path}`;
}
