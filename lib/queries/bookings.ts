import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AdminBookingListRow,
  AdminBookingRow,
  GanttBarVariant,
} from "@/lib/types";
import { monthRange } from "@/lib/queries/util";
import { EN_MONTHS_ABBR } from "@/lib/time";

const TIME_FROM_TS_RE = /T(\d{2}:\d{2})/;
const DATE_PARTS_RE = /(\d{4})-(\d{2})-(\d{2})/;
const FORMAT_START_TIME_RE = /-(\d{2})T(\d{2}:\d{2})/;
const FORMAT_START_DAY_RE = /-(\d{2})-(\d{2})T/;

export type BookingFull = Database["public"]["Tables"]["bookings"]["Row"];

export type WeekChip = {
  id: string;
  startHHMM: string;
  variant: GanttBarVariant;
};

export function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function mondayOf(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Mon=0 … Sun=6 (Mon-first ordering)
  const dayIdx = (dt.getUTCDay() + 6) % 7;
  return addDays(dateISO, -dayIdx);
}

export function weekDaysOf(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function timeFromTimestamp(ts: string): string {
  const match = ts.match(TIME_FROM_TS_RE);
  return match ? match[1] : "00:00";
}

function dateShortFromTimestamp(ts: string): string {
  const m = ts.match(DATE_PARTS_RE);
  if (!m) return "";
  const day = parseInt(m[3], 10);
  const month = parseInt(m[2], 10);
  return `${day} ${EN_MONTHS_ABBR[month - 1]}`;
}

const LIST_SELECT =
  "id, user_label, purpose, starts_at, ends_at, status, rooms!inner(name_en)";

function rowToListRow(b: {
  id: string;
  user_label: string;
  purpose: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  rooms: { name_en: string } | null;
}): AdminBookingListRow {
  return {
    id: b.id,
    date: dateShortFromTimestamp(b.starts_at),
    room: b.rooms?.name_en ?? "",
    user: b.user_label,
    start: timeFromTimestamp(b.starts_at),
    end: timeFromTimestamp(b.ends_at),
    purpose: b.purpose ?? "",
    status: b.status as AdminBookingListRow["status"],
  };
}

export async function getMonthlyBookings(
  year: number,
  month: number,
): Promise<AdminBookingListRow[]> {
  const db = await createClient();
  const { start, next } = monthRange(year, month);
  const { data, error } = await db
    .from("bookings")
    .select(LIST_SELECT)
    .gte("starts_at", start)
    .lt("starts_at", next)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getMonthlyBookings: ${error.message}`);
  return (data ?? []).map((b) =>
    rowToListRow(b as unknown as Parameters<typeof rowToListRow>[0]),
  );
}

/**
 * Map of day-of-month → ordered dot colors for confirmed bookings in
 * (year, month). Each period that has at least one confirmed booking adds a
 * dot in canonical order (morning → midday → evening) using the period's
 * color token. Returned days have at least one dot.
 */
const BOOKING_PERIOD_DOTS = [
  { start: "08:00", color: "var(--color-yellow)" },
  { start: "11:30", color: "var(--color-blue)" },
  { start: "15:00", color: "var(--color-house-pink)" },
] as const;

const DAY_OF_MONTH_RE = /-(\d{2})T/;

export async function getStudentMonthBookingDots(
  year: number,
  month: number,
): Promise<Map<number, string[]>> {
  const db = await createClient();
  const { start, next } = monthRange(year, month);
  const { data, error } = await db
    .from("bookings")
    .select("starts_at, status")
    .eq("status", "Confirmed")
    .gte("starts_at", start)
    .lt("starts_at", next);
  if (error) throw new Error(`getStudentMonthBookingDots: ${error.message}`);

  // DEBUG: temporary instrumentation. Remove once verified.
  console.log(
    `[DEBUG getStudentMonthBookingDots] ${year}-${String(month).padStart(2, "0")} rows=${data?.length ?? 0}`,
  );
  for (const b of data ?? []) {
    console.log(`  starts_at=${b.starts_at} status=${b.status}`);
  }

  const byDay = new Map<number, Set<string>>();
  for (const b of data ?? []) {
    const dayMatch = b.starts_at.match(DAY_OF_MONTH_RE);
    const timeMatch = b.starts_at.match(TIME_FROM_TS_RE);
    if (!dayMatch || !timeMatch) continue;
    const day = parseInt(dayMatch[1], 10);
    const time = timeMatch[1];
    let set = byDay.get(day);
    if (!set) {
      set = new Set<string>();
      byDay.set(day, set);
    }
    set.add(time);
  }

  const result = new Map<number, string[]>();
  for (const [day, times] of byDay) {
    const dots = BOOKING_PERIOD_DOTS.filter((p) => times.has(p.start)).map(
      (p) => p.color,
    );
    if (dots.length > 0) result.set(day, dots);
  }
  // DEBUG
  console.log(
    `[DEBUG getStudentMonthBookingDots] => byDay:`,
    [...byDay.entries()].map(([d, v]) => `day${d}=[${[...v].join(",")}]`),
  );
  return result;
}

export async function getPendingBookings(): Promise<AdminBookingListRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select(LIST_SELECT)
    .eq("status", "Pending")
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getPendingBookings: ${error.message}`);
  return (data ?? []).map((b) =>
    rowToListRow(b as unknown as Parameters<typeof rowToListRow>[0]),
  );
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
): Promise<{
  id: string;
  user_label: string;
  starts_at: string;
  ends_at: string;
} | null> {
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

export async function getWeekBookings(
  weekStart: string,
  weekEnd: string,
): Promise<{
  rooms: { id: string; nameEn: string; nameTh: string }[];
  bookingsByRoomDay: Record<string, Record<string, WeekChip[]>>;
}> {
  const db = await createClient();
  const nextDay = addDays(weekEnd, 1);

  const [bookingsRes, roomsRes] = await Promise.all([
    db
      .from("bookings")
      .select("id, starts_at, bar_variant, room_id")
      .gte("starts_at", `${weekStart}T00:00:00+07:00`)
      .lt("starts_at", `${nextDay}T00:00:00+07:00`)
      .order("starts_at", { ascending: true }),
    db
      .from("rooms")
      .select("id, name_en, name_th, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (bookingsRes.error)
    throw new Error(`getWeekBookings: ${bookingsRes.error.message}`);
  if (roomsRes.error)
    throw new Error(`getWeekBookings rooms: ${roomsRes.error.message}`);

  const bookingsByRoomDay: Record<string, Record<string, WeekChip[]>> = {};
  for (const b of bookingsRes.data ?? []) {
    const dayISO = b.starts_at.slice(0, 10);
    const startHHMM = timeFromTimestamp(b.starts_at);
    const room = (bookingsByRoomDay[b.room_id] ??= {});
    (room[dayISO] ??= []).push({
      id: b.id,
      startHHMM,
      variant: b.bar_variant as GanttBarVariant,
    });
  }

  return {
    rooms: (roomsRes.data ?? []).map((r) => ({
      id: r.id,
      nameEn: r.name_en,
      nameTh: r.name_th,
    })),
    bookingsByRoomDay,
  };
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
  const match = ts.match(FORMAT_START_TIME_RE);
  if (!match) return ts;
  const monthMap: Record<string, string> = { "05": "May" };
  const dayMatch = ts.match(FORMAT_START_DAY_RE);
  if (!dayMatch) return ts;
  return `${parseInt(dayMatch[2], 10)} ${monthMap[dayMatch[1]] ?? dayMatch[1]} · ${match[2]}`;
}

export async function getRecentBookings(limit = 5): Promise<AdminBookingRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("bookings")
    .select("user_label, starts_at, ends_at, status, rooms!inner(name_en)")
    .order("starts_at", { ascending: false })
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
