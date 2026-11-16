// Pure badminton engine for the two-court board. BWF Laws of Badminton:
// rally scoring to 21, win by 2, capped at 30; best of 3 games; a 60 s
// interval when the leading score first reaches 11; 120 s between games;
// in the deciding game the ends change at 11. The winner of a rally serves;
// an even server score serves from the right court, odd from the left.
//
// The rules only *suggest* outcomes: a decided game stops further points,
// but games close and the match is decided by the operator (manual winner).

import type { House } from "@/lib/types";

export const BWF = {
  pointsToWin: 21,
  cap: 30,
  bestOf: 3,
  intervalAt: 11,
  intervalSeconds: 60,
  gameIntervalSeconds: 120,
  /** The umpire calls "20 seconds" before an interval ends. */
  intervalWarnSeconds: 20,
} as const;

export const GAMES_TO_WIN = Math.floor(BWF.bestOf / 2) + 1;
export const COURT_IDS = [1, 2] as const;
export type CourtId = (typeof COURT_IDS)[number];
export const NAME_MAX = 40;

export type Side = "a" | "b";
export type GameScore = { a: number; b: number };
export type CourtTeam = { name: string; house: House | null };
export type CourtStatus =
  | "setup"
  | "live"
  | "interval"
  | "decision"
  | "finished";
export type CourtInterval = { kind: "mid" | "game"; endsAt: number };

export type CourtMatch = {
  court: CourtId;
  status: CourtStatus;
  /** Event / round, e.g. "MS · Semi-final". */
  label: string;
  teams: { a: CourtTeam; b: CourtTeam };
  /** Every game so far, current one last. */
  games: GameScore[];
  /** Operator-confirmed winners of the closed games, in order. */
  gameWinners: Side[];
  serving: Side;
  /** The 11-point interval of the current game has been taken. */
  midIntervalTaken: boolean;
  interval: CourtInterval | null;
  winner: Side | null;
  startedAt: number | null;
  endedAt: number | null;
};

export type Result =
  | { ok: true; match: CourtMatch }
  | { ok: false; reason: string };

export function other(side: Side): Side {
  return side === "a" ? "b" : "a";
}

export function newCourt(court: CourtId): CourtMatch {
  return {
    court,
    status: "setup",
    label: "",
    teams: { a: { name: "", house: null }, b: { name: "", house: null } },
    games: [{ a: 0, b: 0 }],
    gameWinners: [],
    serving: "a",
    midIntervalTaken: false,
    interval: null,
    winner: null,
    startedAt: null,
    endedAt: null,
  };
}

export function currentGame(m: CourtMatch): GameScore {
  return m.games[m.games.length - 1];
}

/** 1-based number of the game in play (or last played). */
export function gameNumber(m: CourtMatch): number {
  return m.games.length;
}

/** Who has won this game under the BWF rule, or null while it is open. */
export function ruleGameWinner(g: GameScore): Side | null {
  for (const s of ["a", "b"] as const) {
    const me = g[s];
    const them = g[other(s)];
    if (me === BWF.cap) return s;
    if (me >= BWF.pointsToWin && me - them >= 2) return s;
  }
  return null;
}

export function gamesWon(m: CourtMatch): { a: number; b: number } {
  const won = { a: 0, b: 0 };
  for (const w of m.gameWinners) won[w] += 1;
  return won;
}

/** The side with the game majority — the suggested match winner. */
export function suggestedMatchWinner(m: CourtMatch): Side | null {
  const won = gamesWon(m);
  if (won.a >= GAMES_TO_WIN) return "a";
  if (won.b >= GAMES_TO_WIN) return "b";
  return null;
}

/** Winning the next rally would win the game for `s`. */
function onGamePoint(g: GameScore, s: Side): boolean {
  const next = g[s] + 1;
  return (
    next === BWF.cap || (next >= BWF.pointsToWin && next - g[other(s)] >= 2)
  );
}

export type CourtFlags = {
  gamePoint: Side | null;
  matchPoint: Side | null;
  deuce: boolean;
  /** Deciding-game interval: the players change ends. */
  changeEnds: boolean;
};

export function courtFlags(m: CourtMatch): CourtFlags {
  const g = currentGame(m);
  const inPlay = m.status === "live" || m.status === "interval";
  const open = inPlay && ruleGameWinner(g) === null;
  let gamePoint: Side | null = null;
  if (open) {
    if (onGamePoint(g, "a")) gamePoint = "a";
    else if (onGamePoint(g, "b")) gamePoint = "b";
  }
  const won = gamesWon(m);
  return {
    gamePoint,
    matchPoint:
      gamePoint && won[gamePoint] === GAMES_TO_WIN - 1 ? gamePoint : null,
    deuce: open && g.a === g.b && g.a >= BWF.pointsToWin - 1,
    changeEnds:
      m.status === "interval" &&
      m.interval?.kind === "mid" &&
      gameNumber(m) === BWF.bestOf,
  };
}

/** Service court of the server: even score → right, odd → left. */
export function serviceCourt(m: CourtMatch): "right" | "left" {
  return currentGame(m)[m.serving] % 2 === 0 ? "right" : "left";
}

export function intervalRemaining(m: CourtMatch, now: number): number | null {
  if (m.status !== "interval" || m.interval === null) return null;
  return Math.max(0, Math.ceil((m.interval.endsAt - now) / 1000));
}

/** Match duration so far (intervals included), in whole seconds. */
export function matchElapsed(m: CourtMatch, now: number): number {
  if (m.startedAt === null) return 0;
  const end = m.endedAt ?? now;
  return Math.max(0, Math.floor((end - m.startedAt) / 1000));
}

/** "mm:ss", or "h:mm:ss" past the hour. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/* ------------------------------------------------------------------ */
/* Transitions                                                          */
/* ------------------------------------------------------------------ */

function cleanTeam(t: CourtTeam): CourtTeam {
  return { name: t.name.slice(0, NAME_MAX), house: t.house };
}

export function editSetup(
  m: CourtMatch,
  patch: { label?: string; teams?: Partial<CourtMatch["teams"]> },
): Result {
  if (m.status !== "setup") return { ok: false, reason: "not_setup" };
  return {
    ok: true,
    match: {
      ...m,
      label: (patch.label ?? m.label).slice(0, NAME_MAX),
      teams: {
        a: cleanTeam(patch.teams?.a ?? m.teams.a),
        b: cleanTeam(patch.teams?.b ?? m.teams.b),
      },
    },
  };
}

export function startMatch(
  m: CourtMatch,
  firstServer: Side,
  now: number,
): Result {
  if (m.status !== "setup") return { ok: false, reason: "not_setup" };
  return {
    ok: true,
    match: {
      ...m,
      status: "live",
      games: [{ a: 0, b: 0 }],
      gameWinners: [],
      serving: firstServer,
      midIntervalTaken: false,
      interval: null,
      winner: null,
      startedAt: now,
      endedAt: null,
    },
  };
}

const inPlay = (m: CourtMatch) =>
  m.status === "live" || m.status === "interval";

/**
 * Rally won by `side`: +1, the rally winner serves. Scoring during an
 * interval resumes play. The first time the leader reaches 11 the 60 s
 * interval starts. A game already decided by the rules takes no more points.
 */
export function scorePoint(m: CourtMatch, side: Side, now: number): Result {
  if (!inPlay(m)) return { ok: false, reason: "not_in_play" };
  const g = currentGame(m);
  if (ruleGameWinner(g) !== null) return { ok: false, reason: "game_over" };

  const next: GameScore = { ...g, [side]: g[side] + 1 };
  const reachedInterval =
    !m.midIntervalTaken &&
    Math.max(next.a, next.b) === BWF.intervalAt &&
    Math.max(g.a, g.b) < BWF.intervalAt;

  return {
    ok: true,
    match: {
      ...m,
      games: [...m.games.slice(0, -1), next],
      serving: side,
      midIntervalTaken: m.midIntervalTaken || reachedInterval,
      status: reachedInterval ? "interval" : "live",
      interval: reachedInterval
        ? { kind: "mid", endsAt: now + BWF.intervalSeconds * 1000 }
        : null,
    },
  };
}

/** Manual −1 on the current game, floored at 0; serving is untouched. */
export function correctPoint(m: CourtMatch, side: Side): Result {
  if (!inPlay(m)) return { ok: false, reason: "not_in_play" };
  const g = currentGame(m);
  if (g[side] === 0) return { ok: false, reason: "floor" };
  return {
    ok: true,
    match: {
      ...m,
      games: [...m.games.slice(0, -1), { ...g, [side]: g[side] - 1 }],
    },
  };
}

export function setServer(m: CourtMatch, side: Side): Result {
  if (!inPlay(m)) return { ok: false, reason: "not_in_play" };
  return { ok: true, match: { ...m, serving: side } };
}

export function endInterval(m: CourtMatch): Result {
  if (m.status !== "interval") return { ok: false, reason: "no_interval" };
  return { ok: true, match: { ...m, status: "live", interval: null } };
}

/**
 * Operator closes the current game for `winner` (manual — usually the rule
 * winner, but retirements and misconduct calls are the operator's choice).
 * Opens the next game behind the 120 s interval with the game winner
 * serving, or moves to "decision" once a side holds the majority.
 */
export function endGame(m: CourtMatch, winner: Side, now: number): Result {
  if (!inPlay(m)) return { ok: false, reason: "not_in_play" };
  const gameWinners = [...m.gameWinners, winner];
  const won = { a: 0, b: 0 };
  for (const w of gameWinners) won[w] += 1;
  const decided = won[winner] >= GAMES_TO_WIN || m.games.length >= BWF.bestOf;

  if (decided) {
    return {
      ok: true,
      match: { ...m, gameWinners, status: "decision", interval: null },
    };
  }
  return {
    ok: true,
    match: {
      ...m,
      gameWinners,
      games: [...m.games, { a: 0, b: 0 }],
      serving: winner,
      midIntervalTaken: false,
      status: "interval",
      interval: {
        kind: "game",
        endsAt: now + BWF.gameIntervalSeconds * 1000,
      },
    },
  };
}

/** The operator declares the match winner (also for retirement/walkover). */
export function declareWinner(m: CourtMatch, side: Side, now: number): Result {
  if (m.status === "setup" || m.status === "finished") {
    return { ok: false, reason: "not_in_play" };
  }
  return {
    ok: true,
    match: {
      ...m,
      status: "finished",
      winner: side,
      interval: null,
      endedAt: now,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Persisted board state (both courts + one-level-per-action undo)      */
/* ------------------------------------------------------------------ */

export const UNDO_LIMIT = 50;

export type CourtSlot = { match: CourtMatch; history: CourtMatch[] };

/** Both-courts board: vertical = courts stacked, horizontal = side by side. */
export const BOARD_LAYOUTS = ["vertical", "horizontal"] as const;
export type BoardLayout = (typeof BOARD_LAYOUTS)[number];

export type CourtsState = {
  v: 1;
  layout: BoardLayout;
  courts: Record<CourtId, CourtSlot>;
};

export function initialCourts(): CourtsState {
  return {
    v: 1,
    layout: "vertical",
    courts: {
      1: { match: newCourt(1), history: [] },
      2: { match: newCourt(2), history: [] },
    },
  };
}

/** Apply a transition to one court, pushing the previous match for undo. */
export function applyToCourt(
  state: CourtsState,
  court: CourtId,
  result: Result,
  { recordUndo = true }: { recordUndo?: boolean } = {},
): CourtsState {
  if (!result.ok) return state;
  const slot = state.courts[court];
  const history = recordUndo
    ? [...slot.history, slot.match].slice(-UNDO_LIMIT)
    : slot.history;
  return {
    ...state,
    courts: { ...state.courts, [court]: { match: result.match, history } },
  };
}

export function undoCourt(state: CourtsState, court: CourtId): CourtsState {
  const slot = state.courts[court];
  const prev = slot.history[slot.history.length - 1];
  if (!prev) return state;
  return {
    ...state,
    courts: {
      ...state.courts,
      [court]: { match: prev, history: slot.history.slice(0, -1) },
    },
  };
}

export function setLayout(
  state: CourtsState,
  layout: BoardLayout,
): CourtsState {
  return state.layout === layout ? state : { ...state, layout };
}

/** Clear a court for the next match, keeping nothing. */
export function resetCourt(state: CourtsState, court: CourtId): CourtsState {
  return {
    ...state,
    courts: {
      ...state.courts,
      [court]: { match: newCourt(court), history: [] },
    },
  };
}

const HOUSES: readonly House[] = ["green", "purple", "orange", "pink"];
const STATUSES: readonly CourtStatus[] = [
  "setup",
  "live",
  "interval",
  "decision",
  "finished",
];

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isSide = (v: unknown): v is Side => v === "a" || v === "b";
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isScore = (v: unknown): v is GameScore =>
  isObj(v) && Number.isInteger(v.a) && Number.isInteger(v.b);

function parseTeam(v: unknown): CourtTeam | null {
  if (!isObj(v) || typeof v.name !== "string") return null;
  const house = HOUSES.includes(v.house as House) ? (v.house as House) : null;
  return { name: v.name.slice(0, NAME_MAX), house };
}

function parseMatch(v: unknown, court: CourtId): CourtMatch | null {
  if (!isObj(v) || v.court !== court) return null;
  if (!STATUSES.includes(v.status as CourtStatus)) return null;
  const teams = isObj(v.teams) ? v.teams : null;
  const a = teams && parseTeam(teams.a);
  const b = teams && parseTeam(teams.b);
  if (!a || !b) return null;
  if (!Array.isArray(v.games) || v.games.length === 0) return null;
  if (!v.games.every(isScore)) return null;
  if (!Array.isArray(v.gameWinners) || !v.gameWinners.every(isSide)) {
    return null;
  }
  if (!isSide(v.serving)) return null;
  const iv = v.interval;
  const interval: CourtInterval | null =
    isObj(iv) && (iv.kind === "mid" || iv.kind === "game") && isNum(iv.endsAt)
      ? { kind: iv.kind, endsAt: iv.endsAt }
      : null;
  return {
    court,
    status: v.status as CourtStatus,
    label: typeof v.label === "string" ? v.label.slice(0, NAME_MAX) : "",
    teams: { a, b },
    games: v.games.map((g) => ({ a: g.a, b: g.b })),
    gameWinners: [...v.gameWinners],
    serving: v.serving,
    midIntervalTaken: v.midIntervalTaken === true,
    interval,
    winner: isSide(v.winner) ? v.winner : null,
    startedAt: isNum(v.startedAt) ? v.startedAt : null,
    endedAt: isNum(v.endedAt) ? v.endedAt : null,
  };
}

/** Parse stored JSON; anything malformed falls back to a fresh court. */
export function parseCourts(raw: string | null): CourtsState {
  const fresh = initialCourts();
  if (!raw) return fresh;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fresh;
  }
  if (!isObj(data) || data.v !== 1 || !isObj(data.courts)) return fresh;
  // States saved before the layout setting existed default to vertical.
  if (BOARD_LAYOUTS.includes(data.layout as BoardLayout)) {
    fresh.layout = data.layout as BoardLayout;
  }
  const courts = data.courts;
  for (const id of COURT_IDS) {
    const slot = courts[id];
    if (!isObj(slot)) continue;
    const match = parseMatch(slot.match, id);
    if (!match) continue;
    const history = Array.isArray(slot.history)
      ? slot.history
          .map((h) => parseMatch(h, id))
          .filter((h): h is CourtMatch => h !== null)
          .slice(-UNDO_LIMIT)
      : [];
    fresh.courts[id] = { match, history };
  }
  return fresh;
}
