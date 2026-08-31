"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchView } from "@/lib/types";
import { setsToWin } from "@/lib/sport/rules";
import { contrastText, HOUSE_HEX } from "@/lib/sport/colors";
import { cn } from "@/lib/cn";
import { Btn } from "@/components/admin/Btn";
import { useMatchController } from "@/components/admin/useMatchController";
import { cancelMatch } from "@/app/admin/scoreboard/actions";

/** Courtside control console (classic admin UI). Logic lives in useMatchController. */
export function MatchConsole({ match }: { match: MatchView }) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const {
    view,
    error,
    clearError,
    clock,
    config,
    timed,
    format,
    flags,
    won,
    total,
    majority,
    endWinner,
    inPlay,
    scoringOpen,
    canEndSet,
    tapScore,
    tapEndSet,
    start,
    pause,
    resume,
    undo,
    finish,
  } = useMatchController(match);

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
            onClick={clearError}
            className="hover:text-ink ml-3 cursor-pointer"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {timed && (
        <div className="border-line bg-yellow text-ink mb-3 flex items-center justify-between border-[1.5px] px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase">
          <span>★ {config.labelEn} is managed in the New UI</span>
          <Link href="/console/match" className="underline underline-offset-2">
            Open console →
          </Link>
        </div>
      )}

      <div className="border-line bg-paper border-[1.5px] p-4">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-display text-[22px] leading-none italic">
            {config.labelTh}
          </span>
          <span className="text-mute-500 font-mono text-[10px] tracking-[0.18em] uppercase">
            {config.labelEn} ·{" "}
            {timed
              ? `${view.bestOf} × ${view.periodMinutes} min`
              : `Best of ${view.bestOf} · to ${view.pointsToWin}`}
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
            {inPlay && <span className="text-ink tabular-nums">{clock}</span>}
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
                  {!timed &&
                    view.serving === team &&
                    view.status === "live" && (
                      <span aria-label="Serving" title="Serving">
                        ●
                      </span>
                    )}
                </div>
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase opacity-80">
                  {timed
                    ? `Total · fouls ${view.fouls[team]}`
                    : `Sets ${won[team]} / ${setsToWin(format)}`}
                </div>
                <div className="font-display text-[96px] leading-none italic tabular-nums">
                  {timed ? total[team] : set[team]}
                </div>
                {!timed && (
                  <>
                    <button
                      type="button"
                      onClick={() => tapScore(team, 1)}
                      disabled={!scoringOpen}
                      className={cn(
                        "border-line bg-paper text-ink font-display w-full cursor-pointer border-[1.5px] py-6 text-center text-3xl italic [box-shadow:3px_3px_0_var(--color-ink)] transition-all active:translate-x-px active:translate-y-px active:[box-shadow:1px_1px_0_var(--color-ink)]",
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
                  </>
                )}
              </div>
            );
          })}

          <div className="border-line bg-cream lg:-order-none flex min-w-[220px] flex-col items-stretch gap-2 border-[1.5px] p-4 lg:order-none lg:col-start-2 lg:row-start-1">
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
              {majority && (
                <span className="bg-house-green text-ink mt-1 block px-2 py-1">
                  Sets decided — end?
                </span>
              )}
            </div>

            {/* Numbered set strip, one slot per possible set (mirrors the board) */}
            <div className="mb-1 flex justify-center gap-1">
              {Array.from({ length: view.bestOf }, (_, i) => {
                const s = view.sets[i];
                const isCurrent =
                  view.status !== "finished" && i === view.currentSet - 1;
                return (
                  <span
                    key={i}
                    className={cn(
                      "border-line min-w-[44px] border-[1.5px] px-1 py-0.5 text-center font-mono text-[10px] tabular-nums",
                      isCurrent
                        ? "bg-yellow text-ink"
                        : s
                          ? "bg-paper text-ink"
                          : "bg-paper text-mute-300",
                    )}
                  >
                    {i + 1}
                    <br />
                    {s ? `${s.a}:${s.b}` : ":"}
                  </span>
                );
              })}
            </div>

            {view.status === "scheduled" && (
              <>
                <Btn
                  type="button"
                  variant="primary"
                  className="py-4"
                  onClick={start}
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
              <>
                {!timed && (
                  <Btn
                    type="button"
                    variant="primary"
                    className="py-3"
                    disabled={!canEndSet}
                    onClick={tapEndSet}
                  >
                    ✓ End set {view.currentSet} · จบเซต
                  </Btn>
                )}
                <Btn type="button" className="py-3" onClick={pause}>
                  ‖ Pause
                </Btn>
              </>
            )}
            {view.status === "paused" && (
              <Btn
                type="button"
                variant="primary"
                className="py-3"
                onClick={resume}
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
                  onClick={undo}
                >
                  ↩ Undo last
                </Btn>
                <Btn
                  type="button"
                  variant="ink"
                  className={cn("py-3", majority && "animate-pulse")}
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
                  {majority === null && " (leading on score)"}
                </>
              )}
            </p>
            <div className="mt-4 flex gap-2">
              <Btn
                type="button"
                variant="ink"
                onClick={() => {
                  setConfirmEnd(false);
                  finish();
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
