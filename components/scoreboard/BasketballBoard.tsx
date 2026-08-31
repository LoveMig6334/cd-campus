import type { CSSProperties, ReactNode } from "react";
import type { MatchView } from "@/lib/types";
import {
  clockOfMatch,
  displayClockSeconds,
  formatClock,
  formatOfMatch,
  isTimed,
  onCourt,
  ON_COURT_MAX,
  periodLengthSeconds,
  PLAYER_FOUL_LIMIT,
  shotClockRemaining,
  SPORTS,
  stateOfMatch,
  totalPoints,
  type MatchPlayer,
  type TeamKey,
} from "@/lib/sport/rules";
import { HOUSE_HEX } from "@/lib/sport/colors";
import { cn } from "@/lib/cn";
import { Led, ledPad, ledPadEnd } from "@/components/scoreboard/LedDigits";

const LAST_FOUL_HOLD_MS = 15_000;

const LABEL =
  "font-mono uppercase tracking-[0.22em] text-[calc(var(--u)*2)] leading-none text-[#e8e4d6]";
const LABEL_AMBER = cn(LABEL, "text-[#ffb020]");

function PanelBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-[calc(var(--u)*0.6)] border-[calc(var(--u)*0.35)] border-[#d9d4c2] bg-[#101311] shadow-[inset_0_0_calc(var(--u)*4)_rgba(0,0,0,0.7)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Left/right player panel: PLY · FL · PTS for the five on court. One grid for
 * header + rows so the columns line up, sized to content and centred as a
 * whole (equal margins either side); rows spread over the panel height.
 */
function PlayerPanel({
  players,
  side,
}: {
  players: MatchPlayer[];
  side: "left" | "right";
}) {
  const rows = Array.from({ length: ON_COURT_MAX }, (_, i) => players[i]);
  return (
    <PanelBox
      className={cn(
        "grid h-full grid-cols-[auto_auto_auto] content-start justify-center justify-items-center gap-x-[1vw] gap-y-[calc(var(--u)*1.6)] px-[1vw] py-[calc(var(--u)*2)]",
        side === "left"
          ? "animate-[sb-slam-left_0.55s_ease-out_both]"
          : "animate-[sb-slam-right_0.55s_ease-out_both]",
      )}
    >
      <span className={LABEL_AMBER}>Ply</span>
      <span className={LABEL_AMBER}>Fl</span>
      <span className={cn(LABEL_AMBER, "ml-[1.6vw]")}>Pts</span>
      {rows.map((p, i) => {
        const out = p !== undefined && p.fouls >= PLAYER_FOUL_LIMIT;
        const cls = cn("contents", out && "opacity-45");
        return (
          <div key={p?.id ?? `empty-${i}`} className={cls}>
            <Led
              value={p ? ledPad(p.number, 2) : "  "}
              color="amber"
              h="calc(var(--u)*7.2)"
              dim={!p}
              className={cn(out && "opacity-45")}
            />
            <Led
              value={p ? String(p.fouls) : " "}
              color="red"
              h="calc(var(--u)*7.2)"
              dim={!p}
              className={cn(out && "opacity-45")}
            />
            <Led
              value={p ? ledPad(p.points, 2) : "  "}
              color="red"
              h="calc(var(--u)*7.2)"
              dim={!p}
              className={cn("ml-[1.6vw]", out && "opacity-45")}
            />
          </div>
        );
      })}
    </PanelBox>
  );
}

function TeamName({
  info,
  align,
}: {
  info: MatchView["houseA"];
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[calc(var(--u)*0.6)]",
        align === "left" ? "items-start" : "items-end",
      )}
    >
      <span className="font-mono text-[calc(var(--u)*3.4)] leading-none font-bold tracking-[0.16em] text-[#ffb020] uppercase drop-shadow-[0_0_calc(var(--u)*0.4)_rgba(255,176,32,0.6)]">
        {info.nameEn}
      </span>
      <span className="flex items-center gap-[0.6vw] font-sans text-[calc(var(--u)*2)] leading-none text-[#e8e4d6]">
        <span
          className="inline-block h-[calc(var(--u)*1.2)] w-[3vw] rounded-full"
          style={{ background: HOUSE_HEX[info.key] }}
        />
        {info.nameTh}
      </span>
    </div>
  );
}

/**
 * Basketball hall board — classic LED gym scoreboard: player panels either
 * side, clock / period / scores / fouls / timeouts in the middle. Colours
 * follow real boards (red clock & fouls, amber scores), digits are SVG.
 */
export function BasketballBoard({
  match,
  now,
}: {
  match: MatchView;
  now: number;
}) {
  const config = SPORTS[match.sport];
  const format = formatOfMatch(match);
  const state = stateOfMatch(match);
  const pre = match.status === "scheduled";
  const finished = match.status === "finished";
  const paused = match.status === "paused";
  const total = totalPoints(state);
  const timed = isTimed(config);

  const clockSeconds = pre
    ? periodLengthSeconds(config, format, 1)
    : displayClockSeconds(config, format, clockOfMatch(match), now);
  const clock = formatClock(clockSeconds);
  const periodOver = !pre && !finished && clockSeconds === 0;
  const overtime = match.currentSet > match.bestOf;
  const shot = !pre && !finished ? shotClockRemaining(match, now) : null;

  const lastFoul =
    match.lastPlayerFoul &&
    now - Date.parse(match.lastPlayerFoul.at) < LAST_FOUL_HOLD_MS
      ? match.lastPlayerFoul
      : null;

  const sideStats = (team: TeamKey) => (
    <div className="flex items-end gap-[1.6vw]">
      <div className="flex flex-col items-center gap-[calc(var(--u)*0.8)]">
        <span className={LABEL}>Fouls</span>
        <Led
          value={String(match.fouls[team])}
          color="red"
          h="calc(var(--u)*9)"
          className={cn(
            timed &&
              config.kind === "timed" &&
              match.fouls[team] >= config.foulBonusAt &&
              "animate-pulse",
          )}
        />
      </div>
      <div className="flex flex-col items-center gap-[calc(var(--u)*0.8)]">
        <span className={LABEL}>T.O.L.</span>
        <Led
          value={String(match.timeouts[team])}
          color="amber"
          h="calc(var(--u)*6.5)"
        />
      </div>
    </div>
  );

  return (
    <div
      className="grid h-full w-full grid-cols-[minmax(0,1fr)_minmax(0,2.3fr)_minmax(0,1fr)] gap-[1vw] overflow-hidden bg-[#0f3b2a] [background-image:radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)] px-[1.2vw] py-[calc(var(--u)*1.6)]"
      // Board unit: 1vh, capped so a 16:9 design still fits narrower screens.
      style={{ "--u": "min(1vh, 0.5625vw)" } as CSSProperties}
    >
      <PlayerPanel players={onCourt(match.players, "a")} side="left" />

      <PanelBox className="flex animate-[sb-pop_0.5s_ease-out_both] flex-col justify-between px-[1.4vw] py-[calc(var(--u)*1.6)]">
        {/* Clock row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[1vw]">
          <TeamName info={match.houseA} align="left" />
          <div className="flex flex-col items-center gap-[calc(var(--u)*0.8)]">
            {finished ? (
              <span className="font-mono text-[calc(var(--u)*10)] leading-none font-bold tracking-[0.2em] text-[#ff3b30] drop-shadow-[0_0_calc(var(--u)*0.6)_rgba(255,59,48,0.7)]">
                FINAL
              </span>
            ) : (
              <Led
                value={clock}
                color="red"
                h="calc(var(--u)*14)"
                className={cn(periodOver && "animate-pulse")}
              />
            )}
            {pre && (
              <span className={cn(LABEL, "text-[calc(var(--u)*1.8)]")}>
                Starting soon · เริ่มเร็ว ๆ นี้
              </span>
            )}
            {paused && (
              <span className="rounded-[calc(var(--u)*0.4)] bg-[#e8e4d6] px-[1vw] py-[calc(var(--u)*0.4)] font-mono text-[calc(var(--u)*1.8)] leading-none tracking-[0.24em] text-[#101311] uppercase">
                ‖ Paused · พัก
              </span>
            )}
          </div>
          <TeamName info={match.houseB} align="right" />
        </div>

        {/* Period + shot clock */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="justify-self-end pr-[2vw]">
            {shot !== null && match.shotClockTeam === "a" && (
              <div className="flex flex-col items-center gap-[calc(var(--u)*0.6)]">
                <span className={LABEL}>Shot</span>
                <Led
                  value={ledPad(shot, 2)}
                  color="red"
                  h="calc(var(--u)*7)"
                  className={cn(shot <= 5 && "animate-pulse")}
                />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-[calc(var(--u)*0.8)]">
            <span className={LABEL}>Period</span>
            {overtime ? (
              <span className="font-mono text-[calc(var(--u)*7)] leading-none font-bold tracking-[0.14em] text-[#ffb020] drop-shadow-[0_0_calc(var(--u)*0.5)_rgba(255,176,32,0.7)]">
                OT
                {match.currentSet - match.bestOf > 1
                  ? match.currentSet - match.bestOf
                  : ""}
              </span>
            ) : (
              <Led
                value={String(match.currentSet)}
                color="amber"
                h="calc(var(--u)*8)"
                dim={pre}
              />
            )}
          </div>
          <div className="justify-self-start pl-[2vw]">
            {shot !== null && match.shotClockTeam === "b" && (
              <div className="flex flex-col items-center gap-[calc(var(--u)*0.6)]">
                <span className={LABEL}>Shot</span>
                <Led
                  value={ledPad(shot, 2)}
                  color="red"
                  h="calc(var(--u)*7)"
                  className={cn(shot <= 5 && "animate-pulse")}
                />
              </div>
            )}
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-[1vw]">
          <div className="justify-self-start">
            <Led
              value={ledPad(total.a, 3)}
              color="amber"
              h="calc(var(--u)*13)"
              dim={pre}
            />
          </div>
          <div className="flex flex-col items-center gap-[calc(var(--u)*0.8)] px-[2vw]">
            <span className={LABEL}>Player foul</span>
            <div className="flex items-center gap-[1vw]">
              <Led
                value={lastFoul ? ledPad(lastFoul.number, 2) : "  "}
                color="red"
                h="calc(var(--u)*6)"
                dim={!lastFoul}
              />
              <Led
                value={lastFoul ? String(lastFoul.fouls) : " "}
                color="red"
                h="calc(var(--u)*6)"
                dim={!lastFoul}
              />
            </div>
            {lastFoul && (
              <span className={cn(LABEL, "text-[calc(var(--u)*1.6)]")}>
                {(lastFoul.team === "a" ? match.houseA : match.houseB).nameEn}
              </span>
            )}
          </div>
          <div className="justify-self-end">
            <Led
              value={ledPadEnd(total.b, 3)}
              color="amber"
              h="calc(var(--u)*13)"
              dim={pre}
            />
          </div>
        </div>

        {/* Fouls + timeouts, bottom labels */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end">
          <div className="justify-self-start">{sideStats("a")}</div>
          <span
            className={cn(
              LABEL,
              "pb-[calc(var(--u)*1)] text-[calc(var(--u)*2.4)]",
            )}
          >
            {finished
              ? "Final · จบการแข่งขัน"
              : `${match.bestOf} × ${match.periodMinutes} min`}
          </span>
          <div className="justify-self-end">{sideStats("b")}</div>
        </div>
        <div className="grid grid-cols-3 pt-[calc(var(--u)*1)] text-center">
          <span
            className={cn(
              LABEL,
              "justify-self-start text-[calc(var(--u)*2.6)] font-bold",
            )}
          >
            Score
          </span>
          <span className={cn(LABEL, "text-[calc(var(--u)*2.6)] font-bold")}>
            Match
          </span>
          <span
            className={cn(
              LABEL,
              "justify-self-end text-[calc(var(--u)*2.6)] font-bold",
            )}
          >
            Score
          </span>
        </div>
      </PanelBox>

      <PlayerPanel players={onCourt(match.players, "b")} side="right" />
    </div>
  );
}
