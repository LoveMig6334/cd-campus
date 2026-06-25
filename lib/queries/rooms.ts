import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Room } from "@/lib/types";
import { addDays } from "@/lib/queries/bookings";
import { bangkokTimeOf } from "@/lib/time";
import { PERIOD_HOURS } from "@/lib/ui/booking";

type DB = SupabaseClient<Database>;

const PERIOD_START_TIMES: readonly string[] = Object.values(PERIOD_HOURS).map(
  (p) => p.start,
);

/**
 * For `dateISO`, returns `Map<roomId, Set<periodStart>>` listing which period
 * start times each room has at least one booking for. Bookings are read in
 * Bangkok wall-clock terms — Supabase returns timestamptz in UTC, so we use
 * `bangkokTimeOf` to derive the local HH:MM before matching against the
 * canonical PERIOD_HOURS starts. Counts every status — pending requests
 * block a slot just like confirmed ones.
 */
async function getPeriodBookingsByRoom(
  db: DB,
  dateISO: string,
): Promise<Map<string, Set<string>>> {
  const nextDay = addDays(dateISO, 1);
  const { data, error } = await db
    .from("bookings")
    .select("room_id, starts_at")
    .gte("starts_at", `${dateISO}T00:00:00+07:00`)
    .lt("starts_at", `${nextDay}T00:00:00+07:00`);
  if (error) throw new Error(`getPeriodBookingsByRoom: ${error.message}`);

  const periodsByRoom = new Map<string, Set<string>>();
  for (const b of data ?? []) {
    const time = bangkokTimeOf(b.starts_at);
    if (!PERIOD_START_TIMES.includes(time)) continue;
    let set = periodsByRoom.get(b.room_id);
    if (!set) {
      set = new Set<string>();
      periodsByRoom.set(b.room_id, set);
    }
    set.add(time);
  }
  return periodsByRoom;
}

async function fetchRoomsByKind(
  db: DB,
  kind: "music" | "meeting",
): Promise<{ id: string; name_en: string; name_th: string }[]> {
  const { data, error } = await db
    .from("rooms")
    .select("id, name_en, name_th, kind, sort_order")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`getRooms(${kind}): ${error.message}`);
  return data ?? [];
}

/**
 * Rooms of `kind` with a day-level Free/Full status overlay AND the raw
 * per-room booked-period map (so callers can compute per-period status
 * without a second query). Day-level "full" = every PERIOD_HOURS slot is
 * booked on `dateISO`.
 */
export async function getRoomsAndBookings(
  kind: "music" | "meeting",
  dateISO?: string,
): Promise<{
  rooms: Room[];
  bookingsByRoom: Map<string, Set<string>>;
}> {
  const db = await createClient();
  // rooms-by-kind and the day's bookings are independent — fetch concurrently.
  const [roomsData, bookingsByRoom] = await Promise.all([
    fetchRoomsByKind(db, kind),
    dateISO
      ? getPeriodBookingsByRoom(db, dateISO)
      : Promise.resolve(new Map<string, Set<string>>()),
  ]);

  const rooms = roomsData.map<Room>((r) => {
    const booked = bookingsByRoom.get(r.id);
    const isDayFull = !!booked && booked.size >= PERIOD_START_TIMES.length;
    return {
      id: r.id,
      nameEn: r.name_en,
      nameTh: r.name_th,
      status: isDayFull ? "full" : "free",
    };
  });

  return { rooms, bookingsByRoom };
}

export async function getMusicRooms(dateISO?: string): Promise<Room[]> {
  return (await getRoomsAndBookings("music", dateISO)).rooms;
}

export async function getMeetingRooms(dateISO?: string): Promise<Room[]> {
  return (await getRoomsAndBookings("meeting", dateISO)).rooms;
}
