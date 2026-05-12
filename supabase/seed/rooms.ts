import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import { logStep } from "./util";

type Row = Database["public"]["Tables"]["rooms"]["Insert"];

const ROOMS: Row[] = [
  { name_en: "Music Room 1", name_th: "เปียโน · กลอง",       kind: "music",   sort_order: 1 },
  { name_en: "Music Room 2", name_th: "กีตาร์ · เครื่องสาย", kind: "music",   sort_order: 2 },
  { name_en: "Music Room 3", name_th: "วงดุริยางค์",          kind: "music",   sort_order: 3 },
  { name_en: "Studio Room",  name_th: "ห้องอัด",              kind: "music",   sort_order: 4 },
  { name_en: "Conference 2", name_th: "ห้องประชุมเล็ก",        kind: "meeting", sort_order: 5 },
  { name_en: "Conference 3", name_th: "ห้องประชุมใหญ่",        kind: "meeting", sort_order: 6 },
];

export async function seedRooms(
  db: SupabaseClient<Database>,
): Promise<void> {
  const done = logStep("rooms");
  const { error } = await db
    .from("rooms")
    .upsert(ROOMS, { onConflict: "name_en" });
  if (error) throw new Error(`rooms upsert: ${error.message}`);
  done(ROOMS.length);
}
