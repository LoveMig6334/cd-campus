"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchView } from "@/lib/types";
import type { TeamKey } from "@/lib/sport/rules";
import {
  applyPoint,
  deriveFlags,
  leaderForEarlyEnd,
  matchWinner,
  setsWon,
  SPORTS,
} from "@/lib/sport/rules";
import { contrastText, HOUSE_HEX } from "@/lib/sport/colors";
import { cn } from "@/lib/cn";
import { Btn } from "@/components/admin/Btn";
import {
  cancelMatch,
  endMatch,
  pauseMatch,
  resumeMatch,
  scorePoint,
  startMatch,
  undoLast,
  type MatchActionResult,
} from "@/app/admin/scoreboard/actions";

function stateOf(m: MatchView) {
  return { sets: m.sets, currentSet: m.currentSet, serving: m.serving };
}

function formatClock(m: MatchView, now: number): string {
  const running = m.timerStartedAt ? (now - Date.parse(m.timerStartedAt)) / 1000 : 0;
  const total = Math.max(0, Math.floor(m.timerSeconds + running));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Courtside control console. Optimistic: each tap renders its predicted state
 * immediately (same engine as the server), while a promise queue serializes
 * the actual server calls — rapid taps never race each other, and every call
 * carries a fresh event id so a network retry can't double-count. Server
 * responses (and realtime refreshes from a second admin) reconcile the view;
 * failures roll back to the last server-confirmed state.
 */
export function MatchConsole({ match }: { match: MatchView }) {
  const [view, setView] = useState(match);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
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
  const flags = deriveFlags(config, stateOf(view));
  const won = setsWon(config, stateOf(view));
  const matchWon = matchWinner(config, stateOf(view));
  const endWinner = matchWon ?? leaderForEarlyEnd(config, stateOf(view));
  const inPlay = view.status === "live" || view.status === "paused";
  const scoringOpen = view.status === "live" && matchWon === null;

  const tapScore = (team: TeamKey, delta: 1 | -1) => {
    if (!scoringOpen) return;
    dispatch(
      (v) => {
        const r = applyPoint(SPORTS[v.sport], stateOf(v), team, delta);
        return r.ok ? { ...v, ...r.state } : v;
      },
      (eventId) => scorePoint(view.id, eventId, team, delta),
    );
  };

  const houses = [
    { team: "a" as const, info: view.houseA },
    { team: "b" as const, info: view.houseB },
  ];

  return (
    <div className="relative">
      {error && (
        <div
          role="alert"
          className="border-house-pink text-house-pink bg-paper mb-3 flex items-center justify-between border-[1.5px] px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase"
        >
          <span>✕ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="hover:text-ink ml-3 cursor-pointer"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div className="border-line bg-paper border-[1.5px] p-4">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-display text-[22px] leading-none italic">
            {config.labelTh}
          </span>
          <span className="text-mute-500 font-mono text-[10px] tracking-[0.18em] uppercase">
            {config.labelEn}
            {view.roundLabel ? ` · ${view.roundLabel}` : ""}
            {view.venue ? ` · ${view.venue}` : ""}
          </span>
          <span className="ml-auto flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] uppercase">
            {view.status === "live" && (
              <span className="text-house-green">● Live</span>
            )}
            {view.status === "paused" && (
              <span className="text-mute-500">‖ Paused · พัก</span>
            )}
            {view.status === "scheduled" && (
              <span className="text-mute-500">★ Starting soon</span>
            )}
            {view.status === "finished" && (
              <span className="text-blue-deep">✓ Finished</span>
            )}
            {inPlay && <span className="text-ink tabular-nums">{formatClock(view, now)}</span>}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
          {houses.map(({ team, info }) => {
            const bg = HOUSE_HEX[info.key];
            const fg = contrastText(bg);
            const set = view.sets[view.currentSet - 1];
            return (
              <div
                key={team}
                className="border-line flex flex-col items-center gap-3 border-[1.5px] p-4"
                style={{ background: bg, color: fg }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-display text-[22px] leading-none italic">
                    {info.nameEn} · {info.nameTh}
                  </span>
                  {view.serving === team && view.status === "live" && (
                    <span aria-label="Serving" title="Serving">●</span>
                  )}
                </div>
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase opacity-80">
                  Sets {won[team]} / {Math.ceil(config.bestOf / 2)}
                </div>
                <div className="font-display text-[96px] leading-none italic tabular-nums">
                  {set[team]}
                </div>
                <button
                  type="button"
                  onClick={() => tapScore(team, 1)}
                  disabled={!scoringOpen}
                  className={cn(
                    "border-line bg-paper text-ink w-full cursor-pointer border-[1.5px] py-6 text-center font-display text-3xl italic transition-all [box-shadow:3px_3px_0_var(--color-ink)] active:translate-x-px active:translate-y-px active:[box-shadow:1px_1px_0_var(--color-ink)]",
                    !scoringOpen && "cursor-not-allowed opacity-40",
                  )}
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => tapScore(team, -1)}
                  disabled={!scoringOpen}
                  className={cn(
                    "border-line bg-paper text-mute-700 w-full cursor-pointer border-[1.5px] py-2 font-mono text-[11px] tracking-[0.12em] uppercase",
                    !scoringOpen && "cursor-not-allowed opacity-40",
                  )}
                >
                  −1 correction
                </button>
              </div>
            );
          })}

          <div className="border-line bg-cream flex min-w-[220px] flex-col items-stretch gap-2 border-[1.5px] p-4 lg:order-none lg:-order-none lg:col-start-2 lg:row-start-1">
            <div className="text-center font-mono text-[10px] tracking-[0.18em] uppercase">
              Set {view.currentSet}
              {flags.deuce && (
                <span className="bg-yellow text-ink mt-1 block px-2 py-1">
                  Deuce · ดิวส์
                </span>
              )}
              {flags.matchPoint && (
                <span className="bg-ink text-yellow mt-1 block px-2 py-1">
                  Match point
                </span>
              )}
              {!flags.matchPoint && flags.setPoint && (
                <span className="bg-ink text-paper mt-1 block px-2 py-1">
                  Set point
                </span>
              )}
              {matchWon && (
                <span className="bg-house-green text-ink mt-1 block px-2 py-1">
                  Match decided
                </span>
              )}
            </div>

            <div className="text-mute-700 mb-1 text-center font-mono text-[11px] tabular-nums">
              {view.sets
                .map((s) => `${s.a}–${s.b}`)
                .join("  ·  ")}
            </div>

            {view.status === "scheduled" && (
              <>
                <Btn
                  type="button"
                  variant="primary"
                  className="py-4"
                  onClick={() =>
                    dispatch(
                      (v) => ({ ...v, status: "live" as const }),
                      (eventId) => startMatch(view.id, eventId),
                    )
                  }
                >
                  ▶ Start match
                </Btn>
                <form action={cancelMatch}>
                  <input type="hidden" name="id" value={view.id} />
                  <Btn type="submit" className="w-full">
                    ✕ Cancel match
                  </Btn>
                </form>
              </>
            )}

            {view.status === "live" && (
              <Btn
                type="button"
                className="py-3"
                onClick={() =>
                  dispatch(
                    (v) => ({ ...v, status: "paused" as const }),
                    (eventId) => pauseMatch(view.id, eventId),
                  )
                }
              >
                ‖ Pause
              </Btn>
            )}
            {view.status === "paused" && (
              <Btn
                type="button"
                variant="primary"
                className="py-3"
                onClick={() =>
                  dispatch(
                    (v) => ({ ...v, status: "live" as const }),
                    (eventId) => resumeMatch(view.id, eventId),
                  )
                }
              >
                ▶ Resume
              </Btn>
            )}

            {inPlay && (
              <>
                <Btn
                  type="button"
                  className="py-3"
                  disabled={!view.canUndo}
                  onClick={() =>
                    dispatch(null, (eventId) => undoLast(view.id, eventId))
                  }
                >
                  ↩ Undo last point
                </Btn>
                <Btn
                  type="button"
                  variant="ink"
                  className={cn("py-3", matchWon && "animate-pulse")}
                  disabled={endWinner === null}
                  onClick={() => setConfirmEnd(true)}
                >
                  ■ End competition
                </Btn>
              </>
            )}

            {view.status === "finished" && (
              <div className="text-center font-mono text-[11px] tracking-[0.12em] uppercase">
                Winner:{" "}
                {view.winner === "a" ? view.houseA.nameEn : view.houseB.nameEn}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmEnd && (
        <div className="bg-ink/40 absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="border-line bg-paper max-w-[360px] border-[1.5px] p-5 [box-shadow:5px_5px_0_var(--color-ink)]">
            <div className="font-display text-[24px] leading-tight italic">
              จบการแข่งขัน?
            </div>
            <div className="text-mute-700 mt-1 font-mono text-[10px] tracking-[0.16em] uppercase">
              End competition?
            </div>
            <p className="mt-3 text-[14px]">
              {endWinner && (
                <>
                  Winner recorded:{" "}
                  <strong>
                    {endWinner === "a"
                      ? `${view.houseA.nameEn} · ${view.houseA.nameTh}`
                      : `${view.houseB.nameEn} · ${view.houseB.nameTh}`}
                  </strong>
                  {matchWon === null && " (leading on score — early end)"}
                </>
              )}
            </p>
            <div className="mt-4 flex gap-2">
              <Btn
                type="button"
                variant="ink"
                onClick={() => {
                  setConfirmEnd(false);
                  dispatch(
                    (v) => ({ ...v, status: "finished" as const }),
                    (eventId) => endMatch(view.id, eventId),
                  );
                }}
              >
                Confirm end
              </Btn>
              <Btn type="button" onClick={() => setConfirmEnd(false)}>
                ← Back
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
