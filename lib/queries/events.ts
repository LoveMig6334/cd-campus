import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { monthRange } from "@/lib/queries/util";
import {
  CATEGORY_COLOR,
  type AdminEvent,
  type BigCalDay,
  type BigCalEvent,
  type CalendarCategory,
  type CalendarDay,
  type CalendarEvent,
} from "@/lib/types";
import { buildMonthGrid } from "@/lib/time";

/**
 * Tag-based discriminator for which "view" each event belongs to:
 *
 *   tag IS NULL              → BigCal-style structural event (Phase 2 ADMIN_MAY_2026)
 *   tag LIKE 'Sport · %'     → admin overview today-card / student day-events on the selected day
 *   tag LIKE 'Music · %'     → same
 *   tag LIKE 'Admin · %'     → same
 *   tag LIKE 'Academic · %'  → same
 *   tag LIKE 'Tradition · %' → same
 *   tag LIKE 'Team · %'      → upcoming-sport chip
 *   tag LIKE 'Track · %'     → upcoming-sport chip
 *   tag LIKE 'Show · %'      → upcoming-sport chip
 *
 * The seed inserts events with tags matching these prefixes, so queries can
 * select the appropriate slice for each consumer.
 */
const TODAY_TAG_PREFIXES = ["Sport", "Music", "Admin", "Academic", "Tradition"];
const TODAY_TAG_FILTER = TODAY_TAG_PREFIXES.map(
  (p) => `tag.ilike.${p} · %`,
).join(",");

type EventRow = {
  id: string;
  title_th: string;
  title_en: string | null;
  tag: string | null;
  category: CalendarCategory;
  starts_at: string;
  highlight: boolean;
};

const DAY_RE = /-\d{2}-(\d{2})T/;
const TIME_RE = /T(\d{2}:\d{2})/;

function dayOf(starts_at: string): number {
  const match = starts_at.match(DAY_RE);
  return match ? parseInt(match[1], 10) : 0;
}

function timeOf(starts_at: string): string {
  const match = starts_at.match(TIME_RE);
  return match ? match[1] : "00:00";
}

export async function getStudentMonth(
  year: number,
  month: number,
): Promise<CalendarDay[]> {
  const db = await createClient();
  const { start, next } = monthRange(year, month);
  const { data, error } = await db
    .from("events")
    .select("title_th, category, starts_at, highlight")
    .gte("starts_at", start)
    .lt("starts_at", next)
    .is("tag", null) // BigCal-style only
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getStudentMonth: ${error.message}`);
  const rows = (data ?? []) as Pick<
    EventRow,
    "title_th" | "category" | "starts_at" | "highlight"
  >[];

  // Highlight events contribute YELLOW only (not their category color),
  // matching the prototype's `[C.sport, YELLOW]` shape on May 12.
  const yellow = "var(--color-yellow)";
  const dotsByDay = new Map<number, string[]>();
  for (const r of rows) {
    const day = dayOf(r.starts_at);
    if (!dotsByDay.has(day)) dotsByDay.set(day, []);
    const dots = dotsByDay.get(day)!;
    if (r.highlight) {
      if (!dots.includes(yellow)) dots.push(yellow);
    } else {
      const color = CATEGORY_COLOR[r.category];
      if (!dots.includes(color)) dots.push(color);
    }
  }

  return buildMonthGrid(year, month).map<CalendarDay>((cell) => {
    if (!cell.inMonth) return { num: cell.num, inMonth: false };
    const dots = dotsByDay.get(cell.num);
    if (dots && dots.length) {
      return { num: cell.num, inMonth: true, dots };
    }
    return { num: cell.num, inMonth: true };
  });
}

export async function getStudentDayEvents(
  year: number,
  month: number,
  day: number,
): Promise<CalendarEvent[]> {
  const db = await createClient();
  const dayStart = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+07:00`;
  const dayEnd = `${year}-${String(month).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}T00:00:00+07:00`;
  const { data, error } = await db
    .from("events")
    .select("title_th, tag, category, starts_at")
    .gte("starts_at", dayStart)
    .lt("starts_at", dayEnd)
    .not("tag", "is", null) // day-events have a tag
    .or(TODAY_TAG_FILTER) // exclude sport-upcoming Team/Track/Show tags
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getStudentDayEvents: ${error.message}`);
  return (data ?? []).map<CalendarEvent>((r) => ({
    time: timeOf(r.starts_at),
    titleTh: r.title_th,
    tag: r.tag ?? "",
    category: r.category as CalendarCategory,
  }));
}

export async function getAdminMonth(
  year: number,
  month: number,
): Promise<BigCalDay[]> {
  const db = await createClient();
  const { start, next } = monthRange(year, month);
  const { data, error } = await db
    .from("events")
    .select("title_th, category, starts_at, highlight")
    .gte("starts_at", start)
    .lt("starts_at", next)
    .is("tag", null) // BigCal-style only
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getAdminMonth: ${error.message}`);

  const byDay = new Map<number, BigCalEvent[]>();
  for (const r of (data ?? []) as Pick<
    EventRow,
    "title_th" | "category" | "starts_at" | "highlight"
  >[]) {
    const day = dayOf(r.starts_at);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({
      title: r.title_th,
      variant: r.highlight ? "highlight" : r.category,
    });
  }

  const grid: BigCalDay[] = buildMonthGrid(year, month).map((cell) =>
    cell.inMonth
      ? { num: cell.num, inMonth: true }
      : { num: cell.num, inMonth: false },
  );
  return grid.map((cell) => {
    if (!cell.inMonth) return cell;
    const events = byDay.get(cell.num);
    return events && events.length ? { ...cell, events } : cell;
  });
}

export async function getAdminTodayEvents(): Promise<AdminEvent[]> {
  // "Today" in the prototype is 2026-05-12. Today-card entries have tags
  // starting with a CalendarCategory name; upcoming-sport entries have
  // tag prefixes Team/Track/Show, which we explicitly exclude.
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select("title_th, tag, category, starts_at")
    .gte("starts_at", "2026-05-12T00:00:00+07:00")
    .lt("starts_at", "2026-05-13T00:00:00+07:00")
    .eq("highlight", false)
    .not("tag", "is", null)
    .or(TODAY_TAG_FILTER)
    .order("starts_at", { ascending: true })
    .limit(4);
  if (error) throw new Error(`getAdminTodayEvents: ${error.message}`);
  return (data ?? []).map<AdminEvent>((r) => ({
    time: timeOf(r.starts_at),
    title: r.title_th,
    tag: r.tag ?? "",
    barColor: CATEGORY_COLOR[r.category as CalendarCategory],
  }));
}

export async function getStudentUpcomingSport(
  limit = 2,
): Promise<CalendarEvent[]> {
  // Sport-upcoming entries have tag prefixes Team/Track/Show.
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select("title_th, tag, category, starts_at")
    .eq("category", "sport")
    .or("tag.ilike.Team · %,tag.ilike.Track · %,tag.ilike.Show · %")
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getStudentUpcomingSport: ${error.message}`);
  return (data ?? []).map<CalendarEvent>((r) => ({
    time: timeOf(r.starts_at),
    titleTh: r.title_th,
    tag: r.tag ?? "",
    category: "sport",
  }));
}

export async function getAdminUpcomingSport(
  limit = 3,
): Promise<CalendarEvent[]> {
  return getStudentUpcomingSport(limit);
}

export type AdminCalendarRow = {
  id: string;
  starts_at: string;
  title_th: string;
  title_en: string | null;
  tag: string | null;
  category: Database["public"]["Enums"]["event_category"];
  location: string | null;
  highlight: boolean;
};

export async function getAdminMonthEventList(
  year: number,
  month: number, // 1-indexed
): Promise<AdminCalendarRow[]> {
  const db = await createClient();
  const { start, next } = monthRange(year, month);
  const { data, error } = await db
    .from("events")
    .select(
      "id, starts_at, title_th, title_en, tag, category, location, highlight",
    )
    .gte("starts_at", start)
    .lt("starts_at", next)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(`getAdminMonthEventList: ${error.message}`);
  return (data ?? []) as AdminCalendarRow[];
}

export async function getEventById(
  id: string,
): Promise<AdminCalendarRow | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("events")
    .select(
      "id, starts_at, title_th, title_en, tag, category, location, highlight",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getEventById: ${error.message}`);
  return data as AdminCalendarRow | null;
}
