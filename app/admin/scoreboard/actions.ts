"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getMatchById } from "@/lib/queries/matches";
import { KEY_BY_HOUSE_ID } from "@/lib/queries/util";
import type { Json } from "@/lib/supabase/database.types";
import type { MatchStatus, MatchView } from "@/lib/types";
import {
  applyFoul,
  applyPoint,
  endCurrentPeriod,
  formatOf,
  formatOfMatch,
  initialState,
  isFouledOut,
  isSportId,
  isTimed,
  resetFouls,
  isValidFormat,
  leaderForEarlyEnd,
  SPORTS,
  ON_COURT_MAX,
  ROSTER_MAX,
  stateOfMatch,
  type PointDelta,
  type ScoreState,
  type TeamKey,
} from "@/lib/sport/rules";

// Convention deviation, on purpose: the live console calls these actions from
// client button handlers and needs structured results to reconcile/roll back
// its optimistic state — the <form action> void-return shape doesn't fit a
// button console. Create/cancel below keep the standard form convention.
export type MatchActionResult =
  | { ok: true; match: MatchView }
  | { ok: false; error: string };

type MatchEventType =
  | "start"
  | "pause"
  | "resume"
  | "score"
  | "foul"
  | "end_set"
  | "undo"
  | "finish"
  | "clock_stop"
  | "clock_start"
  | "foul_reset";

type PlayerCredit = { id: string; points: number; fouls: number };

type ComputedEvent = {
  type: MatchEventType;
  payload: Json;
  state: ScoreState;
  status: MatchStatus;
  winnerHouseId: number | null;
  /** Optional per-player credit applied atomically with the event. */
  player?: PlayerCredit;
};

type Computed =
  | { apply: ComputedEvent }
  | { noop: true } // valid tap with nothing to write (e.g. −1 at 0)
  | { error: string };

const HOUSE_ID_BY_KEY = Object.fromEntries(
  Object.entries(KEY_BY_HOUSE_ID).map(([id, key]) => [key, Number(id)]),
) as Record<string, number>;

const stateOf = stateOfMatch;

function winnerIdOf(m: MatchView, team: TeamKey): number {
  return HOUSE_ID_BY_KEY[team === "a" ? m.houseA.key : m.houseB.key];
}

function revalidateSurfaces() {
  revalidatePath("/scoreboard");
  revalidatePath("/admin/scoreboard");
  revalidatePath("/console/match");
  revalidatePath("/console/history");
  revalidatePath("/console/display");
  revalidatePath("/student/sport");
}

// Both admin UIs share these form actions; the form says where to land after.
const RETURN_PATHS = ["/admin/scoreboard", "/console/match"] as const;
function returnPath(formData: FormData): string {
  const v = String(formData.get("return_to") ?? "");
  return (RETURN_PATHS as readonly string[]).includes(v)
    ? v
    : "/admin/scoreboard";
}

/**
 * Read fresh state → compute the transition → apply atomically via the
 * apply_match_event RPC (row lock + idempotent event id + version token).
 * A version conflict means another admin wrote between our read and write:
 * refetch and recompute once — the intent ("one more point for A") is applied
 * on top of their change, so both taps count exactly once.
 */
async function applyEvent(
  matchId: string,
  eventId: string,
  compute: (m: MatchView) => Computed,
): Promise<MatchActionResult> {
  await requireAdmin();
  const db = await createClient();

  for (let attempt = 0; attempt < 2; attempt++) {
    const match = await getMatchById(matchId);
    if (!match) return { ok: false, error: "Match not found" };

    const computed = compute(match);
    if ("error" in computed) return { ok: false, error: computed.error };
    if ("noop" in computed) return { ok: true, match };

    const { apply } = computed;
    const { error } = await db.rpc("apply_match_event", {
      p_match_id: matchId,
      p_event_id: eventId,
      p_expected_version: match.version,
      p_type: apply.type,
      p_payload: apply.payload,
      p_sets: apply.state.sets as unknown as Json,
      p_current_set: apply.state.currentSet,
      p_serving: apply.state.serving,
      p_fouls: apply.state.fouls as unknown as Json,
      p_status: apply.status,
      // Postgres arg nullability isn't expressed in the generated types.
      p_winner_house_id: apply.winnerHouseId as unknown as number,
      p_player_id: (apply.player?.id ?? null) as unknown as string,
      p_player_points: apply.player?.points ?? 0,
      p_player_fouls: apply.player?.fouls ?? 0,
    });

    if (!error) {
      revalidateSurfaces();
      const fresh = await getMatchById(matchId);
      return fresh
        ? { ok: true, match: fresh }
        : { ok: false, error: "Match disappeared" };
    }
    if (error.message.includes("version_conflict") && attempt === 0) continue;
    if (error.message.includes("version_conflict")) {
      return { ok: false, error: "Out of sync — try again" };
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Out of sync — try again" };
}

function serializeState(s: ScoreState): Json {
  return s as unknown as Json;
}

export async function startMatch(
  matchId: string,
  eventId: string,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "scheduled") {
      return { error: "Match has already started" };
    }
    return {
      apply: {
        type: "start",
        payload: {},
        state: initialState(),
        status: "live",
        winnerHouseId: null,
      },
    };
  });
}

export async function pauseMatch(
  matchId: string,
  eventId: string,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "live") return { error: "Match is not live" };
    return {
      apply: {
        type: "pause",
        payload: {},
        state: stateOf(m),
        status: "paused",
        winnerHouseId: null,
      },
    };
  });
}

/** Dead-ball clock stop: hold the clock without leaving `live`. */
export async function stopClock(
  matchId: string,
  eventId: string,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m): Computed => {
    if (m.status !== "live") return { error: "Match is not live" };
    if (m.clockStopped) return { noop: true };
    return {
      apply: {
        type: "clock_stop",
        payload: {},
        state: stateOf(m),
        status: "live",
        winnerHouseId: null,
      },
    };
  });
}

export async function startClock(
  matchId: string,
  eventId: string,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m): Computed => {
    if (m.status !== "live") return { error: "Match is not live" };
    if (!m.clockStopped) return { noop: true };
    return {
      apply: {
        type: "clock_start",
        payload: {},
        state: stateOf(m),
        status: "live",
        winnerHouseId: null,
      },
    };
  });
}

export async function resumeMatch(
  matchId: string,
  eventId: string,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "paused") return { error: "Match is not paused" };
    return {
      apply: {
        type: "resume",
        payload: {},
        state: stateOf(m),
        status: "live",
        winnerHouseId: null,
      },
    };
  });
}

export async function scorePoint(
  matchId: string,
  eventId: string,
  team: TeamKey,
  delta: PointDelta,
  playerId?: string,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "live") return { error: "Match is not live" };
    const before = stateOf(m);
    const result = applyPoint(before, team, delta);
    // Floor taps (−1 at 0) are silent no-ops.
    if (!result.ok) return { noop: true };
    // Timed sports: every point belongs to a player (team score is derived).
    if (isTimed(SPORTS[m.sport]) && !playerId) {
      return { error: "Pick a player — points are credited per player" };
    }
    const player = playerId
      ? m.players.find((p) => p.id === playerId && p.team === team)
      : undefined;
    if (playerId && !player) return { error: "Player not on this team" };
    // A −1 correction on a player with 0 points is a silent no-op.
    if (player && delta < 0 && player.points === 0) return { noop: true };
    return {
      apply: {
        type: "score",
        payload: {
          team,
          delta,
          playerId: player?.id ?? null,
          before: serializeState(before),
          after: serializeState(result.state),
        },
        state: result.state,
        status: "live",
        winnerHouseId: null,
        player: player ? { id: player.id, points: delta, fouls: 0 } : undefined,
      },
    };
  });
}

export async function recordFoul(
  matchId: string,
  eventId: string,
  team: TeamKey,
  delta: 1 | -1,
  playerId?: string,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "live") return { error: "Match is not live" };
    if (!isTimed(SPORTS[m.sport])) {
      return { error: "This sport has no team fouls" };
    }
    const before = stateOf(m);
    const result = applyFoul(before, team, delta);
    // Floor taps (−1 at 0) are silent no-ops.
    if (!result.ok) return { noop: true };
    // Team fouls are derived: every foul belongs to a player.
    if (!playerId) {
      return { error: "Pick a player — team fouls come from player fouls" };
    }
    const player = m.players.find((p) => p.id === playerId && p.team === team);
    if (!player) return { error: "Player not on this team" };
    if (delta > 0 && isFouledOut(player)) {
      return { error: `#${player.number} has fouled out` };
    }
    if (delta < 0 && player.fouls === 0) return { noop: true };
    return {
      apply: {
        type: "foul",
        payload: {
          team,
          delta,
          playerId: player?.id ?? null,
          before: serializeState(before),
          after: serializeState(result.state),
        },
        state: result.state,
        status: "live",
        winnerHouseId: null,
        player: { id: player.id, points: 0, fouls: delta },
      },
    };
  });
}

/** Zero one team's foul count; per-player fouls are left untouched. */
export async function resetTeamFouls(
  matchId: string,
  eventId: string,
  team: TeamKey,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m): Computed => {
    if (!isTimed(SPORTS[m.sport])) {
      return { error: "This sport has no team fouls" };
    }
    if (m.status !== "live" && m.status !== "paused") {
      return { error: "Match is not in play" };
    }
    const state = stateOf(m);
    if (state.fouls[team] === 0) return { noop: true };
    return {
      apply: {
        type: "foul_reset",
        payload: { team, before: state.fouls[team] },
        state: resetFouls(state, team),
        status: m.status,
        winnerHouseId: null,
      },
    };
  });
}

export async function undoLast(
  matchId: string,
  eventId: string,
): Promise<MatchActionResult> {
  await requireAdmin();
  const db = await createClient();

  // The undo snapshot lives in the event row, outside MatchView — read it
  // here, then have compute() verify the target is still the latest score
  // event (a concurrent admin's point would move it and trip the check).
  const current = await getMatchById(matchId);
  if (!current) return { ok: false, error: "Match not found" };
  if (!current.lastScoreEventId) return { ok: false, error: "Nothing to undo" };

  const { data: event, error: eventError } = await db
    .from("match_events")
    .select("id, type, payload")
    .eq("id", current.lastScoreEventId)
    .single();
  if (eventError) return { ok: false, error: eventError.message };

  const payload = event.payload as {
    before?: Partial<ScoreState>;
    periodStartedSecondsBefore?: number;
    playerId?: string | null;
    delta?: number;
  };
  const before = payload.before;
  if (!before) return { ok: false, error: "Missing undo snapshot" };

  // Reverse the player credit of a score/foul event, if it had one.
  let player: PlayerCredit | undefined;
  if (
    typeof payload.playerId === "string" &&
    typeof payload.delta === "number"
  ) {
    player =
      event.type === "score"
        ? { id: payload.playerId, points: -payload.delta, fouls: 0 }
        : event.type === "foul"
          ? { id: payload.playerId, points: 0, fouls: -payload.delta }
          : undefined;
  }

  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "live" && m.status !== "paused") {
      return { error: "Match is not in play" };
    }
    if (m.lastScoreEventId !== event.id) {
      return { error: "Score changed — check before undoing again" };
    }
    // Snapshots written before migration 0014 carry no fouls.
    const restored: ScoreState = {
      sets: before.sets ?? m.sets,
      currentSet: before.currentSet ?? m.currentSet,
      serving: before.serving ?? m.serving,
      fouls: before.fouls ?? m.fouls,
    };
    const undoPayload: Record<string, Json> = {
      undoneEventId: event.id,
      before: serializeState(stateOf(m)),
      after: serializeState(restored),
    };
    if (player) {
      undoPayload.playerId = player.id;
      undoPayload.playerPoints = player.points;
      undoPayload.playerFouls = player.fouls;
    }
    // Undoing a period ending also rewinds the countdown offset.
    if (
      event.type === "end_set" &&
      typeof payload.periodStartedSecondsBefore === "number"
    ) {
      undoPayload.periodStartedSeconds = payload.periodStartedSecondsBefore;
    }
    return {
      apply: {
        type: "undo",
        payload: undoPayload,
        state: restored,
        status: m.status,
        winnerHouseId: null,
        player,
      },
    };
  });
}

export async function endSet(
  matchId: string,
  eventId: string,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "live") return { error: "Match is not live" };
    const config = SPORTS[m.sport];
    const before = stateOf(m);
    const result = endCurrentPeriod(config, formatOfMatch(m), before);
    if (!result.ok) {
      if (result.reason === "tied") {
        return { error: "Set is tied — score a point before ending it" };
      }
      return {
        error: isTimed(config)
          ? "Final period is decided — end the competition instead"
          : "Final set — end the competition instead",
      };
    }
    return {
      apply: {
        type: "end_set",
        payload: {
          setWonBy: result.setWonBy,
          overtime: result.overtime,
          periodStartedSecondsBefore: m.periodStartedSeconds,
          before: serializeState(before),
          after: serializeState(result.state),
        },
        state: result.state,
        // Timed sports stop the clock between periods; the admin starts the
        // next one with Resume ("Start Q2").
        status: isTimed(config) ? "paused" : "live",
        winnerHouseId: null,
      },
    };
  });
}

export async function endMatch(
  matchId: string,
  eventId: string,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "live" && m.status !== "paused") {
      return { error: "Match is not in play" };
    }
    const state = stateOf(m);
    const winner = leaderForEarlyEnd(SPORTS[m.sport], state);
    if (!winner) {
      return { error: "Scores are level — play on before ending" };
    }
    return {
      apply: {
        type: "finish",
        payload: {},
        state,
        status: "finished",
        winnerHouseId: winnerIdOf(m, winner),
      },
    };
  });
}

/**
 * Shot clock: not an event (resets are frequent, not score history) — goes
 * straight through the set_shot_clock RPC, which stamps Postgres now().
 * seconds null clears it.
 */
export async function setShotClock(
  matchId: string,
  team: TeamKey,
  seconds: number | null,
): Promise<MatchActionResult> {
  await requireAdmin();
  const db = await createClient();
  const match = await getMatchById(matchId);
  if (!match) return { ok: false, error: "Match not found" };
  if (!isTimed(SPORTS[match.sport])) {
    return { ok: false, error: "This sport has no shot clock" };
  }
  if (match.status !== "live" && match.status !== "paused") {
    return { ok: false, error: "Match is not in play" };
  }
  const { error } = await db.rpc("set_shot_clock", {
    p_match_id: matchId,
    p_team: team,
    // Postgres arg nullability isn't expressed in the generated types.
    p_seconds: seconds as unknown as number,
  });
  if (error) return { ok: false, error: error.message };
  revalidateSurfaces();
  const fresh = await getMatchById(matchId);
  return fresh
    ? { ok: true, match: fresh }
    : { ok: false, error: "Match disappeared" };
}

/* ------------------------------------------------------------------ */
/* Roster & timeouts — plain admin writes (not events)                 */
/* ------------------------------------------------------------------ */

async function freshMatch(matchId: string): Promise<MatchActionResult> {
  revalidateSurfaces();
  const fresh = await getMatchById(matchId);
  return fresh
    ? { ok: true, match: fresh }
    : { ok: false, error: "Match disappeared" };
}

export async function addPlayer(
  matchId: string,
  team: TeamKey,
  number: number,
): Promise<MatchActionResult> {
  await requireAdmin();
  const match = await getMatchById(matchId);
  if (!match) return { ok: false, error: "Match not found" };
  if (!isTimed(SPORTS[match.sport])) {
    return { ok: false, error: "This sport has no roster" };
  }
  if (!Number.isInteger(number) || number < 0 || number > 99) {
    return { ok: false, error: "Jersey number must be 0–99" };
  }
  if (match.players.filter((p) => p.team === team).length >= ROSTER_MAX) {
    return { ok: false, error: `Roster is full (${ROSTER_MAX})` };
  }
  if (match.players.some((p) => p.team === team && p.number === number)) {
    return { ok: false, error: `#${number} is already on this team` };
  }
  const db = await createClient();
  const { error } = await db.from("match_players").insert({
    match_id: matchId,
    team,
    number,
    // First five join the court automatically.
    on_court:
      match.players.filter((p) => p.team === team && p.onCourt).length <
      ON_COURT_MAX,
  });
  if (error) return { ok: false, error: error.message };
  return freshMatch(matchId);
}

export async function removePlayer(
  matchId: string,
  playerId: string,
): Promise<MatchActionResult> {
  await requireAdmin();
  const db = await createClient();
  const { error } = await db
    .from("match_players")
    .delete()
    .eq("id", playerId)
    .eq("match_id", matchId);
  if (error) return { ok: false, error: error.message };
  return freshMatch(matchId);
}

export async function setOnCourt(
  matchId: string,
  playerId: string,
  onCourt: boolean,
): Promise<MatchActionResult> {
  await requireAdmin();
  const match = await getMatchById(matchId);
  if (!match) return { ok: false, error: "Match not found" };
  const player = match.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "Player not found" };
  if (
    onCourt &&
    match.players.filter((p) => p.team === player.team && p.onCourt).length >=
      ON_COURT_MAX
  ) {
    return { ok: false, error: `Only ${ON_COURT_MAX} players on court` };
  }
  const db = await createClient();
  const { error } = await db
    .from("match_players")
    .update({ on_court: onCourt })
    .eq("id", playerId)
    .eq("match_id", matchId);
  if (error) return { ok: false, error: error.message };
  return freshMatch(matchId);
}

export async function setTimeouts(
  matchId: string,
  team: TeamKey,
  value: number,
): Promise<MatchActionResult> {
  await requireAdmin();
  if (!Number.isInteger(value) || value < 0 || value > 9) {
    return { ok: false, error: "Timeouts must be 0–9" };
  }
  const match = await getMatchById(matchId);
  if (!match) return { ok: false, error: "Match not found" };
  if (!isTimed(SPORTS[match.sport])) {
    return { ok: false, error: "This sport has no timeouts" };
  }
  const db = await createClient();
  const { error } = await db
    .from("matches")
    .update({ timeouts: { ...match.timeouts, [team]: value } })
    .eq("id", matchId);
  if (error) return { ok: false, error: error.message };
  return freshMatch(matchId);
}

/* ------------------------------------------------------------------ */
/* Create / cancel — standard form-action convention                   */
/* ------------------------------------------------------------------ */

export async function createMatch(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const sport = String(formData.get("sport") ?? "");
  const houseA = Number(formData.get("house_a") ?? "");
  const houseB = Number(formData.get("house_b") ?? "");
  const venue = String(formData.get("venue") ?? "").trim();
  const roundLabel = String(formData.get("round_label") ?? "").trim();
  const scheduledRaw = String(formData.get("scheduled_at") ?? "").trim();

  if (!isSportId(sport)) return;
  const config = SPORTS[sport];
  const defaults = formatOf(config);
  const bestOf = Number(formData.get("best_of") ?? defaults.bestOf);
  // Timed sports have no points target; set sports have no period length.
  const pointsToWin = isTimed(config)
    ? defaults.pointsToWin
    : Number(formData.get("points_to_win") ?? "");
  const periodMinutes = isTimed(config)
    ? Number(formData.get("period_minutes") ?? "")
    : null;
  if (![1, 2, 3, 4].includes(houseA) || ![1, 2, 3, 4].includes(houseB)) return;
  if (houseA === houseB) return;
  if (!isValidFormat(config.kind, { bestOf, pointsToWin, periodMinutes })) {
    return;
  }
  // datetime-local has no zone; school events are Asia/Bangkok.
  const scheduledAt = scheduledRaw ? `${scheduledRaw}:00+07:00` : null;

  const db = await createClient();
  const { error } = await db.from("matches").insert({
    sport,
    house_a: houseA,
    house_b: houseB,
    best_of: bestOf,
    points_to_win: pointsToWin,
    period_minutes: periodMinutes,
    venue: venue || null,
    round_label: roundLabel || null,
    scheduled_at: scheduledAt,
    created_by_admin_id: admin.id,
  });
  if (error) throw new Error(error.message);

  revalidateSurfaces();
  redirect(returnPath(formData));
}

export async function deleteMatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  // History cleanup only: live/scheduled matches are protected (cancel or end
  // them first). match_events rows go with the match via ON DELETE CASCADE.
  const { error } = await db
    .from("matches")
    .delete()
    .eq("id", id)
    .in("status", ["finished", "cancelled"]);
  if (error) throw new Error(error.message);

  revalidateSurfaces();
}

export async function cancelMatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await createClient();
  const { error } = await db
    .from("matches")
    .update({ status: "cancelled", ended_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "scheduled"); // cancel only before start
  if (error) throw new Error(error.message);

  revalidateSurfaces();
  redirect(returnPath(formData));
}
