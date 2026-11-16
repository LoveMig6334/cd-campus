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

function TeamRow({ m, side }: { m: CourtMatch; side: Side }) {
  const team = m.teams[side];
  const playing = m.status === "live" || m.status === "interval";
  const serving = playing && m.serving === side;
  const finished = m.status === "finished";
  const lost = finished && m.winner !== side;
  const won = gamesWon(m);
  const closed = m.gameWinners.length;
  const pre = m.status === "setup";
  const fade = cn("transition-opacity duration-500", lost && "opacity-35");

  return (
    <>
      <div className="flex w-[calc(var(--u)*8)] flex-col items-center gap-[calc(var(--u)*0.5)]">
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

      <div
        className={cn("flex min-w-0 flex-col gap-[calc(var(--u)*0.8)]", fade)}
      >
        <span
          className={cn(
            "line-clamp-2 font-mono text-[calc(var(--u)*4.4)] leading-[1.1] font-bold tracking-[0.1em] text-balance text-[#ffb020] uppercase drop-shadow-[0_0_calc(var(--u)*0.4)_rgba(255,176,32,0.6)]",
            !team.name && "opacity-30",
          )}
        >
          {team.name || (side === "a" ? "Team A" : "Team B")}
        </span>
        <span className="flex items-center gap-[0.6vw] font-sans text-[calc(var(--u)*2)] leading-none text-[#e8e4d6]">
          {team.house && (
            <>
              <span
                className="inline-block h-[calc(var(--u)*1.2)] w-[3vw] rounded-full"
                style={{ background: HOUSE_HEX[team.house] }}
              />
              {HOUSE_EN[team.house]}
            </>
          )}
          {finished && m.winner === side && (
            <span className="animate-pulse rounded-[calc(var(--u)*0.3)] bg-[#39ff6a] px-[0.6vw] py-[calc(var(--u)*0.3)] font-mono text-[calc(var(--u)*1.8)] font-bold tracking-[0.24em] text-[#101311] uppercase">
              Winner · ชนะ
            </span>
          )}
        </span>
      </div>

      {Array.from({ length: BWF.bestOf }, (_, i) => {
        const g = i < closed ? m.games[i] : null;
        return (
          <Led
            key={i}
            value={g ? ledPad(g[side], 2) : "  "}
            color="red"
            h="calc(var(--u)*6)"
            dim={!g}
            className={cn(fade, g && m.gameWinners[i] !== side && "opacity-55")}
          />
        );
      })}

      <Led
        value={String(won[side])}
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
  const pre = m.status === "setup";
  return (
    <PanelBox className="flex min-h-0 flex-1 animate-[sb-pop_0.5s_ease-out_both] flex-col justify-between gap-[calc(var(--u)*1)] px-[1.6vw] py-[calc(var(--u)*1.4)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[1vw]">
        <div className="flex min-w-0 items-center gap-[1vw]">
          <span
            className={cn(LABEL_AMBER, "text-[calc(var(--u)*2.6)] font-bold")}
          >
            Court
          </span>
          <Led value={String(m.court)} color="amber" h="calc(var(--u)*6)" />
          {m.label && (
            <span className="truncate font-sans text-[calc(var(--u)*2.2)] leading-none text-[#e8e4d6]">
              {m.label}
            </span>
          )}
        </div>
        <StatusCenter m={m} now={now} />
        <div className="flex items-center justify-end gap-[1.6vw]">
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

/**
 * Two-court badminton hall board — same LED look as the basketball board:
 * green ground, black panels, amber points/games, red clocks and game scores.
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
  const ids: CourtId[] = court ? [court] : [1, 2];
  return (
    <div
      className="flex h-full w-full flex-col gap-[calc(var(--u)*1.6)] overflow-hidden bg-[#0f3b2a] [background-image:radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)] px-[1.2vw] py-[calc(var(--u)*1.6)]"
      // Board unit: 1vh per court strip (1.5vh for a single court), capped for 16:9.
      style={
        {
          "--u": court ? "min(1.5vh, 0.8vw)" : "min(1vh, 0.5625vw)",
        } as CSSProperties
      }
    >
      {ids.map((id) => (
        <CourtStrip key={id} m={state.courts[id].match} now={now} />
      ))}
    </div>
  );
}
