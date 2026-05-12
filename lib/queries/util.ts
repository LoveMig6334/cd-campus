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
