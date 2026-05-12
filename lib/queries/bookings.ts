import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AdminBookingRow,
  AdminTodayBookingRow,
  GanttBar,
  GanttBarVariant,
  GanttRoom,
} from "@/lib/types";

export type BookingFull = Database["public"]["Tables"]["bookings"]["Row"];

const TODAY = "2026-05-12";

function timeFromTimestamp(ts: string): string {
  const match = ts.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "00:00";
}

function ganttPctFromTime(time: string, dir: "left" | "width", end?: string): number {
  // Gantt spans 08:00 → 18:00 → 10 hours of width.
  const span = 10 * 60; // minutes
  const [hh, mm] = time.split(":").map(Number);
  const startMin = hh * 60 + mm - 8 * 60;
  if (dir === "left") return Math.round((startMin / span) * 100);
  if (!end) return 0;
  const [eh, em] = end.split(":").map(Number);
  const endMin = eh * 60 + em - 8 * 60;
  return Math.round(((endMin - startMin) / span) * 100);
}

export async function getAdminTodayBookings(): Promise<AdminTodayBookingRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select(
      "id, user_label, purpose, starts_at, ends_at, status, rooms!inner(name_en)",
    )
    .gte("starts_at", `${TODAY}T00:00:00+07:00`)
    .lt("starts_at", `2026-05-13T00:00:00+07:00`)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getAdminTodayBookings: ${error.message}`);
  return (data ?? []).map<AdminTodayBookingRow>((b) => {
    const room = b.rooms as unknown as { name_en: string } | null;
    return {
      id: b.id,
      room: room?.name_en ?? "",
      user: b.user_label,
      start: timeFromTimestamp(b.starts_at),
      end: timeFromTimestamp(b.ends_at),
      purpose: b.purpose ?? "",
      status: b.status as AdminTodayBookingRow["status"],
    };
  });
}

export async function getBookingById(id: string): Promise<BookingFull | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getBookingById: ${error.message}`);
  return data;
}

export async function findConflictingBooking(
  roomId: string,
  startsAt: string,
  endsAt: string,
  excludeId?: string,
): Promise<{ id: string; user_label: string; starts_at: string; ends_at: string } | null> {
  const db = await createClient();
  let query = db
    .from("bookings")
    .select("id, user_label, starts_at, ends_at")
    .eq("room_id", roomId)
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw new Error(`findConflictingBooking: ${error.message}`);
  return data && data.length > 0 ? data[0] : null;
}

export async function getGanttRooms(): Promise<GanttRoom[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select(
      "user_label, starts_at, ends_at, bar_variant, purpose, rooms!inner(name_en, name_th, sort_order)",
    )
    .gte("starts_at", `${TODAY}T00:00:00+07:00`)
    .lt("starts_at", `2026-05-13T00:00:00+07:00`)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getGanttRooms: ${error.message}`);

  type Row = {
    user_label: string;
    starts_at: string;
    ends_at: string;
    bar_variant: GanttBarVariant;
    purpose: string | null;
    rooms: { name_en: string; name_th: string; sort_order: number | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const byRoom = new Map<string, GanttRoom>();
  for (const r of rows) {
    if (!r.rooms) continue;
    const key = r.rooms.name_en;
    if (!byRoom.has(key)) {
      byRoom.set(key, { nameEn: r.rooms.name_en, nameTh: r.rooms.name_th, bars: [] });
    }
    const room = byRoom.get(key)!;
    const start = timeFromTimestamp(r.starts_at);
    const end = timeFromTimestamp(r.ends_at);
    const bar: GanttBar = {
      who: r.user_label,
      meta: `${start} — ${end}${r.purpose ? ` · ${r.purpose}` : ""}`,
      leftPct: ganttPctFromTime(start, "left"),
      widthPct: ganttPctFromTime(start, "width", end),
      variant: r.bar_variant === "default" ? undefined : r.bar_variant,
    };
    room.bars.push(bar);
  }
  // Also surface rooms with no bookings (for visual parity with the static GANTT_ROOMS).
  const allRoomsRes = await db
    .from("rooms")
    .select("name_en, name_th, sort_order")
    .order("sort_order", { ascending: true });
  if (allRoomsRes.error) {
    throw new Error(`getGanttRooms rooms: ${allRoomsRes.error.message}`);
  }
  for (const r of allRoomsRes.data ?? []) {
    if (!byRoom.has(r.name_en)) {
      byRoom.set(r.name_en, { nameEn: r.name_en, nameTh: r.name_th, bars: [] });
    }
  }
  const sortMap = new Map(
    (allRoomsRes.data ?? []).map((r) => [r.name_en, r.sort_order ?? 0]),
  );
  return [...byRoom.values()].sort(
    (a, b) => (sortMap.get(a.nameEn) ?? 0) - (sortMap.get(b.nameEn) ?? 0),
  );
}

const ROOM_TH_BY_EN: Record<string, string> = {
  "Music Room 1": "เปียโน · กลอง",
  "Music Room 2": "กีตาร์",
  "Music Room 3": "วงดุริยางค์",
  "Studio Room": "ห้องอัด",
  "Conference 2": "ห้องประชุมเล็ก",
  "Conference 3": "ห้องประชุมใหญ่",
};

function formatStart(ts: string): string {
  // "2026-05-13T11:30:00+07:00" → "13 May · 11:30"
  const match = ts.match(/-(\d{2})T(\d{2}:\d{2})/);
  if (!match) return ts;
  const monthMap: Record<string, string> = { "05": "May" };
  const dayMatch = ts.match(/-(\d{2})-(\d{2})T/);
  if (!dayMatch) return ts;
  return `${parseInt(dayMatch[2], 10)} ${monthMap[dayMatch[1]] ?? dayMatch[1]} · ${match[2]}`;
}

export async function getRecentBookings(limit = 5): Promise<AdminBookingRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select(
      "user_label, starts_at, ends_at, status, rooms!inner(name_en)",
    )
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getRecentBookings: ${error.message}`);
  return (data ?? []).map<AdminBookingRow>((b) => {
    const room = b.rooms as unknown as { name_en: string } | null;
    const roomEn = room?.name_en ?? "";
    return {
      roomEn,
      roomTh: ROOM_TH_BY_EN[roomEn] ?? "",
      user: b.user_label,
      klass: "—",
      start: formatStart(b.starts_at),
      end: timeFromTimestamp(b.ends_at),
      status: b.status as AdminBookingRow["status"],
    };
  });
}
