// Pure scoring engine for live matches. Shared by server actions (authoritative
// state transitions) and the admin console (optimistic prediction) — keep it
// dependency-free and side-effect-free.
//
// Two sport kinds share one state shape:
//   sets  — volleyball/badminton: admin-controlled sets, advisory points
//           target, serving; winner by sets won.
//   timed — basketball: fixed periods on a countdown clock, +1/+2/+3, team
//           fouls (game-cumulative); a tied final period opens overtime;
//           winner by total points. `sets` holds the periods and `currentSet`
//           the current period; the end_set event means "end period".

export type TeamKey = "a" | "b";
export type SetScore = { a: number; b: number };
export type TeamCounts = { a: number; b: number };
export type PointDelta = 1 | 2 | 3 | -1;

export type ScoreState = {
  /** All sets/periods, current one last. Earlier entries are completed. */
  sets: SetScore[];
  /** 1-based; always === sets.length. */
  currentSet: number;
  /** Set sports only; timed sports ignore it. */
  serving: TeamKey;
  /** Timed sports: cumulative team fouls for the whole game. */
  fouls: TeamCounts;
};

/** Per-match format, chosen by the admin when the match is created. */
export type MatchFormat = {
  /** Sets kind: odd set cap. Timed kind: regulation period count. */
  bestOf: number;
  /** Sets kind: advisory target per set. Unused for timed sports. */
  pointsToWin: number;
  /** Timed kind: regulation period length. Null for set sports. */
  periodMinutes: number | null;
};

export type SportId = "volleyball" | "badminton" | "basketball";
export type SportKind = "sets" | "timed";

type SportBase = { id: SportId; labelEn: string; labelTh: string };

export type SetSportConfig = SportBase & {
  kind: "sets";
  /** Who serves first in the next set. Set 1 always starts with team A. */
  nextSetFirstServer: "alternate" | "prevSetWinner";
  defaultBestOf: number;
  defaultPointsToWin: number;
};

export type TimedSportConfig = SportBase & {
  kind: "timed";
  defaultPeriods: number;
  defaultPeriodMinutes: number;
  overtimeMinutes: number;
  pointSteps: readonly (1 | 2 | 3)[];
  /** Team-foul count at which the UI flags the bonus/penalty situation. */
  foulBonusAt: number;
};

export type SportConfig = SetSportConfig | TimedSportConfig;

export const SPORTS: Record<SportId, SportConfig> = {
  volleyball: {
    id: "volleyball",
    kind: "sets",
    labelEn: "Volleyball",
    labelTh: "วอลเลย์บอล",
    nextSetFirstServer: "alternate",
    defaultBestOf: 3,
    defaultPointsToWin: 15,
  },
  badminton: {
    id: "badminton",
    kind: "sets",
    labelEn: "Badminton",
    labelTh: "แบดมินตัน",
    nextSetFirstServer: "prevSetWinner",
    defaultBestOf: 3,
    defaultPointsToWin: 15,
  },
  basketball: {
    id: "basketball",
    kind: "timed",
    labelEn: "Basketball",
    labelTh: "บาสเกตบอล",
    defaultPeriods: 4,
    defaultPeriodMinutes: 7,
    overtimeMinutes: 5,
    pointSteps: [1, 2, 3],
    foulBonusAt: 5,
  },
};

export function isSportId(v: string): v is SportId {
  return v in SPORTS;
}

export function isTimed(config: SportConfig): config is TimedSportConfig {
  return config.kind === "timed";
}

export const BEST_OF_CHOICES = [1, 3, 5] as const;
export const PERIOD_CHOICES = [1, 2, 4] as const;

export function isValidFormat(kind: SportKind, f: MatchFormat): boolean {
  if (!Number.isInteger(f.bestOf) || !Number.isInteger(f.pointsToWin)) {
    return false;
  }
  if (kind === "timed") {
    return (
      f.bestOf >= 1 &&
      f.bestOf <= 12 &&
      f.periodMinutes !== null &&
      Number.isInteger(f.periodMinutes) &&
      f.periodMinutes >= 1 &&
      f.periodMinutes <= 60
    );
  }
  return (
    f.bestOf >= 1 &&
    f.bestOf <= 9 &&
    f.bestOf % 2 === 1 &&
    f.pointsToWin >= 1 &&
    f.pointsToWin <= 99
  );
}

/** Default per-match format for a sport (create-form defaults). */
export function formatOf(config: SportConfig): MatchFormat {
  return isTimed(config)
    ? {
        bestOf: config.defaultPeriods,
        pointsToWin: 15,
        periodMinutes: config.defaultPeriodMinutes,
      }
    : {
        bestOf: config.defaultBestOf,
        pointsToWin: config.defaultPointsToWin,
        periodMinutes: null,
      };
}

export function initialState(): ScoreState {
  return {
    sets: [{ a: 0, b: 0 }],
    currentSet: 1,
    serving: "a",
    fouls: { a: 0, b: 0 },
  };
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
): TeamCounts {
  const won = { a: 0, b: 0 };
  const upto = includeCurrent ? state.sets.length : state.currentSet - 1;
  for (let i = 0; i < upto; i++) {
    const winner = completedSetWinner(state.sets[i]);
    if (winner) won[winner] += 1;
  }
  return won;
}

/** Points summed over every period — the timed-sport score. */
export function totalPoints(state: ScoreState): TeamCounts {
  return state.sets.reduce(
    (acc, s) => ({ a: acc.a + s.a, b: acc.b + s.b }),
    { a: 0, b: 0 },
  );
}

function leader(counts: TeamCounts): TeamKey | null {
  if (counts.a === counts.b) return null;
  return counts.a > counts.b ? "a" : "b";
}

/**
 * Advisory: a team already holds the set majority — suggest ending. Timed
 * sports have no majority concept (the game runs its periods) → null.
 */
export function matchWinner(
  config: SportConfig,
  format: MatchFormat,
  state: ScoreState,
  includeCurrent = false,
): TeamKey | null {
  if (isTimed(config)) return null;
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

const NO_FLAGS: ScoreFlags = { deuce: false, setPoint: null, matchPoint: null };

/** Advisory hints against the per-match target — never enforced. */
export function deriveFlags(
  config: SportConfig,
  format: MatchFormat,
  state: ScoreState,
): ScoreFlags {
  if (isTimed(config)) return NO_FLAGS;
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
  rule: SetSportConfig["nextSetFirstServer"],
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
 * +n: a score — the scorer serves next (set sports). −1 is a manual
 * correction on the current set/period: floored at 0, serving unchanged.
 * Nothing here ends a period or a match; that is the admin's call.
 */
export function applyPoint(
  state: ScoreState,
  team: TeamKey,
  delta: PointDelta,
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
      ...state,
      sets,
      currentSet: idx,
      serving: delta > 0 ? team : state.serving,
    },
  };
}

/** Team foul (+1) or correction (−1, floored at 0). Game-cumulative. */
export function applyFoul(
  state: ScoreState,
  team: TeamKey,
  delta: 1 | -1,
): ApplyResult {
  if (delta === -1 && state.fouls[team] === 0) {
    return { ok: false, reason: "floor" };
  }
  return {
    ok: true,
    state: {
      ...state,
      fouls: { ...state.fouls, [team]: state.fouls[team] + delta },
    },
  };
}

export type EndPeriodResult =
  | {
      ok: true;
      state: ScoreState;
      setWonBy: TeamKey | null;
      overtime: boolean;
    }
  | { ok: false; reason: "tied" | "last_set" };

/**
 * Admin-triggered set/period ending.
 *   sets  — records the leader as set winner and opens the next set (first
 *           server per sport rule). Rejected when tied or on the final set.
 *   timed — a quarter may end tied. On the final period: tied → opens an
 *           overtime period; decided → rejected (end the competition).
 */
export function endCurrentPeriod(
  config: SportConfig,
  format: MatchFormat,
  state: ScoreState,
): EndPeriodResult {
  const set = state.sets[state.currentSet - 1];
  const setWonBy = completedSetWinner(set);
  const nextIdx = state.currentSet + 1;
  const onFinal = state.currentSet >= format.bestOf;

  if (isTimed(config)) {
    if (onFinal && setWonBy) return { ok: false, reason: "last_set" };
    return {
      ok: true,
      setWonBy,
      overtime: onFinal,
      state: {
        ...state,
        sets: [...state.sets, { a: 0, b: 0 }],
        currentSet: nextIdx,
      },
    };
  }

  if (!setWonBy) return { ok: false, reason: "tied" };
  if (onFinal) return { ok: false, reason: "last_set" };
  return {
    ok: true,
    setWonBy,
    overtime: false,
    state: {
      ...state,
      sets: [...state.sets, { a: 0, b: 0 }],
      currentSet: nextIdx,
      serving: firstServerOfSet(config.nextSetFirstServer, state.sets, nextIdx),
    },
  };
}

/**
 * Winner to record when the admin ends the competition. Sets: completed-sets
 * leader, then current-set points leader. Timed: total-points leader. Null
 * when level (end disabled).
 */
export function leaderForEarlyEnd(
  config: SportConfig,
  state: ScoreState,
): TeamKey | null {
  if (isTimed(config)) return leader(totalPoints(state));
  const won = setsWon(state);
  if (won.a !== won.b) return won.a > won.b ? "a" : "b";
  return completedSetWinner(state.sets[state.currentSet - 1]);
}

/* ------------------------------------------------------------------ */
/* Periods & clock                                                      */
/* ------------------------------------------------------------------ */

/** Length of the 1-based period: regulation minutes, overtime after that. */
export function periodLengthSeconds(
  config: SportConfig,
  format: MatchFormat,
  periodIndex: number,
): number {
  if (!isTimed(config)) return 0;
  const minutes =
    periodIndex > format.bestOf
      ? config.overtimeMinutes
      : (format.periodMinutes ?? config.defaultPeriodMinutes);
  return minutes * 60;
}

/** The clock columns of a match row, as the engine needs them. */
export type MatchClock = {
  timerSeconds: number;
  timerStartedAt: string | null;
  periodStartedSeconds: number;
  currentSet: number;
};

/** Elapsed game seconds so far (accumulated + running stretch). */
export function elapsedSeconds(clock: MatchClock, now: number): number {
  const running = clock.timerStartedAt
    ? (now - Date.parse(clock.timerStartedAt)) / 1000
    : 0;
  return Math.max(0, Math.floor(clock.timerSeconds + running));
}

/** Seconds left in the current period, held at 0 until the period is ended. */
export function periodRemainingSeconds(
  config: SportConfig,
  format: MatchFormat,
  clock: MatchClock,
  now: number,
): number {
  const length = periodLengthSeconds(config, format, clock.currentSet);
  const inPeriod = elapsedSeconds(clock, now) - clock.periodStartedSeconds;
  return Math.max(0, length - Math.max(0, inPeriod));
}

/** "Q1"…"Qn", "OT", "OT2"… for timed sports; "Set n" otherwise. */
export function periodLabel(
  config: SportConfig,
  format: MatchFormat,
  periodIndex: number,
): string {
  if (!isTimed(config)) return `Set ${periodIndex}`;
  if (periodIndex <= format.bestOf) return `Q${periodIndex}`;
  const ot = periodIndex - format.bestOf;
  return ot === 1 ? "OT" : `OT${ot}`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/* ------------------------------------------------------------------ */
/* Adapters from a match row/view (structural — no import of MatchView) */
/* ------------------------------------------------------------------ */

export function stateOfMatch(m: {
  sets: SetScore[];
  currentSet: number;
  serving: TeamKey;
  fouls: TeamCounts;
}): ScoreState {
  return {
    sets: m.sets,
    currentSet: m.currentSet,
    serving: m.serving,
    fouls: m.fouls,
  };
}

export function formatOfMatch(m: {
  bestOf: number;
  pointsToWin: number;
  periodMinutes: number | null;
}): MatchFormat {
  return {
    bestOf: m.bestOf,
    pointsToWin: m.pointsToWin,
    periodMinutes: m.periodMinutes,
  };
}

export function clockOfMatch(m: MatchClock): MatchClock {
  return {
    timerSeconds: m.timerSeconds,
    timerStartedAt: m.timerStartedAt,
    periodStartedSeconds: m.periodStartedSeconds,
    currentSet: m.currentSet,
  };
}

/**
 * The match clock as displayed: countdown of the current period for timed
 * sports (held at 0), elapsed game time for set sports.
 */
export function displayClockSeconds(
  config: SportConfig,
  format: MatchFormat,
  clock: MatchClock,
  now: number,
): number {
  return isTimed(config)
    ? periodRemainingSeconds(config, format, clock, now)
    : elapsedSeconds(clock, now);
}

/**
 * The headline result: "54–48" (total points) for timed sports, sets won
 * for set sports (the current set counts when the match is finished).
 */
export function headlineScore(
  config: SportConfig,
  state: ScoreState,
  finished: boolean,
): TeamCounts {
  return isTimed(config) ? totalPoints(state) : setsWon(state, finished);
}
