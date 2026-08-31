"use client";

import { useState } from "react";
import type { MatchView } from "@/lib/types";
import { periodLabel, setsToWin } from "@/lib/sport/rules";
import { HOUSE_HEX } from "@/lib/sport/colors";
import { cn } from "@/lib/cn";
import { useMatchController } from "@/components/admin/useMatchController";
import { cancelMatch } from "@/app/admin/scoreboard/actions";
import { Badge, Button, Panel } from "@/components/console/ui";

const SCORE_BTN = "rounded-2xl text-[32px] font-semibold active:scale-[0.98]";

export function ConsoleMatch({ match }: { match: MatchView }) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const c = useMatchController(match);
  const { view, timed, config } = c;

  const houses = [
    { team: "a" as const, info: view.houseA },
    { team: "b" as const, info: view.houseB },
  ];
  const winnerInfo = view.winner === "a" ? view.houseA : view.houseB;
  const endWinnerInfo =
    c.endWinner === "a"
      ? view.houseA
      : c.endWinner === "b"
        ? view.houseB
        : null;

  const foulBonusAt = config.kind === "timed" ? config.foulBonusAt : Infinity;
  const overtimeMinutes = config.kind === "timed" ? config.overtimeMinutes : 0;
  // Timed sports: suggest ending once the final period has run out and is decided.
  const suggestEnd =
    c.majority !== null ||
    (timed && c.onFinalPeriod && c.periodOver && c.endWinner !== null);
  // Period strip: every possible set, plus any overtime periods actually played.
  const stripLength = timed
    ? Math.max(view.bestOf, view.sets.length)
    : view.bestOf;

  return (
    <div className="relative flex flex-col gap-4">
      {c.error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
        >
          <span>{c.error}</span>
          <button
            type="button"
            onClick={c.clearError}
            className="cursor-pointer font-medium hover:underline"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status strip */}
      <Panel className="flex flex-wrap items-center gap-3 py-4">
        <div className="flex flex-col">
          <span className="text-marine text-[18px] leading-tight font-semibold">
            {config.labelTh}{" "}
            <span className="font-normal text-gray-400">
              · {config.labelEn}
            </span>
          </span>
          <span className="text-[13px] text-gray-500">
            {timed
              ? `${view.bestOf} × ${view.periodMinutes} min · OT ${overtimeMinutes} min`
              : `Best of ${view.bestOf} · to ${view.pointsToWin}`}
            {view.roundLabel ? ` · ${view.roundLabel}` : ""}
            {view.venue ? ` · ${view.venue}` : ""}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {view.status === "live" && (
            <Badge tone="gold">
              <span className="bg-marine size-1.5 animate-pulse rounded-full" />
              LIVE
            </Badge>
          )}
          {view.status === "paused" && (
            <Badge tone="gray">‖ Paused · พัก</Badge>
          )}
          {view.status === "scheduled" && (
            <Badge tone="sky">Scheduled · รอเริ่ม</Badge>
          )}
          {view.status === "finished" && <Badge tone="green">✓ Finished</Badge>}
          {c.inPlay && timed && <Badge tone="marine">{c.periodLabel}</Badge>}
          {c.inPlay && (
            <span
              className={cn(
                "text-marine rounded-xl bg-gray-100 px-3 py-1.5 font-mono text-[15px] font-semibold tabular-nums",
                c.periodOver && "animate-pulse bg-red-50 text-red-600",
              )}
            >
              {c.clock}
            </span>
          )}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px_1fr]">
        {houses.map(({ team, info }) => {
          const hex = HOUSE_HEX[info.key];
          const isWinner = view.status === "finished" && view.winner === team;
          const bonus = timed && view.fouls[team] >= foulBonusAt;
          return (
            <Panel
              key={team}
              className={cn(
                "flex flex-col items-center gap-4 overflow-hidden p-0",
                isWinner && "ring-gold ring-2",
              )}
            >
              <div
                className="flex w-full items-center justify-between px-5 py-3 text-white"
                style={{ background: hex }}
              >
                <span className="text-[16px] font-semibold drop-shadow-sm">
                  {info.nameEn} · {info.nameTh}
                </span>
                <span className="text-[12px] font-medium opacity-90">
                  {!timed && c.scoringOpen && view.serving === team
                    ? "● Serving"
                    : ""}
                </span>
              </div>

              <div className="text-[12px] font-medium tracking-wide text-gray-500 uppercase">
                {timed
                  ? `Total · ${c.periodLabel} ${c.currentSet[team]}`
                  : `Sets ${c.won[team]} / ${setsToWin(c.format)}`}
              </div>
              <div className="text-marine text-[112px] leading-none font-semibold tabular-nums">
                {timed ? c.total[team] : c.currentSet[team]}
              </div>
              {isWinner && <Badge tone="gold">Winner · ชนะ</Badge>}

              <div className="flex w-full flex-col gap-2 px-5 pb-5">
                {timed ? (
                  <div className="grid grid-cols-3 gap-2">
                    {([1, 2, 3] as const).map((n) => (
                      <Button
                        key={n}
                        variant="primary"
                        className={cn("h-24", SCORE_BTN)}
                        disabled={!c.scoringOpen}
                        onClick={() => c.tapScore(team, n)}
                      >
                        +{n}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    className={cn("h-24", SCORE_BTN)}
                    disabled={!c.scoringOpen}
                    onClick={() => c.tapScore(team, 1)}
                  >
                    +1
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={!c.scoringOpen}
                  onClick={() => c.tapScore(team, -1)}
                >
                  −1 correction
                </Button>

                {timed && (
                  <div
                    className={cn(
                      "mt-2 flex items-center justify-between rounded-xl border px-4 py-3",
                      bonus
                        ? "border-red-200 bg-red-50"
                        : "border-gray-200 bg-gray-50",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
                        Team fouls · ฟาล์วทีม
                      </span>
                      <span
                        className={cn(
                          "text-[28px] leading-none font-semibold tabular-nums",
                          bonus ? "text-red-600" : "text-marine",
                        )}
                      >
                        {view.fouls[team]}
                        {bonus && (
                          <span className="ml-2 align-middle text-[11px] font-semibold tracking-wide uppercase">
                            Bonus
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        className="px-3"
                        disabled={!c.scoringOpen}
                        onClick={() => c.tapFoul(team, -1)}
                        aria-label="Remove a foul"
                      >
                        −
                      </Button>
                      <Button
                        variant="sky"
                        disabled={!c.scoringOpen}
                        onClick={() => c.tapFoul(team, 1)}
                      >
                        + Foul
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          );
        })}

        {/* Center controls */}
        <Panel className="flex flex-col gap-2 xl:order-none xl:col-start-2 xl:row-start-1">
          <div className="text-center">
            <div className="text-marine text-[15px] font-semibold">
              {c.periodLabel}
              {timed && c.periodOver && (
                <span className="ml-2 text-[12px] font-medium text-red-600">
                  time
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {c.flags.deuce && <Badge tone="gold">Deuce · ดิวส์</Badge>}
              {c.flags.matchPoint && <Badge tone="marine">Match point</Badge>}
              {!c.flags.matchPoint && c.flags.setPoint && (
                <Badge tone="sky">Set point</Badge>
              )}
              {c.majority && <Badge tone="green">Sets decided — end?</Badge>}
              {timed && c.scoringOpen && c.nextPeriodIsOvertime && (
                <Badge tone="gold">Tied — overtime next</Badge>
              )}
            </div>
          </div>

          <div className="my-2 flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: stripLength }, (_, i) => {
              const s = view.sets[i];
              const isCurrent =
                view.status !== "finished" && i === view.currentSet - 1;
              return (
                <div
                  key={i}
                  className={cn(
                    "min-w-[52px] rounded-lg border px-2 py-1.5 text-center text-[12px] tabular-nums",
                    isCurrent
                      ? "border-gold bg-gold/25 text-marine font-semibold"
                      : s
                        ? "border-gray-200 bg-gray-50 text-gray-700"
                        : "border-dashed border-gray-200 text-gray-300",
                  )}
                >
                  <div className="text-[10px] opacity-70">
                    {periodLabel(config, c.format, i + 1)}
                  </div>
                  {s ? `${s.a} : ${s.b}` : "– : –"}
                </div>
              );
            })}
          </div>

          {view.status === "scheduled" && (
            <>
              <Button
                variant="gold"
                className="py-4 text-[16px]"
                onClick={c.start}
              >
                ▶ Start match · เริ่มแข่ง
              </Button>
              <form action={cancelMatch}>
                <input type="hidden" name="id" value={view.id} />
                <input type="hidden" name="return_to" value="/console/match" />
                <Button type="submit" variant="danger" className="w-full">
                  ✕ Cancel match
                </Button>
              </form>
            </>
          )}

          {view.status === "live" && (
            <>
              <Button
                variant="sky"
                className="py-3"
                disabled={!c.canEndPeriod}
                onClick={c.tapEndPeriod}
              >
                {timed
                  ? c.nextPeriodIsOvertime
                    ? "⏱ Overtime · ต่อเวลา"
                    : `✓ End ${c.periodLabel} · จบควอเตอร์`
                  : `✓ End set ${view.currentSet} · จบเซต`}
              </Button>
              <Button variant="ghost" className="py-3" onClick={c.pause}>
                ‖ Pause · พัก
              </Button>
            </>
          )}
          {view.status === "paused" && (
            <Button variant="gold" className="py-3" onClick={c.resume}>
              {timed
                ? `▶ Start ${c.periodLabel} · เริ่ม`
                : "▶ Resume · เล่นต่อ"}
            </Button>
          )}

          {c.inPlay && (
            <>
              <Button
                variant="ghost"
                className="py-3"
                disabled={!view.canUndo}
                onClick={c.undo}
              >
                ↩ Undo last
              </Button>
              <Button
                variant="primary"
                className={cn("mt-2 py-3", suggestEnd && "animate-pulse")}
                disabled={c.endWinner === null}
                onClick={() => setConfirmEnd(true)}
              >
                ■ End competition · จบการแข่งขัน
              </Button>
              {timed && c.endWinner === null && (
                <span className="text-center text-[12px] text-gray-500">
                  Scores are level — play on (overtime if the period is over)
                </span>
              )}
            </>
          )}

          {view.status === "finished" && (
            <div className="text-center text-[13px] text-gray-600">
              Winner: <strong>{winnerInfo.nameEn}</strong> · {winnerInfo.nameTh}
              {timed && (
                <div className="text-marine mt-1 text-[15px] font-semibold tabular-nums">
                  {c.total.a} – {c.total.b}
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      {confirmEnd && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={() => setConfirmEnd(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="text-marine text-[20px] font-semibold">
              จบการแข่งขัน?
            </div>
            <div className="text-[13px] text-gray-500">End competition?</div>
            <p className="mt-3 text-[14px] text-gray-700">
              {endWinnerInfo && (
                <>
                  Winner recorded:{" "}
                  <strong>
                    {endWinnerInfo.nameEn} · {endWinnerInfo.nameTh}
                  </strong>
                  {timed
                    ? ` (${c.total.a}–${c.total.b} on points)`
                    : c.majority === null && " (leading on score)"}
                </>
              )}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setConfirmEnd(false);
                  c.finish();
                }}
              >
                Confirm end
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
