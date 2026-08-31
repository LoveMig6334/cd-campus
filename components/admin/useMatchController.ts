"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchView } from "@/lib/types";
import type { PointDelta, TeamKey } from "@/lib/sport/rules";
import {
  applyFoul,
  applyPoint,
  clockOfMatch,
  deriveFlags,
  displayClockSeconds,
  endCurrentPeriod,
  formatClock,
  formatOfMatch,
  isFouledOut,
  isTimed,
  leaderForEarlyEnd,
  matchWinner,
  periodLabel,
  periodRemainingSeconds,
  setsWon,
  shotClockRemaining,
  SPORTS,
  stateOfMatch,
  totalPoints,
} from "@/lib/sport/rules";
import {
  addPlayer as addPlayerAction,
  endMatch,
  endSet,
  pauseMatch,
  recordFoul,
  removePlayer as removePlayerAction,
  resumeMatch,
  scorePoint,
  setOnCourt,
  setShotClock,
  setTimeouts,
  startMatch,
  undoLast,
  type MatchActionResult,
} from "@/app/admin/scoreboard/actions";

/** Countdown of the current period (timed) or elapsed game time (sets). */
export function formatMatchClock(m: MatchView, now: number): string {
  return formatClock(
    displayClockSeconds(
      SPORTS[m.sport],
      formatOfMatch(m),
      clockOfMatch(m),
      now,
    ),
  );
}

/**
 * Optimistic match controller shared by both admin consoles. Each tap renders
 * its predicted state immediately (same engine as the server) while a promise
 * queue serializes the actual server calls — rapid taps never race each other,
 * and every call carries a fresh event id so a network retry can't
 * double-count. Server responses (and realtime refreshes from a second admin)
 * reconcile the view; failures roll back to the last server-confirmed state.
 */
export function useMatchController(match: MatchView) {
  const [view, setView] = useState(match);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Jersey chip tapped before a score/foul — credited then cleared.
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const confirmedRef = useRef(match);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRef = useRef(0);

  useEffect(() => {
    if (
      match.id !== confirmedRef.current.id ||
      match.version >= confirmedRef.current.version
    ) {
      confirmedRef.current = match;
      if (pendingRef.current === 0) setView(match);
    }
  }, [match]);

  // Tick faster while a shot clock is running so its last seconds read true.
  const shotClockRunning =
    view.status === "live" && view.shotClockEndsAt !== null;
  useEffect(() => {
    if (view.status !== "live") return;
    const t = setInterval(
      () => setNow(Date.now()),
      shotClockRunning ? 250 : 1000,
    );
    return () => clearInterval(t);
  }, [view.status, shotClockRunning]);

  function dispatch(
    predict: ((v: MatchView) => MatchView) | null,
    run: (eventId: string) => Promise<MatchActionResult>,
  ) {
    setError(null);
    if (predict) setView(predict);
    pendingRef.current += 1;
    const eventId = crypto.randomUUID();
    queueRef.current = queueRef.current.then(async () => {
      let res: MatchActionResult;
      try {
        res = await run(eventId);
      } catch {
        res = { ok: false, error: "Network error — score not saved" };
      }
      pendingRef.current -= 1;
      if (res.ok) {
        if (
          res.match.id !== confirmedRef.current.id ||
          res.match.version >= confirmedRef.current.version
        ) {
          confirmedRef.current = res.match;
        }
        if (pendingRef.current === 0) setView(confirmedRef.current);
      } else {
        setError(res.error);
        setView(confirmedRef.current); // drop the optimistic overlay
      }
    });
  }

  const config = SPORTS[view.sport];
  const timed = isTimed(config);
  const format = formatOfMatch(view);
  const state = stateOfMatch(view);
  const flags = deriveFlags(config, format, state);
  const won = setsWon(state, view.status === "finished");
  const total = totalPoints(state);
  // Advisory only — nothing freezes; the admin decides when sets/matches end.
  const majority = matchWinner(config, format, state);
  const endWinner = leaderForEarlyEnd(config, state);
  const inPlay = view.status === "live" || view.status === "paused";
  const scoringOpen = view.status === "live";
  const currentSet = view.sets[view.currentSet - 1];
  const periodRemaining = timed
    ? periodRemainingSeconds(config, format, clockOfMatch(view), now)
    : 0;
  const periodOver = timed && inPlay && periodRemaining === 0;
  const onFinalPeriod = view.currentSet >= view.bestOf;
  const canEndPeriod =
    view.status === "live" && endCurrentPeriod(config, format, state).ok;
  const nextPeriodIsOvertime =
    timed && onFinalPeriod && currentSet.a === currentSet.b;
  const shotClock = timed ? shotClockRemaining(view, now) : null;
  const shotClockTeam = timed ? view.shotClockTeam : null;

  // The selected player only counts when they belong to the tapped team.
  const creditFor = (team: TeamKey) => {
    const p = view.players.find((x) => x.id === selectedPlayer);
    return p && p.team === team ? p : undefined;
  };
  const creditPlayers = (
    players: MatchView["players"],
    id: string,
    points: number,
    fouls: number,
  ) =>
    players.map((p) =>
      p.id === id
        ? {
            ...p,
            points: Math.max(0, p.points + points),
            fouls: Math.max(0, p.fouls + fouls),
          }
        : p,
    );

  const tapScore = (team: TeamKey, delta: PointDelta) => {
    if (!scoringOpen) return;
    const player = creditFor(team);
    // Timed sports: no player selected → nothing happens (buttons are disabled).
    if (timed && !player) return;
    if (player && delta < 0 && player.points === 0) return;
    setSelectedPlayer(null);
    dispatch(
      (v) => {
        const r = applyPoint(stateOfMatch(v), team, delta);
        if (!r.ok) return v;
        return {
          ...v,
          ...r.state,
          players: player
            ? creditPlayers(v.players, player.id, delta, 0)
            : v.players,
        };
      },
      (eventId) => scorePoint(view.id, eventId, team, delta, player?.id),
    );
  };

  /** A foul always belongs to a player; the team count follows on the server. */
  const tapFoul = (playerId: string, delta: 1 | -1 = 1) => {
    if (!scoringOpen || !timed) return;
    const player = view.players.find((p) => p.id === playerId);
    if (!player) return;
    if (delta > 0 && isFouledOut(player)) return;
    if (delta < 0 && player.fouls === 0) return;
    if (selectedPlayer === playerId) setSelectedPlayer(null);
    dispatch(
      (v) => {
        const r = applyFoul(stateOfMatch(v), player.team, delta);
        if (!r.ok) return v;
        return {
          ...v,
          ...r.state,
          players: creditPlayers(v.players, player.id, 0, delta),
        };
      },
      (eventId) => recordFoul(view.id, eventId, player.team, delta, player.id),
    );
  };

  const tapTimeout = (team: TeamKey) => adjustTimeouts(team, -1);
  const adjustTimeouts = (team: TeamKey, delta: 1 | -1) => {
    if (!timed || !inPlay) return;
    const next = Math.min(9, Math.max(0, view.timeouts[team] + delta));
    if (next === view.timeouts[team]) return;
    dispatch(
      (v) => ({ ...v, timeouts: { ...v.timeouts, [team]: next } }),
      () => setTimeouts(view.id, team, next),
    );
  };

  // Roster edits are rare and need the server's id/uniqueness answer — no
  // optimistic prediction, just the shared queue + error surface.
  const addPlayer = (team: TeamKey, number: number) =>
    dispatch(null, () => addPlayerAction(view.id, team, number));
  const removePlayer = (playerId: string) => {
    if (selectedPlayer === playerId) setSelectedPlayer(null);
    dispatch(null, () => removePlayerAction(view.id, playerId));
  };
  const toggleOnCourt = (playerId: string) => {
    const p = view.players.find((x) => x.id === playerId);
    if (!p) return;
    if (p.onCourt && selectedPlayer === playerId) setSelectedPlayer(null);
    dispatch(null, () => setOnCourt(view.id, playerId, !p.onCourt));
  };

  const tapEndPeriod = () => {
    if (!canEndPeriod) return;
    dispatch(
      (v) => {
        const r = endCurrentPeriod(
          SPORTS[v.sport],
          formatOfMatch(v),
          stateOfMatch(v),
        );
        if (!r.ok) return v;
        // Timed sports stop the clock between periods (server sets paused).
        return {
          ...v,
          ...r.state,
          status: timed ? ("paused" as const) : v.status,
        };
      },
      (eventId) => endSet(view.id, eventId),
    );
  };

  const tapShotClock = (team: TeamKey, seconds: number) => {
    if (!timed || !inPlay) return;
    dispatch(
      (v) => ({
        ...v,
        shotClockTeam: team,
        shotClockEndsAt:
          v.status === "live"
            ? new Date(Date.now() + seconds * 1000).toISOString()
            : null,
        shotClockRemaining: v.status === "live" ? null : seconds,
      }),
      () => setShotClock(view.id, team, seconds),
    );
  };
  const clearShotClock = () => {
    if (!timed || !inPlay) return;
    dispatch(
      (v) => ({
        ...v,
        shotClockTeam: null,
        shotClockEndsAt: null,
        shotClockRemaining: null,
      }),
      () => setShotClock(view.id, view.shotClockTeam ?? "a", null),
    );
  };

  const start = () =>
    dispatch(
      (v) => ({ ...v, status: "live" as const }),
      (eventId) => startMatch(view.id, eventId),
    );
  const pause = () =>
    dispatch(
      (v) => ({ ...v, status: "paused" as const }),
      (eventId) => pauseMatch(view.id, eventId),
    );
  const resume = () =>
    dispatch(
      (v) => ({ ...v, status: "live" as const }),
      (eventId) => resumeMatch(view.id, eventId),
    );
  const undo = () => dispatch(null, (eventId) => undoLast(view.id, eventId));
  const finish = () =>
    dispatch(
      (v) => ({ ...v, status: "finished" as const }),
      (eventId) => endMatch(view.id, eventId),
    );

  return {
    view,
    error,
    clearError: () => setError(null),
    clock: formatMatchClock(view, now),
    config,
    kind: config.kind,
    timed,
    format,
    flags,
    won,
    total,
    majority,
    endWinner,
    inPlay,
    scoringOpen,
    currentSet,
    periodLabel: periodLabel(config, format, view.currentSet),
    periodRemaining,
    periodOver,
    onFinalPeriod,
    canEndPeriod,
    canEndSet: canEndPeriod,
    nextPeriodIsOvertime,
    shotClock,
    shotClockTeam,
    tapShotClock,
    clearShotClock,
    selectedPlayer,
    selectPlayer: setSelectedPlayer,
    /** Team whose player is selected — timed sports can only score for it. */
    selectedTeam:
      view.players.find((p) => p.id === selectedPlayer)?.team ?? null,
    timeouts: view.timeouts,
    tapTimeout,
    adjustTimeouts,
    addPlayer,
    removePlayer,
    toggleOnCourt,
    tapScore,
    tapFoul,
    tapEndPeriod,
    tapEndSet: tapEndPeriod,
    start,
    pause,
    resume,
    undo,
    finish,
  };
}
