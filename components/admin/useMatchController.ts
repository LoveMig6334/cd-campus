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
  isTimed,
  leaderForEarlyEnd,
  matchWinner,
  periodLabel,
  periodRemainingSeconds,
  setsWon,
  SPORTS,
  stateOfMatch,
  totalPoints,
} from "@/lib/sport/rules";
import {
  endMatch,
  endSet,
  pauseMatch,
  recordFoul,
  resumeMatch,
  scorePoint,
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

  useEffect(() => {
    if (view.status !== "live") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [view.status]);

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

  const tapScore = (team: TeamKey, delta: PointDelta) => {
    if (!scoringOpen) return;
    dispatch(
      (v) => {
        const r = applyPoint(stateOfMatch(v), team, delta);
        return r.ok ? { ...v, ...r.state } : v;
      },
      (eventId) => scorePoint(view.id, eventId, team, delta),
    );
  };

  const tapFoul = (team: TeamKey, delta: 1 | -1) => {
    if (!scoringOpen || !timed) return;
    dispatch(
      (v) => {
        const r = applyFoul(stateOfMatch(v), team, delta);
        return r.ok ? { ...v, ...r.state } : v;
      },
      (eventId) => recordFoul(view.id, eventId, team, delta),
    );
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
