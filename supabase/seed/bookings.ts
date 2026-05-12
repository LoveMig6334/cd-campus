import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import {
  ADMIN_TODAY_BOOKINGS,
  GANTT_ROOMS,
} from "./data/admin-bookings";
import { logStep } from "./util";

type Insert = Database["public"]["Tables"]["bookings"]["Insert"];
type Variant = Database["public"]["Enums"]["booking_bar_variant"];

const TZ = "+07:00";
const TODAY = "2026-05-12";
const at = (time: string) => `${TODAY}T${time}:00${TZ}`;

function variantFor(roomEn: string, user: string): Variant {
  const room = GANTT_ROOMS.find((r) => r.nameEn === roomEn);
  const bar = room?.bars.find((b) => b.who === user);
  return (bar?.variant ?? "default") as Variant;
}

export async function seedBookings(
  db: SupabaseClient<Database>,
  adminId: string,
): Promise<void> {
  const done = logStep("bookings");
  const { data: rooms, error: roomErr } = await db
    .from("rooms")
    .select("id, name_en");
  if (roomErr) throw new Error(`bookings: room lookup ${roomErr.message}`);
  const roomIdByName = new Map(rooms.map((r) => [r.name_en, r.id]));

  const rows: Insert[] = ADMIN_TODAY_BOOKINGS.flatMap((b) => {
    const roomId = roomIdByName.get(b.room);
    if (!roomId) return [];
    return [{
      room_id: roomId,
      user_label: b.user,
      purpose: b.purpose,
      starts_at: at(b.start),
      ends_at: at(b.end),
      status: b.status,
      bar_variant: variantFor(b.room, b.user),
      created_by_admin_id: adminId,
    }];
  });

  const { error: delErr } = await db
    .from("bookings")
    .delete()
    .not("id", "is", null);
  if (delErr) throw new Error(`bookings delete: ${delErr.message}`);
  const { error } = await db.from("bookings").insert(rows);
  if (error) throw new Error(`bookings insert: ${error.message}`);
  done(rows.length);
}
