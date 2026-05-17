import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Room } from "@/lib/types";
import { addDays } from "@/lib/queries/bookings";
import { PERIOD_HOURS } from "@/lib/ui/booking";

type DB = SupabaseClient<Database>;

const PERIOD_START_TIMES: readonly string[] = Object.values(PERIOD_HOURS).map(
  (p) => p.start,
);
const TIME_RE = /T(\d{2}:\d{2})/;

/**
 * Returns the set of room IDs whose bookings on `dateISO` cover every
 * configured period (morning/midday/evening). All booking writers go through
 * `PERIOD_HOURS[period].start`, so `starts_at` always matches one of the
 * canonical period times — counting distinct period starts per room is
 * sufficient.
 */
async function getFullyBookedRoomIds(
  db: DB,
  dateISO: string,
): Promise<Set<string>> {
  const nextDay = addDays(dateISO, 1);
  const { data, error } = await db
    .from("bookings")
    .select("room_id, starts_at")
    .gte("starts_at", `${dateISO}T00:00:00+07:00`)
    .lt("starts_at", `${nextDay}T00:00:00+07:00`);
  if (error) throw new Error(`getFullyBookedRoomIds: ${error.message}`);

  const periodsByRoom = new Map<string, Set<string>>();
  for (const b of data ?? []) {
    const time = b.starts_at.match(TIME_RE)?.[1] ?? "";
    if (!PERIOD_START_TIMES.includes(time)) continue;
    let set = periodsByRoom.get(b.room_id);
    if (!set) {
      set = new Set<string>();
      periodsByRoom.set(b.room_id, set);
    }
    set.add(time);
  }

  const full = new Set<string>();
  for (const [roomId, times] of periodsByRoom) {
    if (times.size >= PERIOD_START_TIMES.length) full.add(roomId);
  }
  return full;
}

async function getRoomsByKind(
  kind: "music" | "meeting",
  dateISO?: string,
): Promise<Room[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("rooms")
    .select("id, name_en, name_th, kind, sort_order")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`getRooms(${kind}): ${error.message}`);

  const fullSet = dateISO
    ? await getFullyBookedRoomIds(db, dateISO)
    : new Set<string>();

  return (data ?? []).map((r) => ({
    id: r.id,
    nameEn: r.name_en,
    nameTh: r.name_th,
    status: fullSet.has(r.id) ? "full" : "free",
  }));
}

export async function getMusicRooms(dateISO?: string): Promise<Room[]> {
  return getRoomsByKind("music", dateISO);
}

export async function getMeetingRooms(dateISO?: string): Promise<Room[]> {
  return getRoomsByKind("meeting", dateISO);
}
