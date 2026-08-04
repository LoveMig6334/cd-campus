// Pure scoring engine for live matches. Shared by server actions (authoritative
// state transitions) and the admin console (optimistic prediction) — keep it
// dependency-free and side-effect-free.

export type TeamKey = "a" | "b";
export type SetScore = { a: number; b: number };

export type ScoreState = {
  /** All sets, current set last. Completed sets stay in place. */
  sets: SetScore[];
  /** 1-based; always === sets.length. */
  currentSet: number;
  serving: TeamKey;
};

export type SportId = "volleyball" | "badminton";

export type SportConfig = {
  id: SportId;
  labelEn: string;
  labelTh: string;
  bestOf: 3 | 5;
  pointsToWin: number;
  /** Deciding set plays to a lower target (volleyball: 15). */
  finalSetPointsToWin?: number;
  winBy: number;
  /** First to cap wins regardless of margin (badminton: 30). */
  cap?: number;
  /** Who serves first in set n+1. Set 1 always starts with team A. */
  nextSetFirstServer: "alternate" | "prevSetWinner";
};

export const SPORTS: Record<SportId, SportConfig> = {
  volleyball: {
    id: "volleyball",
    labelEn: "Volleyball",
    labelTh: "วอลเลย์บอล",
    bestOf: 5,
    pointsToWin: 25,
    finalSetPointsToWin: 15,
    winBy: 2,
    nextSetFirstServer: "alternate",
  },
  badminton: {
    id: "badminton",
    labelEn: "Badminton",
    labelTh: "แบดมินตัน",
    bestOf: 3,
    pointsToWin: 21,
    winBy: 2,
    cap: 30,
    nextSetFirstServer: "prevSetWinner",
  },
};

export function isSportId(v: string): v is SportId {
  return v in SPORTS;
}

export function initialState(): ScoreState {
  return { sets: [{ a: 0, b: 0 }], currentSet: 1, serving: "a" };
}

export function setsToWin(config: SportConfig): number {
  return (config.bestOf + 1) / 2;
}

function opposite(team: TeamKey): TeamKey {
  return team === "a" ? "b" : "a";
}

/** Points target for the given 1-based set index. */
export function setTarget(config: SportConfig, setIndex: number): number {
  return setIndex === config.bestOf && config.finalSetPointsToWin !== undefined
    ? config.finalSetPointsToWin
    : config.pointsToWin;
}

/** Winner of a set, or null while it is still in play. setIndex is 1-based. */
export function setWinner(
  config: SportConfig,
  set: SetScore,
  setIndex: number,
): TeamKey | null {
  const target = setTarget(config, setIndex);
  for (const team of ["a", "b"] as const) {
    const us = set[team];
    const them = set[opposite(team)];
    if (us >= target && us - them >= config.winBy) return team;
    if (config.cap !== undefined && us === config.cap && us > them) return team;
  }
  return null;
}

export function setsWon(
  config: SportConfig,
  state: ScoreState,
): { a: number; b: number } {
  const won = { a: 0, b: 0 };
  state.sets.forEach((set, i) => {
    const winner = setWinner(config, set, i + 1);
    if (winner) won[winner] += 1;
  });
  return won;
}

export function matchWinner(
  config: SportConfig,
  state: ScoreState,
): TeamKey | null {
  const won = setsWon(config, state);
  const needed = setsToWin(config);
  if (won.a >= needed) return "a";
  if (won.b >= needed) return "b";
  return null;
}

export type ScoreFlags = {
  deuce: boolean;
  setPoint: TeamKey | null;
  matchPoint: TeamKey | null;
};

/** Derived per-render — deuce/set point/match point are never stored. */
export function deriveFlags(
  config: SportConfig,
  state: ScoreState,
): ScoreFlags {
  const idx = state.currentSet;
  const set = state.sets[idx - 1];
  const target = setTarget(config, idx);
  const won = setsWon(config, state);
  const needed = setsToWin(config);

  const deuce =
    set.a === set.b &&
    set.a >= target - 1 &&
    setWinner(config, set, idx) === null;

  let setPoint: TeamKey | null = null;
  let matchPoint: TeamKey | null = null;
  if (setWinner(config, set, idx) === null) {
    for (const team of ["a", "b"] as const) {
      const next: SetScore = { ...set, [team]: set[team] + 1 };
      if (setWinner(config, next, idx) === team) {
        setPoint = team;
        if (won[team] === needed - 1) matchPoint = team;
      }
    }
  }
  return { deuce, setPoint, matchPoint };
}

/** First server of the given 1-based set — fully derived, set 1 is team A. */
export function firstServerOfSet(
  config: SportConfig,
  sets: SetScore[],
  setIndex: number,
): TeamKey {
  if (setIndex === 1) return "a";
  if (config.nextSetFirstServer === "alternate") {
    return setIndex % 2 === 1 ? "a" : "b";
  }
  return setWinner(config, sets[setIndex - 2], setIndex - 1) ?? "a";
}

export type ApplyResult =
  | {
      ok: true;
      state: ScoreState;
      setJustWon: TeamKey | null;
      matchWon: TeamKey | null;
    }
  | { ok: false; reason: "match_over" | "floor" | "set_locked" };

/**
 * +1: rally point — the scorer serves next; when the point closes the set a
 * fresh 0–0 set is appended (unless it also closes the match). −1 is a manual
 * correction on the current set only: floored at 0, cannot reopen a completed
 * set (that is undo's job via event snapshots), and leaves serving unchanged.
 */
export function applyPoint(
  config: SportConfig,
  state: ScoreState,
  team: TeamKey,
  delta: 1 | -1,
): ApplyResult {
  if (matchWinner(config, state) !== null) {
    return { ok: false, reason: "match_over" };
  }
  const idx = state.currentSet;
  const set = state.sets[idx - 1];
  if (setWinner(config, set, idx) !== null) {
    return { ok: false, reason: "set_locked" };
  }
  if (delta === -1 && set[team] === 0) {
    return { ok: false, reason: "floor" };
  }

  const nextSet: SetScore = { ...set, [team]: set[team] + delta };
  const sets = [...state.sets.slice(0, idx - 1), nextSet];

  if (delta === -1) {
    return {
      ok: true,
      state: { sets, currentSet: idx, serving: state.serving },
      setJustWon: null,
      matchWon: null,
    };
  }

  const setJustWon = setWinner(config, nextSet, idx);
  if (setJustWon === null) {
    return {
      ok: true,
      state: { sets, currentSet: idx, serving: team },
      setJustWon: null,
      matchWon: null,
    };
  }

  const afterSet: ScoreState = { sets, currentSet: idx, serving: team };
  const matchWon = matchWinner(config, afterSet);
  if (matchWon !== null) {
    return { ok: true, state: afterSet, setJustWon, matchWon };
  }

  const nextIdx = idx + 1;
  return {
    ok: true,
    state: {
      sets: [...sets, { a: 0, b: 0 }],
      currentSet: nextIdx,
      serving: firstServerOfSet(config, sets, nextIdx),
    },
    setJustWon,
    matchWon: null,
  };
}

/**
 * Winner to record when an admin ends the competition before a mathematical
 * match win (schedule ran out): sets leader, then current-set points leader,
 * null when perfectly tied (early end disabled).
 */
export function leaderForEarlyEnd(
  config: SportConfig,
  state: ScoreState,
): TeamKey | null {
  const won = setsWon(config, state);
  if (won.a !== won.b) return won.a > won.b ? "a" : "b";
  const set = state.sets[state.currentSet - 1];
  if (set.a !== set.b) return set.a > set.b ? "a" : "b";
  return null;
}
