import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import { ADMIN_MAY_2026 } from "./data/admin-calendar";
import { ADMIN_TODAY_EVENTS } from "./data/admin-overview";
import { SELECTED_DAY_EVENTS } from "./data/calendar";
import { ADMIN_SPORT_UPCOMING } from "./data/admin-sport";
import { logStep } from "./util";

type Insert = Database["public"]["Tables"]["events"]["Insert"];
type Category = Database["public"]["Enums"]["event_category"];

const TZ = "+07:00";
const iso = (day: number, time: string) =>
  `2026-05-${String(day).padStart(2, "0")}T${time}:00${TZ}`;

const TIME_BY_TITLE: Record<string, string> = {
  // ADMIN_TODAY_EVENTS times (12 May)
  "Staff briefing": "09:00",
  "Sport Day · Day 2 opening": "10:30",
  "Curriculum review": "14:00",
  "Orchestra rehearsal": "17:00",
};

const HIGHLIGHT_DEFAULT_CATEGORY: Category = "admin";

function categoryFromTag(tag: string): Category {
  const prefix = tag.split("·")[0]?.trim().toLowerCase() ?? "";
  switch (prefix) {
    case "sport":
      return "sport";
    case "music":
      return "music";
    case "admin":
      return "admin";
    case "academic":
      return "academic";
    case "tradition":
      return "tradition";
    default:
      return "admin";
  }
}

function categoryFor(variant: string): {
  category: Category;
  highlight: boolean;
} {
  if (variant === "highlight") {
    return { category: HIGHLIGHT_DEFAULT_CATEGORY, highlight: true };
  }
  return { category: variant as Category, highlight: false };
}

export async function seedEvents(
  db: SupabaseClient<Database>,
  adminId: string,
): Promise<void> {
  const done = logStep("events");
  const rows: Insert[] = [];

  // BigCal events — one row per (day, title) pair in May 2026
  for (const day of ADMIN_MAY_2026) {
    if (!day.inMonth || !day.events) continue;
    for (const ev of day.events) {
      const { category, highlight } = categoryFor(ev.variant);
      const time = TIME_BY_TITLE[ev.title] ?? "09:00";
      rows.push({
        title_th: ev.title,
        title_en: null,
        tag: null,
        category,
        starts_at: iso(day.num, time),
        location: null,
        highlight,
        created_by_admin_id: adminId,
      });
    }
  }

  // Selected-day events on 13 May (student calendar view)
  for (const ev of SELECTED_DAY_EVENTS) {
    rows.push({
      title_th: ev.titleTh,
      title_en: null,
      tag: ev.tag,
      category: ev.category,
      starts_at: iso(13, ev.time),
      location: null,
      highlight: false,
      created_by_admin_id: adminId,
    });
  }

  // Sport upcoming chips for today (12 May)
  for (const ev of ADMIN_SPORT_UPCOMING) {
    rows.push({
      title_th: ev.titleTh,
      title_en: null,
      tag: ev.tag,
      category: ev.category,
      starts_at: iso(12, ev.time),
      location: null,
      highlight: false,
      created_by_admin_id: adminId,
    });
  }

  // Admin today-events on 12 May (admin overview cards)
  for (const ev of ADMIN_TODAY_EVENTS) {
    rows.push({
      title_th: ev.title,
      title_en: null,
      tag: ev.tag,
      category: categoryFromTag(ev.tag),
      starts_at: iso(12, ev.time),
      location: null,
      highlight: false,
      created_by_admin_id: adminId,
    });
  }

  // Wipe-and-reinsert is safest for events since there is no natural key.
  // The seed is gated and intended to run against the prototype DB.
  const { error: delErr } = await db
    .from("events")
    .delete()
    .not("id", "is", null);
  if (delErr) throw new Error(`events delete: ${delErr.message}`);
  const { error } = await db.from("events").insert(rows);
  if (error) throw new Error(`events insert: ${error.message}`);
  done(rows.length);
}
