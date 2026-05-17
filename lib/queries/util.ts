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
