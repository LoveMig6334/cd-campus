import type { Database } from "@/lib/supabase/database.types";
import type { House } from "@/lib/types";

export type DB = Database;

export const KEY_BY_HOUSE_ID: Record<number, House> = {
  1: "green",
  2: "purple",
  3: "orange",
  4: "pink",
};

export function houseKeyFromId(id: number): House {
  const key = KEY_BY_HOUSE_ID[id];
  if (!key) throw new Error(`Unknown house id: ${id}`);
  return key;
}

/**
 * ISO bounds for a 1-indexed (year, month) pair, in Asia/Bangkok offset.
 * Returns `start` (first day of month at 00:00 +07:00) and `next` (first day
 * of the following month at 00:00 +07:00). Use as `.gte(start).lt(next)`.
 */
export function monthRange(
  year: number,
  month: number,
): { start: string; next: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`;
  const next =
    month === 12
      ? `${year + 1}-01-01T00:00:00+07:00`
      : `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+07:00`;
  return { start, next };
}

/** Add `n` days to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/**
 * ISO bounds for the single day `dateISO` (YYYY-MM-DD) in Asia/Bangkok offset.
 * `start` is 00:00 +07:00, `next` is the following day's 00:00 +07:00. Use as
 * `.gte(start).lt(next)`.
 */
export function dayRange(dateISO: string): { start: string; next: string } {
  return {
    start: `${dateISO}T00:00:00+07:00`,
    next: `${addDays(dateISO, 1)}T00:00:00+07:00`,
  };
}

/**
 * ISO bounds for the Mon–Sun week containing `dateISO` (YYYY-MM-DD), in
 * Asia/Bangkok offset. `start` is Monday 00:00 +07:00, `next` is the following
 * Monday 00:00 +07:00 (use as `.gte(start).lt(next)`). `days` lists the seven
 * YYYY-MM-DD strings, Mon→Sun.
 */
export function weekRange(dateISO: string): {
  start: string;
  next: string;
  days: string[];
} {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dayIdx = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = addDays(dateISO, -dayIdx);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return {
    start: `${monday}T00:00:00+07:00`,
    next: `${addDays(monday, 7)}T00:00:00+07:00`,
    days,
  };
}
