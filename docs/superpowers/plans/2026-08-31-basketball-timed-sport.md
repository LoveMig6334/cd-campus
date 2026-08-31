# Basketball (Timed Sport) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add FIBA-style basketball (4 × 7 min quarters, +1/+2/+3, cumulative team fouls, 5-min overtime, countdown clock) to the live match system, managed from `/console` and shown on `/scoreboard`.

**Architecture:** A `kind: "sets" | "timed"` discriminator on `SportConfig` in the pure engine (`lib/sport/rules.ts`). Basketball reuses `matches.sets` as periods, `best_of` as regulation-period count and the `end_set` event as *end period*; new columns hold `period_minutes`, `fouls` (game-cumulative) and `period_started_seconds` (clock offset). One new event type `foul`. The RPC's clock becomes status-driven so ending a period can stop it.

**Tech Stack:** Next 16 App Router, React 19, Tailwind 4, Supabase (Postgres + RPC + realtime), vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-basketball-timed-sport-design.md`

## Global Constraints

- Follow `AGENTS.md`: Server Components by default, `'use client'` only at interactive leaves, `cn()` for class composition, no Zod, Server Action conventions.
- Engine (`lib/sport/rules.ts`) stays pure and dependency-free; shared by server actions and the client hook.
- Volleyball/badminton behaviour must not change (existing tests in `lib/sport/rules.test.ts` keep passing, modulo the signature updates in Task 1).
- Basketball controls only in the New UI (`/console`); the classic console must still compile and render basketball matches (banner + lifecycle buttons only).
- Fouls are game-cumulative; OT = 5 min; clock holds at 0:00; tied Q4 → OT; End competition disabled while tied.
- Commits: lowercase conventional-ish, one logical change each, no `Co-Authored-By`.
- Verification before claiming done: `npm test`, `npx tsc --noEmit`, `npm run lint`.

---

## File map

| File | Responsibility |
| --- | --- |
| `lib/sport/rules.ts` | engine: sport configs (with `kind`), state/format types, scoring, fouls, period ending, OT, winner, countdown, labels |
| `lib/sport/rules.test.ts` | engine tests |
| `supabase/migrations/0014_timed_sports.sql` | enum value, columns, constraint, replacement RPC |
| `lib/supabase/database.types.ts` | generated types (regenerate or hand-patch) |
| `lib/types.ts` | `MatchView` gains `fouls`, `periodMinutes`, `periodStartedSeconds` |
| `lib/queries/matches.ts` | row → `MatchView` mapping incl. new columns |
| `app/admin/scoreboard/actions.ts` | `scorePoint` deltas, `recordFoul`, period-aware `endSet`, config-aware `endMatch`, `createMatch` per kind |
| `components/admin/useMatchController.ts` | optimistic controller: `tapScore(delta)`, `tapFoul`, countdown, period label/OT flags |
| `components/admin/MatchConsole.tsx`, `components/admin/MatchCreateForm.tsx` | classic console compatibility |
| `components/console/ConsoleFormatFields.tsx` (new) | client field-group switching set/timed format inputs |
| `components/console/ConsoleCreateForm.tsx` | uses the field group |
| `components/console/ConsoleMatch.tsx` | timed-sport controls (+1/+2/+3, fouls, countdown, end quarter/overtime) |
| `components/scoreboard/ScoreboardDisplay.tsx` | timed-sport hall layout |
| `app/console/history/page.tsx`, `app/admin/scoreboard/page.tsx` | totals for timed sports in history lists |

---

### Task 1: Engine — sport kinds, fouls, periods, overtime, countdown

**Files:**
- Modify: `lib/sport/rules.ts` (full rewrite below)
- Test: `lib/sport/rules.test.ts`

**Interfaces:**
- Produces (used by every later task):
  - `type SportId = "volleyball" | "badminton" | "basketball"`, `type SportKind`, `type PointDelta = 1 | 2 | 3 | -1`, `type TeamCounts = { a: number; b: number }`
  - `ScoreState = { sets; currentSet; serving; fouls: TeamCounts }`, `MatchFormat = { bestOf; pointsToWin; periodMinutes: number | null }`
  - `SPORTS`, `isSportId`, `isTimed(config)`, `isValidFormat(kind, format)`, `initialState()`, `formatOf(config)`
  - `applyPoint(state, team, delta: PointDelta)`, `applyFoul(state, team, delta: 1 | -1)`
  - `endCurrentPeriod(config, format, state)` → `{ ok: true; state; setWonBy: TeamKey | null; overtime: boolean } | { ok: false; reason: "tied" | "last_set" }`
  - `totalPoints(state)`, `matchWinner(config, format, state, includeCurrent?)`, `leaderForEarlyEnd(config, state)`, `deriveFlags(config, format, state)`
  - `periodLengthSeconds(config, format, periodIndex)`, `periodRemainingSeconds(config, format, clock, now)`, `periodLabel(config, format, periodIndex)`, `formatClock(seconds)`
  - `MatchClock = { timerSeconds: number; timerStartedAt: string | null; periodStartedSeconds: number; currentSet: number }`

- [ ] **Step 1: Write the failing tests** — append to `lib/sport/rules.test.ts` and update the import list / `state()` helper:

```ts
import {
  applyFoul,
  applyPoint,
  completedSetWinner,
  deriveFlags,
  endCurrentPeriod,
  firstServerOfSet,
  initialState,
  isValidFormat,
  leaderForEarlyEnd,
  matchWinner,
  periodLabel,
  periodLengthSeconds,
  periodRemainingSeconds,
  setsToWin,
  setsWon,
  SPORTS,
  totalPoints,
  type MatchFormat,
  type ScoreState,
  type SetScore,
  type TeamKey,
} from "./rules";

const VB = SPORTS.volleyball;
const BB = SPORTS.basketball;
const F3_15: MatchFormat = { bestOf: 3, pointsToWin: 15, periodMinutes: null };
const F5_25: MatchFormat = { bestOf: 5, pointsToWin: 25, periodMinutes: null };
const BB4_7: MatchFormat = { bestOf: 4, pointsToWin: 15, periodMinutes: 7 };

function state(
  sets: SetScore[],
  serving: TeamKey = "a",
  fouls = { a: 0, b: 0 },
): ScoreState {
  return { sets, currentSet: sets.length, serving, fouls };
}
```

Existing tests: change every `isValidFormat(x)` → `isValidFormat("sets", x)`, every `endCurrentSet(rule, format, s)` → `endCurrentPeriod(VB or SPORTS.badminton, format, s)`, `matchWinner(format, s)` → `matchWinner(VB, format, s)`, `leaderForEarlyEnd(s)` → `leaderForEarlyEnd(VB, s)`, `deriveFlags(format, s)` → `deriveFlags(VB, format, s)`. Add `periodMinutes: null` to inline formats.

New tests:

```ts
describe("timed format validation", () => {
  it("accepts 1-12 periods and 1-60 minutes", () => {
    expect(isValidFormat("timed", BB4_7)).toBe(true);
    expect(isValidFormat("timed", { ...BB4_7, bestOf: 4 })).toBe(true); // even is fine
    expect(isValidFormat("timed", { ...BB4_7, bestOf: 13 })).toBe(false);
    expect(isValidFormat("timed", { ...BB4_7, periodMinutes: null })).toBe(false);
    expect(isValidFormat("timed", { ...BB4_7, periodMinutes: 61 })).toBe(false);
    expect(isValidFormat("sets", { ...F3_15, bestOf: 4 })).toBe(false); // sets stay odd
  });
});

describe("basketball scoring", () => {
  it("adds 1, 2 or 3 points and keeps fouls", () => {
    const s = state([{ a: 0, b: 0 }], "a", { a: 2, b: 0 });
    const r1 = applyPoint(s, "b", 3);
    expect(r1.ok && r1.state.sets[0]).toEqual({ a: 0, b: 3 });
    expect(r1.ok && r1.state.fouls).toEqual({ a: 2, b: 0 });
    const r2 = applyPoint(r1.ok ? r1.state : s, "a", 2);
    expect(r2.ok && r2.state.sets[0]).toEqual({ a: 2, b: 3 });
  });

  it("fouls accumulate per team and floor at 0", () => {
    const s = initialState();
    const r = applyFoul(s, "a", 1);
    expect(r.ok && r.state.fouls).toEqual({ a: 1, b: 0 });
    expect(applyFoul(s, "b", -1)).toEqual({ ok: false, reason: "floor" });
  });

  it("sums total points across periods", () => {
    expect(totalPoints(state([{ a: 10, b: 12 }, { a: 5, b: 3 }]))).toEqual({ a: 15, b: 15 });
  });
});

describe("basketball periods", () => {
  it("ends a tied quarter and opens the next one, carrying fouls", () => {
    const r = endCurrentPeriod(BB, BB4_7, state([{ a: 10, b: 10 }], "a", { a: 3, b: 1 }));
    expect(r.ok && r.state.currentSet).toBe(2);
    expect(r.ok && r.state.sets).toEqual([{ a: 10, b: 10 }, { a: 0, b: 0 }]);
    expect(r.ok && r.state.fouls).toEqual({ a: 3, b: 1 });
    expect(r.ok && r.setWonBy).toBeNull();
    expect(r.ok && r.overtime).toBe(false);
  });

  it("opens overtime when the final period ends tied", () => {
    const s = state([{ a: 10, b: 8 }, { a: 5, b: 7 }, { a: 9, b: 9 }, { a: 4, b: 4 }]);
    const r = endCurrentPeriod(BB, BB4_7, s);
    expect(r.ok && r.overtime).toBe(true);
    expect(r.ok && r.state.currentSet).toBe(5);
    const again = endCurrentPeriod(BB, BB4_7, {
      ...(r.ok ? r.state : s),
      sets: [...s.sets, { a: 3, b: 3 }],
    });
    expect(again.ok && again.overtime).toBe(true); // OT2
  });

  it("refuses to end a decided final period", () => {
    const s = state([{ a: 10, b: 8 }, { a: 5, b: 7 }, { a: 9, b: 9 }, { a: 6, b: 4 }]);
    expect(endCurrentPeriod(BB, BB4_7, s)).toEqual({ ok: false, reason: "last_set" });
  });

  it("decides the winner on total points only", () => {
    const lead = state([{ a: 10, b: 8 }, { a: 5, b: 7 }, { a: 9, b: 9 }, { a: 6, b: 4 }]);
    expect(leaderForEarlyEnd(BB, lead)).toBe("a");
    expect(matchWinner(BB, BB4_7, lead)).toBeNull(); // no set-majority concept
    expect(leaderForEarlyEnd(BB, state([{ a: 20, b: 20 }]))).toBeNull();
    expect(deriveFlags(BB, BB4_7, state([{ a: 14, b: 14 }]))).toEqual({
      deuce: false,
      setPoint: null,
      matchPoint: null,
    });
  });

  it("labels quarters and overtime", () => {
    expect(periodLabel(BB, BB4_7, 1)).toBe("Q1");
    expect(periodLabel(BB, BB4_7, 4)).toBe("Q4");
    expect(periodLabel(BB, BB4_7, 5)).toBe("OT");
    expect(periodLabel(BB, BB4_7, 6)).toBe("OT2");
    expect(periodLabel(VB, F3_15, 2)).toBe("Set 2");
  });
});

describe("basketball clock", () => {
  it("uses period minutes for regulation and 5 min for overtime", () => {
    expect(periodLengthSeconds(BB, BB4_7, 1)).toBe(420);
    expect(periodLengthSeconds(BB, BB4_7, 4)).toBe(420);
    expect(periodLengthSeconds(BB, BB4_7, 5)).toBe(300);
  });

  it("counts down from the period offset and holds at zero", () => {
    const t0 = Date.parse("2026-08-31T03:00:00Z");
    const clock = {
      timerSeconds: 100,
      timerStartedAt: "2026-08-31T03:00:00Z",
      periodStartedSeconds: 100,
      currentSet: 2,
    };
    expect(periodRemainingSeconds(BB, BB4_7, clock, t0 + 30_000)).toBe(390);
    expect(periodRemainingSeconds(BB, BB4_7, clock, t0 + 999_000)).toBe(0);
    expect(
      periodRemainingSeconds(BB, BB4_7, { ...clock, timerStartedAt: null }, t0),
    ).toBe(420);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/sport/rules.test.ts`
Expected: FAIL — `endCurrentPeriod`, `applyFoul`, `totalPoints`, `periodLabel`, … not exported; `SPORTS.basketball` undefined.

- [ ] **Step 3: Rewrite `lib/sport/rules.ts`**

```ts
// Pure scoring engine for live matches. Shared by server actions (authoritative
// state transitions) and the admin console (optimistic prediction) — keep it
// dependency-free and side-effect-free.
//
// Two sport kinds share one state shape:
//   sets  — volleyball/badminton: admin-controlled sets, advisory points target,
//           serving; winner by sets won.
//   timed — basketball: fixed periods on a countdown clock, +1/+2/+3, team
//           fouls (game-cumulative); tied final period opens overtime; winner
//           by total points. `sets` holds the periods, `currentSet` the period.

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
  | { ok: true; state: ScoreState; setWonBy: TeamKey | null; overtime: boolean }
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
/* Periods & clock (timed sports)                                       */
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
```

- [ ] **Step 4: Run tests**

Run: `npm test -- lib/sport/rules.test.ts`
Expected: PASS (all, including the migrated set-sport tests).

- [ ] **Step 5: Commit**

```bash
git add lib/sport/rules.ts lib/sport/rules.test.ts
git commit -m "feat: timed-sport kind in the match engine (basketball rules)"
```

---

### Task 2: Migration 0014 + generated types

**Files:**
- Create: `supabase/migrations/0014_timed_sports.sql`
- Modify: `lib/supabase/database.types.ts`

**Interfaces:**
- Produces: `matches.fouls jsonb`, `matches.period_minutes smallint|null`, `matches.period_started_seconds int`; RPC `apply_match_event(..., p_serving text, p_fouls jsonb, p_status, p_winner_house_id)`; enum value `foul`.

- [ ] **Step 1: Write the migration**

```sql
-- 0014_timed_sports.sql
-- Timed sports (basketball): periods on a countdown clock, +1/+2/+3, team
-- fouls (game-cumulative), overtime. Periods reuse `sets`/`current_set`/
-- `best_of`; the `end_set` event means "end period". New: per-match period
-- length, fouls, and the clock offset of the current period.

alter type match_event_type add value if not exists 'foul';

-- best_of is the regulation period count for timed sports (4 quarters); the
-- odd-only rule for set sports now lives in lib/sport/rules.ts.
alter table matches drop constraint matches_best_of_check;
alter table matches
  add constraint matches_best_of_check check (best_of between 1 and 12),
  add column period_minutes smallint
    check (period_minutes between 1 and 60),
  add column fouls jsonb not null default '{"a":0,"b":0}'::jsonb,
  add column period_started_seconds integer not null default 0
    check (period_started_seconds >= 0);

drop function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, match_status, smallint);

-- Changes vs 0012: p_fouls; the clock follows p_status (running only while
-- live) instead of the event type — identical for existing events, and it
-- lets end_set stop the clock between quarters; end_set stamps the period
-- offset; undo may restore it (payload.periodStartedSeconds); 'foul' is an
-- undo target. Enum comparisons go through ::text because 'foul' cannot be
-- referenced as a literal in the transaction that added it.
create or replace function public.apply_match_event(
  p_match_id         uuid,
  p_event_id         uuid,
  p_expected_version integer,
  p_type             match_event_type,
  p_payload          jsonb,
  p_sets             jsonb,
  p_current_set      smallint,
  p_serving          text,
  p_fouls            jsonb,
  p_status           match_status,
  p_winner_house_id  smallint
) returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match   matches;
  v_seq     integer;
  v_actor   uuid;
  v_seconds integer;
  v_started timestamptz;
begin
  v_actor := public.current_admin_id();
  if v_actor is null then
    raise exception 'forbidden';
  end if;

  select * into v_match from matches where id = p_match_id for update;
  if not found then
    raise exception 'match_not_found';
  end if;

  if exists (select 1 from match_events where id = p_event_id) then
    return v_match;
  end if;

  if v_match.version <> p_expected_version then
    raise exception 'version_conflict';
  end if;

  select coalesce(max(seq), 0) + 1 into v_seq
    from match_events where match_id = p_match_id;

  insert into match_events (id, match_id, seq, type, payload, actor_admin_id)
  values (p_event_id, p_match_id, v_seq, p_type, p_payload, v_actor);

  v_seconds := v_match.timer_seconds;
  v_started := v_match.timer_started_at;
  if p_status = 'live' then
    if v_started is null then
      v_started := now();
    end if;
  elsif v_started is not null then
    v_seconds := v_seconds + greatest(0, extract(epoch from now() - v_started))::int;
    v_started := null;
  end if;

  update matches set
    version         = version + 1,
    sets            = p_sets,
    current_set     = p_current_set,
    serving         = p_serving,
    fouls           = p_fouls,
    status          = p_status,
    winner_house_id = p_winner_house_id,
    started_at = case when p_type::text = 'start' then now() else started_at end,
    ended_at   = case when p_type::text in ('finish','cancel') then now() else ended_at end,
    timer_seconds    = v_seconds,
    timer_started_at = v_started,
    period_started_seconds = case
      when p_type::text = 'end_set' then v_seconds
      when p_type::text = 'undo' and p_payload ? 'periodStartedSeconds'
        then (p_payload->>'periodStartedSeconds')::int
      else period_started_seconds end,
    last_score_event_id = case
      when p_type::text in ('score','end_set','foul') then p_event_id
      when p_type::text = 'undo' then null
      else last_score_event_id end
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;

revoke all on function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, jsonb, match_status, smallint) from public;
grant execute on function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, jsonb, match_status, smallint) to authenticated;
```

- [ ] **Step 2: Apply + regenerate types, or hand-patch**

Run: `supabase migration list` (linked project). If the CLI is authenticated: `supabase db push` (applies 0013 + 0014) then `npm run gen:types`. Otherwise hand-patch `lib/supabase/database.types.ts`:
  - `matches` Row: add `fouls: Json`, `period_minutes: number | null`, `period_started_seconds: number`; Insert/Update: the same as optional.
  - `apply_match_event.Args`: add `p_fouls: Json`; `Returns`: add the three columns.
  - `Enums.match_event_type`: add `"foul"`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in files touched by later tasks (actions/hook/queries) — none inside `database.types.ts`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0014_timed_sports.sql lib/supabase/database.types.ts
git commit -m "feat: migration 0014 — timed sports columns, foul event, status-driven clock"
```

---

### Task 3: `MatchView` + row mapping

**Files:**
- Modify: `lib/types.ts` (`MatchView`)
- Modify: `lib/queries/matches.ts` (`mapMatchRow`)

**Interfaces:**
- Produces: `MatchView.fouls: TeamCounts`, `MatchView.periodMinutes: number | null`, `MatchView.periodStartedSeconds: number`.

- [ ] **Step 1: Extend `MatchView`** — after `pointsToWin`:

```ts
  /** Timed sports: regulation period length (minutes). Null for set sports. */
  periodMinutes: number | null;
  /** Timed sports: cumulative team fouls. Always {0,0} for set sports. */
  fouls: import("@/lib/sport/rules").TeamCounts;
  /** Game seconds elapsed when the current period started (countdown offset). */
  periodStartedSeconds: number;
```

- [ ] **Step 2: Map the columns** in `mapMatchRow`:

```ts
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
// in the returned object:
    periodMinutes: row.period_minutes,
    fouls: parseCounts(row.fouls, "fouls"),
    periodStartedSeconds: row.period_started_seconds,
```

Import `TeamCounts` from `@/lib/sport/rules`.

- [ ] **Step 3: Type-check** — `npx tsc --noEmit`; remaining errors should be in `actions.ts` / hook / UI only.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/queries/matches.ts
git commit -m "feat: expose fouls and period clock fields on MatchView"
```

---

### Task 4: Server actions

**Files:**
- Modify: `app/admin/scoreboard/actions.ts`

**Interfaces:**
- Consumes: engine from Task 1, `MatchView` from Task 3, RPC from Task 2.
- Produces: `scorePoint(matchId, eventId, team, delta: PointDelta)`, `recordFoul(matchId, eventId, team, delta: 1 | -1)`, `endSet(matchId, eventId)` (period-aware), `endMatch`, `createMatch(formData)` accepting `period_minutes`.

- [ ] **Step 1: Update helpers and imports**

```ts
import {
  applyFoul,
  applyPoint,
  endCurrentPeriod,
  formatOf,
  initialState,
  isSportId,
  isTimed,
  isValidFormat,
  leaderForEarlyEnd,
  SPORTS,
  type MatchFormat,
  type PointDelta,
  type ScoreState,
  type TeamKey,
} from "@/lib/sport/rules";

type MatchEventType = "start" | "pause" | "resume" | "score" | "foul" | "end_set" | "undo" | "finish";

function stateOf(m: MatchView): ScoreState {
  return { sets: m.sets, currentSet: m.currentSet, serving: m.serving, fouls: m.fouls };
}
function formatOfMatch(m: MatchView): MatchFormat {
  return { bestOf: m.bestOf, pointsToWin: m.pointsToWin, periodMinutes: m.periodMinutes };
}
```

RPC call: add `p_fouls: apply.state.fouls as unknown as Json,` after `p_serving`.

- [ ] **Step 2: `scorePoint` delta type** → `delta: PointDelta`; body unchanged.

- [ ] **Step 3: Add `recordFoul`** after `scorePoint`:

```ts
export async function recordFoul(
  matchId: string,
  eventId: string,
  team: TeamKey,
  delta: 1 | -1,
): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "live") return { error: "Match is not live" };
    if (!isTimed(SPORTS[m.sport])) return { error: "This sport has no team fouls" };
    const before = stateOf(m);
    const result = applyFoul(before, team, delta);
    if (!result.ok) return { noop: true };
    return {
      apply: {
        type: "foul",
        payload: { team, delta, before: serializeState(before), after: serializeState(result.state) },
        state: result.state,
        status: "live",
        winnerHouseId: null,
      },
    };
  });
}
```

- [ ] **Step 4: `undoLast`** — normalise old snapshots and restore the period offset:

```ts
  const { data: event, error: eventError } = await db
    .from("match_events")
    .select("id, type, payload")
    ...
  const payload = event.payload as { before?: Partial<ScoreState>; periodStartedSecondsBefore?: number };
  ...
  return applyEvent(matchId, eventId, (m) => {
    ...
    const restored: ScoreState = {
      sets: before.sets ?? m.sets,
      currentSet: before.currentSet ?? m.currentSet,
      serving: before.serving ?? m.serving,
      fouls: before.fouls ?? m.fouls, // snapshots from before 0014 have no fouls
    };
    const undoPayload: Record<string, Json> = {
      undoneEventId: event.id,
      before: serializeState(stateOf(m)),
      after: serializeState(restored),
    };
    if (event.type === "end_set" && typeof payload.periodStartedSecondsBefore === "number") {
      undoPayload.periodStartedSeconds = payload.periodStartedSecondsBefore;
    }
    return { apply: { type: "undo", payload: undoPayload, state: restored, status: m.status, winnerHouseId: null } };
  });
```

- [ ] **Step 5: `endSet`** (keep the export name — both hooks call it):

```ts
export async function endSet(matchId: string, eventId: string): Promise<MatchActionResult> {
  return applyEvent(matchId, eventId, (m) => {
    if (m.status !== "live") return { error: "Match is not live" };
    const config = SPORTS[m.sport];
    const before = stateOf(m);
    const result = endCurrentPeriod(config, formatOfMatch(m), before);
    if (!result.ok) {
      if (result.reason === "tied") return { error: "Set is tied — score a point before ending it" };
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
        // Timed sports stop the clock between periods; the admin starts the next one.
        status: isTimed(config) ? "paused" : "live",
        winnerHouseId: null,
      },
    };
  });
}
```

- [ ] **Step 6: `endMatch`** — `const winner = leaderForEarlyEnd(SPORTS[m.sport], state);` and error copy `"Scores are level — play on before ending"`.

- [ ] **Step 7: `createMatch`** per kind:

```ts
  if (!isSportId(sport)) return;
  const config = SPORTS[sport];
  const defaults = formatOf(config);
  const bestOf = Number(formData.get("best_of") ?? defaults.bestOf);
  const pointsToWin = isTimed(config) ? defaults.pointsToWin : Number(formData.get("points_to_win") ?? "");
  const periodMinutes = isTimed(config) ? Number(formData.get("period_minutes") ?? "") : null;
  ...
  if (!isValidFormat(config.kind, { bestOf, pointsToWin, periodMinutes })) return;
  ...insert({ ..., best_of: bestOf, points_to_win: pointsToWin, period_minutes: periodMinutes, ... })
```

- [ ] **Step 8: Type-check** — `npx tsc --noEmit`; remaining errors only in hook/UI.

- [ ] **Step 9: Commit**

```bash
git add app/admin/scoreboard/actions.ts
git commit -m "feat: foul event, period-aware end set and timed formats in match actions"
```

---

### Task 5: Controller hook

**Files:**
- Modify: `components/admin/useMatchController.ts`

**Interfaces:**
- Produces (return value additions): `kind: SportKind`, `timed: boolean`, `total: TeamCounts`, `periodLabel: string`, `periodRemaining: number` (seconds), `clock: string` (countdown mm:ss for timed, elapsed for sets), `periodOver: boolean`, `canEndPeriod: boolean`, `nextPeriodIsOvertime: boolean`, `onFinalPeriod: boolean`, `tapScore(team, delta: PointDelta)`, `tapFoul(team, delta: 1 | -1)`, `tapEndPeriod()` (alias `tapEndSet`), `canEndSet` (alias of `canEndPeriod`).

- [ ] **Step 1: Rewrite the derived section and taps**

```ts
import {
  applyFoul, applyPoint, deriveFlags, elapsedSeconds, endCurrentPeriod, formatClock,
  isTimed, leaderForEarlyEnd, matchWinner, periodLabel, periodRemainingSeconds,
  setsWon, SPORTS, totalPoints, type MatchFormat, type PointDelta, type TeamKey,
} from "@/lib/sport/rules";
import { endMatch, endSet, pauseMatch, recordFoul, resumeMatch, scorePoint, startMatch, undoLast, type MatchActionResult } from "@/app/admin/scoreboard/actions";

function stateOf(m: MatchView) {
  return { sets: m.sets, currentSet: m.currentSet, serving: m.serving, fouls: m.fouls };
}
function formatOfMatch(m: MatchView): MatchFormat {
  return { bestOf: m.bestOf, pointsToWin: m.pointsToWin, periodMinutes: m.periodMinutes };
}

export function formatMatchClock(m: MatchView, now: number): string {
  const config = SPORTS[m.sport];
  const clock = { timerSeconds: m.timerSeconds, timerStartedAt: m.timerStartedAt, periodStartedSeconds: m.periodStartedSeconds, currentSet: m.currentSet };
  return isTimed(config)
    ? formatClock(periodRemainingSeconds(config, formatOfMatch(m), clock, now))
    : formatClock(elapsedSeconds(clock, now));
}
```

Derived values (replace the block after `dispatch`):

```ts
  const config = SPORTS[view.sport];
  const timed = isTimed(config);
  const format = formatOfMatch(view);
  const state = stateOf(view);
  const flags = deriveFlags(config, format, state);
  const won = setsWon(state, view.status === "finished");
  const total = totalPoints(state);
  const majority = matchWinner(config, format, state);
  const endWinner = leaderForEarlyEnd(config, state);
  const inPlay = view.status === "live" || view.status === "paused";
  const scoringOpen = view.status === "live";
  const currentSet = view.sets[view.currentSet - 1];
  const periodRemaining = timed
    ? periodRemainingSeconds(config, format, { timerSeconds: view.timerSeconds, timerStartedAt: view.timerStartedAt, periodStartedSeconds: view.periodStartedSeconds, currentSet: view.currentSet }, now)
    : 0;
  const periodOver = timed && inPlay && periodRemaining === 0;
  const onFinalPeriod = view.currentSet >= view.bestOf;
  const canEndPeriod = view.status === "live" && endCurrentPeriod(config, format, state).ok;
  const nextPeriodIsOvertime = timed && onFinalPeriod && currentSet.a === currentSet.b;
```

Taps:

```ts
  const tapScore = (team: TeamKey, delta: PointDelta) => {
    if (!scoringOpen) return;
    dispatch(
      (v) => { const r = applyPoint(stateOf(v), team, delta); return r.ok ? { ...v, ...r.state } : v; },
      (eventId) => scorePoint(view.id, eventId, team, delta),
    );
  };
  const tapFoul = (team: TeamKey, delta: 1 | -1) => {
    if (!scoringOpen || !timed) return;
    dispatch(
      (v) => { const r = applyFoul(stateOf(v), team, delta); return r.ok ? { ...v, ...r.state } : v; },
      (eventId) => recordFoul(view.id, eventId, team, delta),
    );
  };
  const tapEndPeriod = () => {
    if (!canEndPeriod) return;
    dispatch(
      (v) => {
        const r = endCurrentPeriod(SPORTS[v.sport], formatOfMatch(v), stateOf(v));
        if (!r.ok) return v;
        return { ...v, ...r.state, status: timed ? ("paused" as const) : v.status };
      },
      (eventId) => endSet(view.id, eventId),
    );
  };
```

Keep the `now` ticker running while `live` (unchanged). Return object adds: `kind: config.kind, timed, total, periodLabel: periodLabel(config, format, view.currentSet), periodRemaining, periodOver, onFinalPeriod, canEndPeriod, canEndSet: canEndPeriod, nextPeriodIsOvertime, tapFoul, tapEndPeriod, tapEndSet: tapEndPeriod`.

- [ ] **Step 2: Type-check** — `npx tsc --noEmit`; errors now only in UI files (`deriveFlags`/`setsWon` call sites, `endCurrentSet`).

- [ ] **Step 3: Commit**

```bash
git add components/admin/useMatchController.ts
git commit -m "feat: fouls, countdown and period controls in the match controller hook"
```

---

### Task 6: Classic console compatibility

**Files:**
- Modify: `components/admin/MatchConsole.tsx`
- Modify: `components/admin/MatchCreateForm.tsx`

- [ ] **Step 1: `MatchCreateForm`** — list only set sports:

```tsx
{Object.values(SPORTS).filter((s) => s.kind === "sets").map((s) => ( … ))}
```

- [ ] **Step 2: `MatchConsole`** — destructure `timed` from the hook. Directly under the error banner add:

```tsx
{timed && (
  <div className="border-line bg-yellow text-ink mb-3 flex items-center justify-between border-[1.5px] px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase">
    <span>★ {config.labelEn} is managed in the New UI</span>
    <Link href="/console/match" className="underline underline-offset-2">Open console →</Link>
  </div>
)}
```

Wrap the per-team `+1` / `−1` buttons, the serving dot, the "Sets x / y" line and the End-set button in `{!timed && (…)}`; show `total[team]` instead of `currentSet[team]` when `timed`. Keep start/pause/resume/undo/finish. Update the header line: `timed ? `${config.labelEn} · ${view.bestOf} × ${view.periodMinutes} min` : …`.

- [ ] **Step 3: Type-check** — `npx tsc --noEmit` clean for these two files.

- [ ] **Step 4: Commit**

```bash
git add components/admin/MatchConsole.tsx components/admin/MatchCreateForm.tsx
git commit -m "feat: classic console defers basketball matches to the new ui"
```

---

### Task 7: Console create form — format fields per sport

**Files:**
- Create: `components/console/ConsoleFormatFields.tsx` (`'use client'`)
- Modify: `components/console/ConsoleCreateForm.tsx`

- [ ] **Step 1: Write the client field group**

```tsx
"use client";

import { useState } from "react";
import { BEST_OF_CHOICES, PERIOD_CHOICES, SPORTS, isTimed, type SportId } from "@/lib/sport/rules";
import { FIELD, LABEL } from "@/components/console/ui";

export function ConsoleFormatFields() {
  const [sport, setSport] = useState<SportId>("volleyball");
  const config = SPORTS[sport];

  return (
    <>
      <label className="block">
        <span className={LABEL}>Sport · กีฬา</span>
        <select name="sport" required value={sport} onChange={(e) => setSport(e.target.value as SportId)} className={FIELD}>
          {Object.values(SPORTS).map((s) => (
            <option key={s.id} value={s.id}>{s.labelEn} · {s.labelTh}</option>
          ))}
        </select>
      </label>

      {isTimed(config) ? (
        <>
          <label className="block">
            <span className={LABEL}>Periods · จำนวนควอเตอร์</span>
            <select name="best_of" required defaultValue={String(config.defaultPeriods)} className={FIELD}>
              {PERIOD_CHOICES.map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "period" : "periods"}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>Minutes per period · นาทีต่อควอเตอร์</span>
            <input name="period_minutes" type="number" required defaultValue={config.defaultPeriodMinutes} min={1} max={60} step={1} className={FIELD} />
            <span className="mt-1 block text-[12px] text-gray-500">
              Countdown holds at 0:00 until End quarter · overtime {config.overtimeMinutes} min when tied
            </span>
          </label>
        </>
      ) : (
        <>
          <label className="block">
            <span className={LABEL}>Sets · จำนวนเซต</span>
            <select name="best_of" required defaultValue={String(config.defaultBestOf)} className={FIELD}>
              {BEST_OF_CHOICES.map((n) => (
                <option key={n} value={n}>Best of {n} · ชนะ {Math.floor(n / 2) + 1} เซต</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>Points per set · แต้มต่อเซต</span>
            <input name="points_to_win" type="number" required defaultValue={config.defaultPointsToWin} min={1} max={99} step={1} className={FIELD} />
            <span className="mt-1 block text-[12px] text-gray-500">
              Advisory target — sets end when the referee presses End set
            </span>
          </label>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Use it in `ConsoleCreateForm`** — replace the sport select and both format labels with `<ConsoleFormatFields />` (keep the team selects between them by rendering the component twice? No — move the two team selects *after* `<ConsoleFormatFields />` so the grid reads: sport, periods/sets, minutes/points, team A, team B). Remove now-unused imports.

- [ ] **Step 3: Type-check + lint** — `npx tsc --noEmit && npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add components/console/ConsoleFormatFields.tsx components/console/ConsoleCreateForm.tsx
git commit -m "feat: console create form switches format fields per sport"
```

---

### Task 8: Console match screen — basketball controls

**Files:**
- Modify: `components/console/ConsoleMatch.tsx`

- [ ] **Step 1: Read `c.timed`, `c.total`, `c.periodLabel`, `c.periodOver`, `c.canEndPeriod`, `c.nextPeriodIsOvertime`, `c.onFinalPeriod`, `c.tapFoul` from the hook.**

- [ ] **Step 2: Status strip** — subtitle:

```tsx
{c.timed
  ? `${view.bestOf} × ${view.periodMinutes} min · OT ${c.config.kind === "timed" ? c.config.overtimeMinutes : 5} min`
  : `Best of ${view.bestOf} · to ${view.pointsToWin}`}
```

Add a period badge when `c.inPlay`: `<Badge tone="sky">{c.periodLabel}</Badge>`. Clock chip: when `c.timed && c.periodOver` add `text-red-600` and `animate-pulse`.

- [ ] **Step 3: Team panel** — replace the serving span with `{!c.timed && c.scoringOpen && view.serving === team ? "● Serving" : ""}`; the "Sets x / y" line becomes `c.timed ? `Total · ${c.periodLabel} ${c.currentSet[team]}` : `Sets ${c.won[team]} / ${setsToWin(c.format)}``; the big number is `c.timed ? c.total[team] : c.currentSet[team]`.

Buttons block:

```tsx
<div className="flex w-full flex-col gap-2 px-5 pb-5">
  {c.timed ? (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((n) => (
        <Button key={n} variant="primary" className="h-24 rounded-2xl text-[32px] font-semibold active:scale-[0.98]" disabled={!c.scoringOpen} onClick={() => c.tapScore(team, n as 1 | 2 | 3)}>
          +{n}
        </Button>
      ))}
    </div>
  ) : (
    <Button variant="primary" className="h-24 rounded-2xl text-[32px] font-semibold active:scale-[0.98]" disabled={!c.scoringOpen} onClick={() => c.tapScore(team, 1)}>
      +1
    </Button>
  )}
  <Button variant="ghost" disabled={!c.scoringOpen} onClick={() => c.tapScore(team, -1)}>−1 correction</Button>

  {c.timed && (
    <div className={cn("mt-2 flex items-center justify-between rounded-xl border px-4 py-3", bonus ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50")}>
      <div className="flex flex-col">
        <span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">Fouls · ฟาล์วทีม</span>
        <span className={cn("text-[28px] leading-none font-semibold tabular-nums", bonus ? "text-red-600" : "text-marine")}>
          {view.fouls[team]}{bonus && <span className="ml-2 text-[11px] font-semibold tracking-wide uppercase">Bonus</span>}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" disabled={!c.scoringOpen} onClick={() => c.tapFoul(team, -1)}>−</Button>
        <Button variant="secondary" disabled={!c.scoringOpen} onClick={() => c.tapFoul(team, 1)}>+ Foul</Button>
      </div>
    </div>
  )}
</div>
```

with `const bonus = c.timed && c.config.kind === "timed" && view.fouls[team] >= c.config.foulBonusAt;` computed inside the map. (Check `Button` variants in `components/console/ui.tsx`; use `"ghost"` if `"secondary"` doesn't exist.)

- [ ] **Step 4: Centre rail** — resume button label `c.timed ? `▶ Start ${c.periodLabel}` : "▶ Resume"`; the End-set button:

```tsx
<Button variant="secondary" disabled={!c.canEndPeriod} onClick={c.tapEndPeriod}>
  {c.timed
    ? c.nextPeriodIsOvertime ? "⏱ Overtime · ต่อเวลา" : `■ End ${c.periodLabel} · จบควอเตอร์`
    : "End set · จบเซต"}
</Button>
```

End competition pulses when `c.majority || (c.timed && c.onFinalPeriod && c.periodOver && c.endWinner)`. The sets/period strip: label each cell with `periodLabel(c.config, c.format, i + 1)` and render `view.sets.length` cells for timed sports (OT appended), `view.bestOf` for sets.

- [ ] **Step 5: Winner copy** — confirm dialog note: `c.timed ? " (leading on points)" : c.majority === null && " (leading on score)"`.

- [ ] **Step 6: Type-check + lint**, then commit:

```bash
git add components/console/ConsoleMatch.tsx
git commit -m "feat: basketball controls in the console match screen"
```

---

### Task 9: Hall display — timed layout

**Files:**
- Modify: `components/scoreboard/ScoreboardDisplay.tsx` (`MatchScreen`, `StatusSplash`)

- [ ] **Step 1: Derived values** in `MatchScreen`:

```ts
const config = SPORTS[match.sport];
const timed = isTimed(config);
const format = { bestOf: match.bestOf, pointsToWin: match.pointsToWin, periodMinutes: match.periodMinutes };
const state = { sets: match.sets, currentSet: match.currentSet, serving: match.serving, fouls: match.fouls };
const flags = deriveFlags(config, format, state);
const total = totalPoints(state);
const clockFields = { timerSeconds: match.timerSeconds, timerStartedAt: match.timerStartedAt, periodStartedSeconds: match.periodStartedSeconds, currentSet: match.currentSet };
const remaining = periodRemainingSeconds(config, format, clockFields, now);
const clock = timed ? formatClock(remaining) : formatClock(elapsedSeconds(clockFields, now));
const periodOver = timed && remaining === 0 && !pre && !finished;
const bonusAt = config.kind === "timed" ? config.foulBonusAt : Infinity;
```

- [ ] **Step 2: Team panel** — serving dot only when `!timed`; big number `timed ? total[team] : currentSet[team]`; below it, for timed:

```tsx
{timed && !pre && (
  <div className="flex flex-col items-center gap-[0.6vh]">
    <div className="font-mono text-[1.8vh] tracking-[0.3em] uppercase opacity-80">Fouls · ฟาล์ว</div>
    <div className={cn("border-line font-display border-[1.5px] px-[1.6vw] py-[0.4vh] text-[7vh] leading-none italic tabular-nums", match.fouls[team] >= bonusAt ? "bg-house-pink text-white" : "bg-ink text-house-green")}>
      <Roll value={match.fouls[team]} />
    </div>
  </div>
)}
```

(`house-green` / `house-pink` are existing `@theme` tokens; check `app/globals.css` for the exact names.)

- [ ] **Step 3: Header** — finished line `Final · {timed ? `${total.a}–${total.b}` : `${won.a}–${won.b} sets`}`; clock chip adds `periodOver && "text-house-pink animate-pulse"`.

- [ ] **Step 4: Centre rail** — for timed replace "Sets won" with:

```tsx
<div className="text-mute-700 font-mono text-[1.8vh] tracking-[0.26em] uppercase">Period · ควอเตอร์</div>
<div className="border-line bg-ink text-yellow font-display grid min-w-[12vw] place-items-center border-[1.5px] px-[1.6vw] py-[1vh] text-[9vh] leading-none italic">
  {periodLabel(config, format, match.currentSet)}
</div>
<div className="text-mute-500 font-mono text-[1.6vh] tracking-[0.2em] uppercase">{match.bestOf} × {match.periodMinutes} min</div>
```

Keep the paused chip; deuce/set-point chips are already suppressed by `deriveFlags`.

- [ ] **Step 5: Footer strip** — `const columns = timed ? Math.max(match.bestOf, match.sets.length) : match.bestOf;` and label `periodLabel(config, format, i + 1)` (mono, no underline needed for "Q1").

- [ ] **Step 6: Winner splash** — `timed ? `${total.a}–${total.b} · ${match.sets.map(...).join("  ")}` : existing`.

- [ ] **Step 7: Type-check + lint**, commit:

```bash
git add components/scoreboard/ScoreboardDisplay.tsx
git commit -m "feat: basketball layout on the hall scoreboard"
```

---

### Task 10: History lists

**Files:**
- Modify: `app/console/history/page.tsx:120-140`
- Modify: `app/admin/scoreboard/page.tsx` (history table, same pattern)

- [ ] **Step 1:** where the row computes `won`/`scores`:

```ts
const config = SPORTS[m.sport];
const state = { sets: m.sets, currentSet: m.currentSet, serving: m.serving, fouls: m.fouls };
const headline = isTimed(config)
  ? (() => { const t = totalPoints(state); return `${t.a}–${t.b}`; })()
  : (() => { const w = setsWon(state, true); return `${w.a}–${w.b} sets`; })();
const scores = m.sets.map((s, i) => `${periodLabel(config, { bestOf: m.bestOf, pointsToWin: m.pointsToWin, periodMinutes: m.periodMinutes }, i + 1)} ${s.a}–${s.b}`).join(", ");
```

Render `headline` where the sets line was.

- [ ] **Step 2: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass (lint may still report the pre-existing `BookingBoard.tsx:72` warning noted in memory — not from this work).

- [ ] **Step 3: Commit**

```bash
git add app/console/history/page.tsx app/admin/scoreboard/page.tsx
git commit -m "feat: show basketball totals in match history"
```

---

### Task 11: Docs

**Files:**
- Modify: `AGENTS.md` (Console line: mention sport kinds), `docs/scoreboard-kiosk.md` (basketball board notes, if the doc lists sports)

- [ ] **Step 1:** In `AGENTS.md` Routes → Console bullet append: "Sports have a `kind` (`sets` | `timed`) in `lib/sport/rules.ts`; basketball is `timed` (periods reuse `sets`, `end_set` = end period, `foul` event)."

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md docs/scoreboard-kiosk.md
git commit -m "docs: note sport kinds and basketball in agent guide"
```

---

## Self-review

- Spec coverage: §1 → Task 1; §2 → Task 2; §3 → Tasks 3–4; §4 → Task 5; §5 → Tasks 6–8; §6 → Tasks 9–10; §8 → Task 10 step 2 + migration note in Task 2.
- Names used consistently: `endCurrentPeriod`, `applyFoul`, `totalPoints`, `periodRemainingSeconds`, `periodLabel`, `formatClock`, `elapsedSeconds`, `isTimed`, `formatOf`, `recordFoul`, `tapFoul`, `tapEndPeriod`, `canEndPeriod`, `nextPeriodIsOvertime`, `periodOver`, `MatchView.fouls / periodMinutes / periodStartedSeconds`.
