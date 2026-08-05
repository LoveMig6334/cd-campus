// Pure scoring engine for live matches. Shared by server actions (authoritative
// state transitions) and the admin console (optimistic prediction) — keep it
// dependency-free and side-effect-free.
//
// Sets are ADMIN-CONTROLLED: the target score is advisory (it drives the
// deuce/set-point hints), and a set only ends when the admin sends end_set.
// The per-match format (best-of, points) is chosen at creation; the sport
// contributes labels, the serving rule, and defaults.

export type TeamKey = "a" | "b";
export type SetScore = { a: number; b: number };

export type ScoreState = {
  /** All sets, current set last. Sets before the current one are completed. */
  sets: SetScore[];
  /** 1-based; always === sets.length. */
  currentSet: number;
  serving: TeamKey;
};

/** Per-match format, chosen by the admin when the match is created. */
export type MatchFormat = {
  /** Odd, 1–9. Caps the number of sets and sizes the display strip. */
  bestOf: number;
  /** Advisory target per set — powers hints, never auto-ends anything. */
  pointsToWin: number;
};

export type SportId = "volleyball" | "badminton";

export type SportConfig = {
  id: SportId;
  labelEn: string;
  labelTh: string;
  /** Who serves first in the next set. Set 1 always starts with team A. */
  nextSetFirstServer: "alternate" | "prevSetWinner";
  defaultBestOf: number;
  defaultPointsToWin: number;
};

export const SPORTS: Record<SportId, SportConfig> = {
  volleyball: {
    id: "volleyball",
    labelEn: "Volleyball",
    labelTh: "วอลเลย์บอล",
    nextSetFirstServer: "alternate",
    defaultBestOf: 3,
    defaultPointsToWin: 15,
  },
  badminton: {
    id: "badminton",
    labelEn: "Badminton",
    labelTh: "แบดมินตัน",
    nextSetFirstServer: "prevSetWinner",
    defaultBestOf: 3,
    defaultPointsToWin: 15,
  },
};

export function isSportId(v: string): v is SportId {
  return v in SPORTS;
}

export const BEST_OF_CHOICES = [1, 3, 5] as const;

export function isValidFormat(f: MatchFormat): boolean {
  return (
    Number.isInteger(f.bestOf) &&
    f.bestOf >= 1 &&
    f.bestOf <= 9 &&
    f.bestOf % 2 === 1 &&
    Number.isInteger(f.pointsToWin) &&
    f.pointsToWin >= 1 &&
    f.pointsToWin <= 99
  );
}

export function initialState(): ScoreState {
  return { sets: [{ a: 0, b: 0 }], currentSet: 1, serving: "a" };
}

/** Sets needed for an (advisory) match win, e.g. 2 for best-of-3. */
export function setsToWin(format: MatchFormat): number {
  return Math.floor(format.bestOf / 2) + 1;
}

function opposite(team: TeamKey): TeamKey {
  return team === "a" ? "b" : "a";
}

/** Winner of a completed (admin-closed) set: whoever leads. Null if tied. */
export function completedSetWinner(set: SetScore): TeamKey | null {
  if (set.a === set.b) return null;
  return set.a > set.b ? "a" : "b";
}

/**
 * Sets won so far. Only admin-closed sets count; pass includeCurrent for a
 * finished match, where the last set is closed by the finish itself.
 */
export function setsWon(
  state: ScoreState,
  includeCurrent = false,
): { a: number; b: number } {
  const won = { a: 0, b: 0 };
  const upto = includeCurrent ? state.sets.length : state.currentSet - 1;
  for (let i = 0; i < upto; i++) {
    const winner = completedSetWinner(state.sets[i]);
    if (winner) won[winner] += 1;
  }
  return won;
}

/** Advisory: a team already holds the set majority — suggest ending. */
export function matchWinner(
  format: MatchFormat,
  state: ScoreState,
  includeCurrent = false,
): TeamKey | null {
  const won = setsWon(state, includeCurrent);
  const needed = setsToWin(format);
  if (won.a >= needed) return "a";
  if (won.b >= needed) return "b";
  return null;
}

export type ScoreFlags = {
  deuce: boolean;
  setPoint: TeamKey | null;
  matchPoint: TeamKey | null;
};

/** Advisory hints against the per-match target — never enforced. */
export function deriveFlags(
  format: MatchFormat,
  state: ScoreState,
): ScoreFlags {
  const set = state.sets[state.currentSet - 1];
  const target = format.pointsToWin;
  const won = setsWon(state);
  const needed = setsToWin(format);

  const deuce = set.a === set.b && set.a >= target - 1;

  let setPoint: TeamKey | null = null;
  let matchPoint: TeamKey | null = null;
  for (const team of ["a", "b"] as const) {
    if (set[team] >= target - 1 && set[team] > set[opposite(team)]) {
      setPoint = team;
      if (won[team] === needed - 1) matchPoint = team;
    }
  }
  return { deuce, setPoint, matchPoint };
}

/** First server of the given 1-based set — fully derived, set 1 is team A. */
export function firstServerOfSet(
  rule: SportConfig["nextSetFirstServer"],
  sets: SetScore[],
  setIndex: number,
): TeamKey {
  if (setIndex === 1) return "a";
  if (rule === "alternate") {
    return setIndex % 2 === 1 ? "a" : "b";
  }
  return completedSetWinner(sets[setIndex - 2]) ?? "a";
}

export type ApplyResult =
  | { ok: true; state: ScoreState }
  | { ok: false; reason: "floor" };

/**
 * +1: rally point — the scorer serves next. −1 is a manual correction on the
 * current set: floored at 0 and serving left unchanged. Nothing here ends a
 * set or a match; that is the admin's call (endCurrentSet / finish).
 */
export function applyPoint(
  state: ScoreState,
  team: TeamKey,
  delta: 1 | -1,
): ApplyResult {
  const idx = state.currentSet;
  const set = state.sets[idx - 1];
  if (delta === -1 && set[team] === 0) {
    return { ok: false, reason: "floor" };
  }

  const nextSet: SetScore = { ...set, [team]: set[team] + delta };
  const sets = [...state.sets.slice(0, idx - 1), nextSet];
  return {
    ok: true,
    state: {
      sets,
      currentSet: idx,
      serving: delta === 1 ? team : state.serving,
    },
  };
}

export type EndSetResult =
  | { ok: true; state: ScoreState; setWonBy: TeamKey }
  | { ok: false; reason: "tied" | "last_set" };

/**
 * Admin-triggered set ending: records the leader as the set winner and opens
 * the next set (first server per sport rule). Rejected when the score is tied
 * or the match is already on its final possible set — the admin ends the
 * competition instead.
 */
export function endCurrentSet(
  rule: SportConfig["nextSetFirstServer"],
  format: MatchFormat,
  state: ScoreState,
): EndSetResult {
  const set = state.sets[state.currentSet - 1];
  const setWonBy = completedSetWinner(set);
  if (!setWonBy) return { ok: false, reason: "tied" };
  if (state.currentSet >= format.bestOf) {
    return { ok: false, reason: "last_set" };
  }

  const nextIdx = state.currentSet + 1;
  return {
    ok: true,
    setWonBy,
    state: {
      sets: [...state.sets, { a: 0, b: 0 }],
      currentSet: nextIdx,
      serving: firstServerOfSet(rule, state.sets, nextIdx),
    },
  };
}

/**
 * Winner to record when the admin ends the competition: completed-sets leader,
 * then current-set points leader, null when perfectly tied (end disabled).
 */
export function leaderForEarlyEnd(state: ScoreState): TeamKey | null {
  const won = setsWon(state);
  if (won.a !== won.b) return won.a > won.b ? "a" : "b";
  const set = state.sets[state.currentSet - 1];
  return completedSetWinner(set);
}
