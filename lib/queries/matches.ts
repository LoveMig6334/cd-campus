import { createClient } from "@/lib/supabase/server";
import type { MatchView } from "@/lib/types";
import {
  isSportId,
  type MatchPlayer,
  type SetScore,
  type TeamCounts,
  type TeamKey,
} from "@/lib/sport/rules";
import {
  DISPLAY_MODE_KEY,
  parseDisplayMode,
  type DisplayMode,
} from "@/lib/sport/displayMode";
import type { DB } from "./util";
import { dayRange, houseKeyFromId } from "./util";

type MatchRow = DB["public"]["Tables"]["matches"]["Row"];
type HouseNames = { name_en: string; name_th: string };
type PlayerRow = Pick<
  DB["public"]["Tables"]["match_players"]["Row"],
  "id" | "team" | "number" | "name" | "fouls" | "points" | "on_court"
>;
type MatchRowJoined = MatchRow & {
  house_a_info: HouseNames;
  house_b_info: HouseNames;
  players: PlayerRow[];
};

const MATCH_SELECT =
  "*, house_a_info:houses!matches_house_a_fkey(name_en, name_th), house_b_info:houses!matches_house_b_fkey(name_en, name_th), players:match_players(id, team, number, name, fouls, points, on_court)";

function mapPlayers(rows: PlayerRow[]): MatchPlayer[] {
  return rows
    .map((r) => ({
      id: r.id,
      team: r.team as TeamKey,
      number: r.number,
      name: r.name,
      fouls: r.fouls,
      points: r.points,
      onCourt: r.on_court,
    }))
    .sort((a, b) => a.number - b.number);
}

function parseLastFoul(
  raw: MatchRow["last_player_foul"],
): MatchView["lastPlayerFoul"] {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    return null;
  const { team, number, fouls, at } = raw;
  if (
    (team !== "a" && team !== "b") ||
    typeof number !== "number" ||
    typeof fouls !== "number" ||
    typeof at !== "string"
  ) {
    return null;
  }
  return { team, number, fouls, at };
}

function parseSets(raw: MatchRow["sets"]): SetScore[] {
  if (!Array.isArray(raw)) throw new Error("matches.sets: expected array");
  return raw.map((s) => {
    if (
      s === null ||
      typeof s !== "object" ||
      Array.isArray(s) ||
      typeof s.a !== "number" ||
      typeof s.b !== "number"
    ) {
      throw new Error("matches.sets: malformed set entry");
    }
    return { a: s.a, b: s.b };
  });
}

function parseCounts(raw: MatchRow["fouls"], field: string): TeamCounts {
  if (
    raw === null ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    typeof raw.a !== "number" ||
    typeof raw.b !== "number"
  ) {
    throw new Error(`matches.${field}: malformed counts`);
  }
  return { a: raw.a, b: raw.b };
}

export function mapMatchRow(row: MatchRowJoined): MatchView {
  if (!isSportId(row.sport)) {
    throw new Error(`matches.sport: unknown sport "${row.sport}"`);
  }
  return {
    id: row.id,
    sport: row.sport,
    bestOf: row.best_of,
    pointsToWin: row.points_to_win,
    periodMinutes: row.period_minutes,
    fouls: parseCounts(row.fouls, "fouls"),
    periodStartedSeconds: row.period_started_seconds,
    shotClockTeam: row.shot_clock_team as TeamKey | null,
    shotClockEndsAt: row.shot_clock_ends_at,
    shotClockRemaining: row.shot_clock_remaining,
    players: mapPlayers(row.players ?? []),
    timeouts: parseCounts(row.timeouts, "timeouts"),
    lastPlayerFoul: parseLastFoul(row.last_player_foul),
    status: row.status,
    houseA: {
      key: houseKeyFromId(row.house_a),
      nameEn: row.house_a_info.name_en,
      nameTh: row.house_a_info.name_th,
    },
    houseB: {
      key: houseKeyFromId(row.house_b),
      nameEn: row.house_b_info.name_en,
      nameTh: row.house_b_info.name_th,
    },
    sets: parseSets(row.sets),
    currentSet: row.current_set,
    serving: row.serving as TeamKey,
    winner:
      row.winner_house_id === null
        ? null
        : row.winner_house_id === row.house_a
          ? "a"
          : "b",
    venue: row.venue,
    roundLabel: row.round_label,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    timerSeconds: row.timer_seconds,
    timerStartedAt: row.timer_started_at,
    clockStopped: row.clock_stopped,
    version: row.version,
    lastScoreEventId: row.last_score_event_id,
    canUndo: row.last_score_event_id !== null,
  };
}

export async function getMatchById(id: string): Promise<MatchView | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("matches")
    .select(MATCH_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getMatchById: ${error.message}`);
  return data ? mapMatchRow(data) : null;
}

/**
 * What the hall display shows, in priority order: the live/paused match, else
 * a match finished within the last 60s (the board holds the result ~30s), else
 * the next scheduled match, else null → IDLE holding screen.
 */
export async function getDisplayMatch(): Promise<MatchView | null> {
  const db = await createClient();

  const live = await db
    .from("matches")
    .select(MATCH_SELECT)
    .in("status", ["live", "paused"])
    .limit(1)
    .maybeSingle();
  if (live.error) throw new Error(`getDisplayMatch: ${live.error.message}`);
  if (live.data) return mapMatchRow(live.data);

  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const finished = await db
    .from("matches")
    .select(MATCH_SELECT)
    .eq("status", "finished")
    .gte("ended_at", cutoff)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (finished.error) {
    throw new Error(`getDisplayMatch: ${finished.error.message}`);
  }
  if (finished.data) return mapMatchRow(finished.data);

  const next = await db
    .from("matches")
    .select(MATCH_SELECT)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (next.error) throw new Error(`getDisplayMatch: ${next.error.message}`);
  return next.data ? mapMatchRow(next.data) : null;
}

/** The match the admin console operates on: live/paused, else next scheduled. */
export async function getAdminActiveMatch(): Promise<MatchView | null> {
  const db = await createClient();

  const live = await db
    .from("matches")
    .select(MATCH_SELECT)
    .in("status", ["live", "paused"])
    .limit(1)
    .maybeSingle();
  if (live.error) {
    throw new Error(`getAdminActiveMatch: ${live.error.message}`);
  }
  if (live.data) return mapMatchRow(live.data);

  const next = await db
    .from("matches")
    .select(MATCH_SELECT)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (next.error) {
    throw new Error(`getAdminActiveMatch: ${next.error.message}`);
  }
  return next.data ? mapMatchRow(next.data) : null;
}

export async function getMatchHistory(filters?: {
  houseId?: number;
  sport?: string;
  dateISO?: string;
  limit?: number;
}): Promise<MatchView[]> {
  const db = await createClient();
  let q = db
    .from("matches")
    .select(MATCH_SELECT)
    .eq("status", "finished")
    .order("ended_at", { ascending: false });

  if (filters?.houseId !== undefined) {
    q = q.or(`house_a.eq.${filters.houseId},house_b.eq.${filters.houseId}`);
  }
  if (filters?.sport) q = q.eq("sport", filters.sport);
  if (filters?.dateISO) {
    const { start, next } = dayRange(filters.dateISO);
    q = q.gte("ended_at", start).lt("ended_at", next);
  }
  if (filters?.limit !== undefined) q = q.limit(filters.limit);

  const { data, error } = await q;
  if (error) throw new Error(`getMatchHistory: ${error.message}`);
  return (data ?? []).map(mapMatchRow);
}

/** Hall-board mode; a missing row (migration not yet applied) means "match". */
export async function getDisplayMode(): Promise<DisplayMode> {
  const db = await createClient();
  const { data, error } = await db
    .from("site_config")
    .select("value")
    .eq("key", DISPLAY_MODE_KEY)
    .maybeSingle();
  if (error) throw new Error(`getDisplayMode: ${error.message}`);
  return parseDisplayMode(data?.value);
}
