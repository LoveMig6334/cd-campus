import type { CSSProperties } from "react";
import {
  BWF,
  courtFlags,
  currentGame,
  formatDuration,
  gameNumber,
  gamesWon,
  intervalRemaining,
  matchElapsed,
  serviceCourt,
  type CourtId,
  type CourtMatch,
  type CourtsState,
  type Side,
} from "@/lib/sport/badminton";
import { HOUSE_HEX } from "@/lib/sport/colors";
import { cn } from "@/lib/cn";
import { Led, ledPad } from "@/components/scoreboard/LedDigits";
import {
  LABEL,
  LABEL_AMBER,
  PanelBox,
} from "@/components/scoreboard/BasketballBoard";

const HOUSE_EN = {
  green: "Green",
  purple: "Purple",
  orange: "Orange",
  pink: "Pink",
} as const;

function Shuttle({ lit }: { lit: boolean }) {
  return (
    <svg
      viewBox="0 0 40 48"
      className="h-[calc(var(--u)*5)] w-auto"
      aria-hidden
      style={{
        opacity: lit ? 1 : 0.1,
        filter: lit ? "drop-shadow(0 0 0.25em #39ff6a)" : undefined,
      }}
    >
      <path d="M6 4h28l-8 28h-12z" fill="#39ff6a" opacity="0.85" />
      <path
        d="M13 4l4 28M27 4l-4 28M20 4v28"
        stroke="#101311"
        strokeWidth="1.6"
      />
      <circle cx="20" cy="38" r="8" fill="#39ff6a" />
    </svg>
  );
}

function StatusCenter({ m, now }: { m: CourtMatch; now: number }) {
  const flags = courtFlags(m);
  const left = intervalRemaining(m, now);

  if (left !== null && m.interval) {
    const title = flags.changeEnds
      ? "Change ends · เปลี่ยนแดน"
      : m.interval.kind === "game"
        ? "Between games · พักระหว่างเกม"
        : "Interval · พักครึ่งเกม";
    return (
      <div className="flex flex-col items-center gap-[calc(var(--u)*0.6)]">
        <span className={LABEL_AMBER}>{title}</span>
        <Led
          value={formatDuration(left).slice(-4)}
          color="red"
          h="calc(var(--u)*5.5)"
          className={cn(left <= BWF.intervalWarnSeconds && "animate-pulse")}
        />
      </div>
    );
  }

  let text: string | null = null;
  let hot = false;
  if (m.status === "setup") text = "Waiting · รอการแข่งขัน";
  else if (m.status === "decision") text = "Game · รอประกาศผล";
  else if (m.status === "finished") text = "Final · จบการแข่งขัน";
  else if (flags.matchPoint) [text, hot] = ["Match point", true];
  else if (flags.gamePoint) [text, hot] = ["Game point", true];
  else if (flags.deuce) [text, hot] = ["Deuce", true];

  if (text === null) return <span />;
  return (
    <span
      className={cn(
        "rounded-[calc(var(--u)*0.4)] px-[1vw] py-[calc(var(--u)*0.7)] font-mono text-[calc(var(--u)*2.6)] leading-none font-bold tracking-[0.22em] uppercase",
        hot
          ? "animate-pulse bg-[#ffb020] text-[#101311]"
          : m.status === "finished"
            ? "text-[#ff3b30] drop-shadow-[0_0_calc(var(--u)*0.5)_rgba(255,59,48,0.7)]"
            : "text-[#e8e4d6]",
      )}
    >
      {text}
    </span>
  );
}

const NAME =
  "line-clamp-2 font-mono text-[calc(var(--u)*4.4)] leading-[1.1] font-bold tracking-[0.1em] text-balance text-[#ffb020] uppercase drop-shadow-[0_0_calc(var(--u)*0.4)_rgba(255,176,32,0.6)]";

/** What every layout needs to know about one side of a court. */
function sideView(m: CourtMatch, side: Side) {
  const playing = m.status === "live" || m.status === "interval";
  const finished = m.status === "finished";
  return {
    team: m.teams[side],
    serving: playing && m.serving === side,
    won: finished && m.winner === side,
    pre: m.status === "setup",
    fade: cn(
      "transition-opacity duration-500",
      finished && m.winner !== side && "opacity-35",
    ),
  };
}

function TeamName({
  m,
  side,
  className,
}: {
  m: CourtMatch;
  side: Side;
  className?: string;
}) {
  const { team } = sideView(m, side);
  return (
    <span className={cn(NAME, !team.name && "opacity-30", className)}>
      {team.name || (side === "a" ? "Team A" : "Team B")}
    </span>
  );
}

/** House chip + the WINNER tag once the match is decided. */
function HouseLine({
  m,
  side,
  className,
}: {
  m: CourtMatch;
  side: Side;
  className?: string;
}) {
  const { team, won } = sideView(m, side);
  return (
    <span
      className={cn(
        "flex min-h-[calc(var(--u)*2.6)] items-center gap-[calc(var(--u)*1)] font-sans text-[calc(var(--u)*2)] leading-none text-[#e8e4d6]",
        className,
      )}
    >
      {team.house && (
        <>
          <span
            className="inline-block h-[calc(var(--u)*1.2)] w-[calc(var(--u)*5)] rounded-full"
            style={{ background: HOUSE_HEX[team.house] }}
          />
          {HOUSE_EN[team.house]}
        </>
      )}
      {won && (
        <span className="animate-pulse rounded-[calc(var(--u)*0.3)] bg-[#39ff6a] px-[calc(var(--u)*1)] py-[calc(var(--u)*0.3)] font-mono text-[calc(var(--u)*1.8)] font-bold tracking-[0.24em] text-[#101311] uppercase">
          Winner · ชนะ
        </span>
      )}
    </span>
  );
}

/** Lit shuttle + service court for the serving side; blank space otherwise. */
function ServeMark({
  m,
  side,
  row = false,
}: {
  m: CourtMatch;
  side: Side;
  row?: boolean;
}) {
  const { serving } = sideView(m, side);
  return (
    <div
      className={cn(
        "flex items-center gap-[calc(var(--u)*0.6)]",
        row ? "flex-row" : "w-[calc(var(--u)*8)] flex-col",
      )}
    >
      <Shuttle lit={serving} />
      <span
        className={cn(
          LABEL,
          "text-[calc(var(--u)*1.5)]",
          !serving && "opacity-0",
        )}
      >
        {serving ? (serviceCourt(m) === "right" ? "Right" : "Left") : "—"}
      </span>
    </div>
  );
}

/** Closed games for one side: red, dimmed where the side lost the game. */
function GameScores({
  m,
  side,
  h,
  className,
}: {
  m: CourtMatch;
  side: Side;
  h: string;
  className?: string;
}) {
  const { fade } = sideView(m, side);
  return Array.from({ length: BWF.bestOf }, (_, i) => {
    const g = i < m.gameWinners.length ? m.games[i] : null;
    return (
      <Led
        key={i}
        value={g ? ledPad(g[side], 2) : "  "}
        color="red"
        h={h}
        dim={!g}
        className={cn(
          fade,
          g && m.gameWinners[i] !== side && "opacity-55",
          className,
        )}
      />
    );
  });
}

function CourtTitle({ m }: { m: CourtMatch }) {
  return (
    <div className="flex min-w-0 items-center gap-[calc(var(--u)*1.6)]">
      <span className={cn(LABEL_AMBER, "text-[calc(var(--u)*2.6)] font-bold")}>
        Court
      </span>
      <Led value={String(m.court)} color="amber" h="calc(var(--u)*6)" />
      {m.label && (
        <span className="truncate font-sans text-[calc(var(--u)*2.2)] leading-none text-[#e8e4d6]">
          {m.label}
        </span>
      )}
    </div>
  );
}

function GameTime({ m, now }: { m: CourtMatch; now: number }) {
  const pre = m.status === "setup";
  return (
    <div className="flex items-center justify-end gap-[calc(var(--u)*2.6)]">
      <div className="flex flex-col items-center gap-[calc(var(--u)*0.6)]">
        <span className={LABEL}>Game</span>
        <Led
          value={String(gameNumber(m))}
          color="amber"
          h="calc(var(--u)*5)"
          dim={pre}
        />
      </div>
      <div className="flex flex-col items-center gap-[calc(var(--u)*0.6)]">
        <span className={LABEL}>Time</span>
        <Led
          value={formatDuration(matchElapsed(m, now))}
          color="red"
          h="calc(var(--u)*5)"
          dim={pre}
        />
      </div>
    </div>
  );
}

/* ---------------- Vertical layout: one wide strip per court ---------------- */

function TeamRow({ m, side }: { m: CourtMatch; side: Side }) {
  const { pre, fade } = sideView(m, side);
  return (
    <>
      <ServeMark m={m} side={side} />
      <div
        className={cn("flex min-w-0 flex-col gap-[calc(var(--u)*0.8)]", fade)}
      >
        <TeamName m={m} side={side} />
        <HouseLine m={m} side={side} />
      </div>
      <GameScores m={m} side={side} h="calc(var(--u)*6)" />
      <Led
        value={String(gamesWon(m)[side])}
        color="amber"
        h="calc(var(--u)*9)"
        dim={pre}
        className={cn("ml-[calc(var(--u)*1.6)]", fade)}
      />
      <Led
        value={ledPad(currentGame(m)[side], 2)}
        color="amber"
        h="calc(var(--u)*14)"
        dim={pre}
        className={cn("ml-[calc(var(--u)*2.4)]", fade)}
      />
    </>
  );
}

function CourtStrip({ m, now }: { m: CourtMatch; now: number }) {
  return (
    <PanelBox className="flex min-h-0 flex-1 animate-[sb-pop_0.5s_ease-out_both] flex-col justify-between gap-[calc(var(--u)*1)] px-[calc(var(--u)*2.8)] py-[calc(var(--u)*1.4)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[calc(var(--u)*1.8)]">
        <CourtTitle m={m} />
        <StatusCenter m={m} now={now} />
        <GameTime m={m} now={now} />
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto_auto] items-center justify-items-center gap-x-[calc(var(--u)*2.6)] gap-y-[calc(var(--u)*0.8)] [&>*:nth-child(7n+2)]:justify-self-stretch">
        <span />
        <span />
        {Array.from({ length: BWF.bestOf }, (_, i) => (
          <span key={i} className={LABEL}>
            G{i + 1}
          </span>
        ))}
        <span className={cn(LABEL_AMBER, "ml-[calc(var(--u)*1.6)]")}>
          Games
        </span>
        <span className={cn(LABEL_AMBER, "ml-[calc(var(--u)*2.4)]")}>
          Points
        </span>
        <TeamRow m={m} side="a" />
        <TeamRow m={m} side="b" />
      </div>
    </PanelBox>
  );
}

/* ------------- Horizontal layout: one tall card per court ------------- */

function TeamColumn({ m, side }: { m: CourtMatch; side: Side }) {
  const { pre, fade } = sideView(m, side);
  return (
    <div className="flex min-w-0 flex-col items-center justify-between gap-[calc(var(--u)*1.4)]">
      <div
        className={cn(
          "flex min-h-[calc(var(--u)*13)] w-full flex-col items-center justify-end gap-[calc(var(--u)*1)]",
          fade,
        )}
      >
        <TeamName m={m} side={side} className="text-center" />
        <HouseLine m={m} side={side} className="justify-center" />
      </div>
      <ServeMark m={m} side={side} row />
      <div className="flex flex-col items-center gap-[calc(var(--u)*0.8)]">
        <span className={LABEL_AMBER}>Points</span>
        <Led
          value={ledPad(currentGame(m)[side], 2)}
          color="amber"
          h="calc(var(--u)*22)"
          dim={pre}
          className={fade}
        />
      </div>
      <div className="flex items-end gap-[calc(var(--u)*3)]">
        <div className="flex flex-col items-center gap-[calc(var(--u)*0.8)]">
          <span className={LABEL_AMBER}>Games</span>
          <Led
            value={String(gamesWon(m)[side])}
            color="amber"
            h="calc(var(--u)*8)"
            dim={pre}
            className={fade}
          />
        </div>
        <div className="grid grid-cols-3 justify-items-center gap-x-[calc(var(--u)*1.6)] gap-y-[calc(var(--u)*0.8)]">
          {Array.from({ length: BWF.bestOf }, (_, i) => (
            <span key={i} className={LABEL}>
              G{i + 1}
            </span>
          ))}
          <GameScores m={m} side={side} h="calc(var(--u)*5)" />
        </div>
      </div>
    </div>
  );
}

function CourtCard({ m, now }: { m: CourtMatch; now: number }) {
  return (
    <PanelBox className="flex min-w-0 flex-1 animate-[sb-pop_0.5s_ease-out_both] flex-col justify-between gap-[calc(var(--u)*1.4)] px-[calc(var(--u)*2.4)] py-[calc(var(--u)*1.8)]">
      <div className="flex items-start justify-between gap-[calc(var(--u)*2)]">
        <CourtTitle m={m} />
        <GameTime m={m} now={now} />
      </div>
      <div className="flex min-h-[calc(var(--u)*9)] items-center justify-center">
        <StatusCenter m={m} now={now} />
      </div>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-[calc(var(--u)*2)]">
        <TeamColumn m={m} side="a" />
        <span className="w-[calc(var(--u)*0.3)] rounded-full bg-[#e8e4d6]/15" />
        <TeamColumn m={m} side="b" />
      </div>
    </PanelBox>
  );
}

/**
 * Two-court badminton hall board — same LED look as the basketball board:
 * green ground, black panels, amber points/games, red clocks and game scores.
 * Both courts follow `state.layout` (stacked strips or side-by-side cards);
 * `court` shows a single court full-size (one screen per court).
 */
export function BadmintonBoard({
  state,
  now,
  court,
}: {
  state: CourtsState;
  now: number;
  court: CourtId | null;
}) {
  const sideBySide = court === null && state.layout === "horizontal";
  const ids: CourtId[] = court ? [court] : [1, 2];
  return (
    <div
      className={cn(
        "flex h-full w-full gap-[calc(var(--u)*1.6)] overflow-hidden bg-[#0f3b2a] [background-image:radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)] px-[calc(var(--u)*2.2)] py-[calc(var(--u)*1.6)]",
        sideBySide ? "flex-row" : "flex-col",
      )}
      // Board unit: 1vh for the two-court boards (1.5vh for a single court),
      // capped so a 16:9 design still fits narrower screens.
      style={
        {
          "--u": court ? "min(1.5vh, 0.8vw)" : "min(1vh, 0.5625vw)",
        } as CSSProperties
      }
    >
      {ids.map((id) =>
        sideBySide ? (
          <CourtCard key={id} m={state.courts[id].match} now={now} />
        ) : (
          <CourtStrip key={id} m={state.courts[id].match} now={now} />
        ),
      )}
    </div>
  );
}
