"use client";

import { useState } from "react";
import type { House } from "@/lib/types";
import {
  applyToCourt,
  BWF,
  correctPoint,
  courtFlags,
  currentGame,
  declareWinner,
  editSetup,
  endGame,
  endInterval,
  formatDuration,
  gameNumber,
  gamesWon,
  intervalRemaining,
  matchElapsed,
  NAME_MAX,
  resetCourt,
  ruleGameWinner,
  scorePoint,
  serviceCourt,
  setServer,
  startMatch,
  suggestedMatchWinner,
  undoCourt,
  type CourtId,
  type CourtMatch,
  type CourtSlot,
  type CourtsState,
  type Result,
  type Side,
} from "@/lib/sport/badminton";
import { HOUSE_HEX } from "@/lib/sport/colors";
import { cn } from "@/lib/cn";
import {
  Badge,
  Button,
  FIELD,
  HouseDot,
  LABEL,
  Panel,
} from "@/components/console/ui";
import {
  useBadmintonCourts,
  useNow,
} from "@/components/scoreboard/useBadmintonCourts";

const HOUSES: { key: House; en: string; th: string }[] = [
  { key: "green", en: "Green", th: "เขียว" },
  { key: "purple", en: "Purple", th: "ม่วง" },
  { key: "orange", en: "Orange", th: "แสด" },
  { key: "pink", en: "Pink", th: "ชมพู" },
];

type Update = (fn: (s: CourtsState) => CourtsState) => void;

function teamName(m: CourtMatch, side: Side): string {
  return m.teams[side].name || (side === "a" ? "Team A" : "Team B");
}

function SetupForm({
  m,
  run,
}: {
  m: CourtMatch;
  run: (fn: (m: CourtMatch) => Result, recordUndo?: boolean) => void;
}) {
  const [first, setFirst] = useState<Side>("a");
  const edit = (patch: Parameters<typeof editSetup>[1]) =>
    run((cur) => editSetup(cur, patch), false);

  return (
    <div className="space-y-4">
      <label className={LABEL}>
        Event / round · รายการ
        <input
          className={FIELD}
          value={m.label}
          maxLength={NAME_MAX}
          placeholder="MS · Semi-final"
          onChange={(e) => edit({ label: e.target.value })}
        />
      </label>
      {(["a", "b"] as const).map((side) => (
        <div key={side} className="grid grid-cols-[1fr_9rem] gap-3">
          <label className={LABEL}>
            {side === "a" ? "Side A" : "Side B"} · ผู้เล่น / ทีม
            <input
              className={FIELD}
              value={m.teams[side].name}
              maxLength={NAME_MAX}
              placeholder={side === "a" ? "Player / pair A" : "Player / pair B"}
              onChange={(e) =>
                edit({
                  teams: {
                    [side]: { ...m.teams[side], name: e.target.value },
                  },
                })
              }
            />
          </label>
          <label className={LABEL}>
            House · คณะสี
            <select
              className={FIELD}
              value={m.teams[side].house ?? ""}
              onChange={(e) =>
                edit({
                  teams: {
                    [side]: {
                      ...m.teams[side],
                      house: (e.target.value || null) as House | null,
                    },
                  },
                })
              }
            >
              <option value="">—</option>
              {HOUSES.map((h) => (
                <option key={h.key} value={h.key}>
                  {h.en} · {h.th}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <div>
        <span className={LABEL}>First serve · เสิร์ฟก่อน</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(["a", "b"] as const).map((side) => (
            <Button
              key={side}
              variant={first === side ? "sky" : "ghost"}
              onClick={() => setFirst(side)}
            >
              {teamName(m, side)}
            </Button>
          ))}
        </div>
      </div>
      <Button
        className="w-full py-3.5 text-[15px]"
        onClick={() => run((cur) => startMatch(cur, first, Date.now()))}
      >
        ▶ Start match · เริ่มการแข่งขัน
      </Button>
    </div>
  );
}

function ScoreSummary({ m }: { m: CourtMatch }) {
  const won = gamesWon(m);
  const g = currentGame(m);
  const playing = m.status === "live" || m.status === "interval";
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["a", "b"] as const).map((side) => {
        const house = m.teams[side].house;
        const serving = playing && m.serving === side;
        return (
          <div
            key={side}
            className={cn(
              "rounded-xl border p-3 transition-colors",
              serving ? "border-sky bg-sky-soft" : "border-gray-200",
              m.status === "finished" && m.winner === side && "border-gold",
            )}
          >
            <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
              {house && <HouseDot hex={HOUSE_HEX[house]} />}
              <span className="truncate">{teamName(m, side)}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-[12px] text-gray-500">
                Games <b className="text-marine text-[18px]">{won[side]}</b>
              </div>
              <div className="text-marine text-[44px] leading-none font-semibold tabular-nums">
                {g[side]}
              </div>
            </div>
            <div className="text-sky mt-1 h-4 text-[12px] font-medium">
              {serving &&
                `● Serving · ${serviceCourt(m) === "right" ? "right court" : "left court"}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GameHistory({ m }: { m: CourtMatch }) {
  const closed = m.games.slice(0, m.gameWinners.length);
  if (closed.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 text-[12px] text-gray-600">
      {closed.map((g, i) => (
        <span key={i} className="rounded-lg bg-gray-100 px-2 py-1 tabular-nums">
          G{i + 1} {g.a}–{g.b} · {teamName(m, m.gameWinners[i])}
        </span>
      ))}
    </div>
  );
}

function CourtControl({
  id,
  slot,
  now,
  update,
}: {
  id: CourtId;
  slot: CourtSlot;
  now: number;
  update: Update;
}) {
  const m = slot.match;
  const run = (fn: (m: CourtMatch) => Result, recordUndo = true) =>
    update((s) => applyToCourt(s, id, fn(s.courts[id].match), { recordUndo }));

  const playing = m.status === "live" || m.status === "interval";
  const g = currentGame(m);
  const ruleWinner = ruleGameWinner(g);
  const flags = courtFlags(m);
  const left = intervalRemaining(m, now);
  const suggested = suggestedMatchWinner(m);
  const n = gameNumber(m);

  const closeGame = (side: Side) => {
    if (ruleWinner !== side) {
      const why =
        ruleWinner === null
          ? `Game ${n} is not finished by the rules (${g.a}–${g.b}).`
          : `By the rules game ${n} goes to ${teamName(m, ruleWinner)}.`;
      if (!window.confirm(`${why}\nEnd it for ${teamName(m, side)} anyway?`)) {
        return;
      }
    }
    run((cur) => endGame(cur, side, Date.now()));
  };

  const declare = (side: Side) => {
    const msg =
      suggested === side
        ? `Declare ${teamName(m, side)} the winner of court ${id}?`
        : `${teamName(m, side)} does not hold the game majority.\nDeclare them the winner (retirement / walkover)?`;
    if (window.confirm(msg)) run((cur) => declareWinner(cur, side, Date.now()));
  };

  const status = {
    setup: <Badge>Setup · ตั้งค่า</Badge>,
    live: <Badge tone="gold">● Live</Badge>,
    interval: <Badge tone="sky">Interval · พัก</Badge>,
    decision: <Badge tone="marine">Decide winner · ประกาศผล</Badge>,
    finished: <Badge tone="green">Final · จบ</Badge>,
  }[m.status];

  return (
    <Panel
      title={`Court ${id} · คอร์ต ${id}`}
      aside={
        <div className="flex items-center gap-2">
          {m.status !== "setup" && (
            <span className="font-mono text-[13px] text-gray-500 tabular-nums">
              G{n} · {formatDuration(matchElapsed(m, now))}
            </span>
          )}
          {status}
        </div>
      }
    >
      {m.status === "setup" ? (
        <SetupForm m={m} run={run} />
      ) : (
        <div className="space-y-4">
          {m.label && (
            <p className="text-[13px] font-medium text-gray-500">{m.label}</p>
          )}
          <ScoreSummary m={m} />
          <GameHistory m={m} />

          {/* Hints from the rules — advisory, the operator decides. */}
          {left !== null && m.interval && (
            <div className="border-sky/30 bg-sky-soft flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
              <div className="text-marine text-[13px]">
                <b>
                  {flags.changeEnds
                    ? "Change ends · "
                    : m.interval.kind === "game"
                      ? "Between games · "
                      : "Interval · "}
                </b>
                <span className="font-mono tabular-nums">
                  {formatDuration(left)}
                </span>
                {left === 0 && " — time's up"}
              </div>
              <Button variant="sky" onClick={() => run(endInterval)}>
                ▶ Resume play
              </Button>
            </div>
          )}
          {playing && ruleWinner && (
            <p className="bg-gold/30 text-marine rounded-xl px-4 py-3 text-[13px]">
              By the rules game {n} goes to <b>{teamName(m, ruleWinner)}</b> (
              {g.a}–{g.b}). Confirm below.
            </p>
          )}
          {playing && !ruleWinner && (flags.gamePoint || flags.deuce) && (
            <p className="text-[13px] font-medium text-amber-700">
              {flags.matchPoint
                ? `Match point · ${teamName(m, flags.matchPoint)}`
                : flags.gamePoint
                  ? `Game point · ${teamName(m, flags.gamePoint)}`
                  : "Deuce — win by 2 (30 caps the game)"}
            </p>
          )}

          {playing && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {(["a", "b"] as const).map((side) => (
                  <div key={side} className="space-y-2">
                    <Button
                      className="h-24 w-full text-[20px] font-semibold"
                      disabled={ruleWinner !== null}
                      onClick={() =>
                        run((cur) => scorePoint(cur, side, Date.now()))
                      }
                    >
                      +1 {teamName(m, side)}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        disabled={g[side] === 0}
                        onClick={() => run((cur) => correctPoint(cur, side))}
                      >
                        −1
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={m.serving === side}
                        onClick={() => run((cur) => setServer(cur, side))}
                      >
                        Serve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <span className={LABEL}>
                  End game {n} · จบเกมที่ {n}
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(["a", "b"] as const).map((side) => (
                    <Button
                      key={side}
                      variant={ruleWinner === side ? "gold" : "ghost"}
                      onClick={() => closeGame(side)}
                    >
                      Game → {teamName(m, side)}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {(playing || m.status === "decision") && (
            <div>
              <span className={LABEL}>
                {m.status === "decision"
                  ? "Declare match winner · ประกาศผู้ชนะ"
                  : "Retirement / walkover · ยุติการแข่งขัน"}
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["a", "b"] as const).map((side) => (
                  <Button
                    key={side}
                    variant={
                      m.status === "decision" && suggested === side
                        ? "gold"
                        : m.status === "decision"
                          ? "ghost"
                          : "danger"
                    }
                    className={cn(
                      m.status === "decision" && "py-3.5 text-[15px]",
                    )}
                    onClick={() => declare(side)}
                  >
                    🏆 {teamName(m, side)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {m.status === "finished" && m.winner && (
            <p className="bg-gold/30 text-marine rounded-xl px-4 py-3 text-[14px]">
              Winner · ผู้ชนะ: <b>{teamName(m, m.winner)}</b>
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <Button
              variant="ghost"
              disabled={slot.history.length === 0}
              onClick={() => update((s) => undoCourt(s, id))}
            >
              ↶ Undo
            </Button>
            <Button
              variant={m.status === "finished" ? "primary" : "danger"}
              className="ml-auto"
              onClick={() => {
                const msg =
                  m.status === "finished"
                    ? `Clear court ${id} for the next match?`
                    : `Court ${id} is still in play. Discard this match?`;
                if (window.confirm(msg)) update((s) => resetCourt(s, id));
              }}
            >
              {m.status === "finished"
                ? "New match · แมตช์ถัดไป"
                : "Reset court"}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/**
 * Operator panel for both badminton courts. State lives in this browser and
 * syncs to /scoreboard/badminton windows opened on the same machine.
 */
export function BadmintonControl() {
  const { state, update, ready } = useBadmintonCourts();
  const now = useNow(500);
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-marine text-[26px] leading-tight font-semibold">
            Badminton courts · แบดมินตัน 2 คอร์ต
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-gray-500">
            BWF scoring — rally to {BWF.pointsToWin}, win by 2, capped at{" "}
            {BWF.cap} · best of {BWF.bestOf} · {BWF.intervalSeconds} s interval
            at {BWF.intervalAt} · {BWF.gameIntervalSeconds} s between games. The
            rules suggest; you confirm every game and the winner.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["/scoreboard/badminton", "Board · both courts"],
            ["/scoreboard/badminton?court=1", "Court 1"],
            ["/scoreboard/badminton?court=2", "Court 2"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-marine hover:border-sky hover:bg-sky-soft inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium"
            >
              {label} ↗
            </a>
          ))}
        </div>
      </header>
      {ready && (
        <div className="grid gap-6 lg:grid-cols-2">
          {([1, 2] as const).map((id) => (
            <CourtControl
              key={id}
              id={id}
              slot={state.courts[id]}
              now={now}
              update={update}
            />
          ))}
        </div>
      )}
    </main>
  );
}
