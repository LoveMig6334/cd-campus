import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";
import { BOOKING_ROOM_STATUS_BY_NAME } from "@/lib/ui/booking";

export async function getMusicRooms(): Promise<Room[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("rooms")
    .select("id, name_en, name_th, kind, sort_order")
    .eq("kind", "music")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`getMusicRooms: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    nameEn: r.name_en,
    nameTh: r.name_th,
    status: BOOKING_ROOM_STATUS_BY_NAME[r.name_en] ?? "free",
  }));
}
