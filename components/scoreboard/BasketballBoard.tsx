import type { ReactNode } from "react";
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
import { Led, ledPad } from "@/components/scoreboard/LedDigits";

const LAST_FOUL_HOLD_MS = 15_000;

const LABEL =
  "font-mono uppercase tracking-[0.22em] text-[2vh] leading-none text-[#e8e4d6]";
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
        "rounded-[0.6vh] border-[0.35vh] border-[#d9d4c2] bg-[#101311] shadow-[inset_0_0_4vh_rgba(0,0,0,0.7)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Left/right player panel: PLY · FL · PTS for the five on court. */
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
        "flex h-full flex-col gap-[1.6vh] px-[1.2vw] py-[2vh]",
        side === "left"
          ? "animate-[sb-slam-left_0.55s_ease-out_both]"
          : "animate-[sb-slam-right_0.55s_ease-out_both]",
      )}
    >
      <div className="grid grid-cols-[1.3fr_1fr_1fr] text-center">
        <span className={LABEL_AMBER}>Ply</span>
        <span className={LABEL_AMBER}>Fl</span>
        <span className={LABEL_AMBER}>Pts</span>
      </div>
      {rows.map((p, i) => {
        const out = p !== undefined && p.fouls >= PLAYER_FOUL_LIMIT;
        return (
          <div
            key={p?.id ?? `empty-${i}`}
            className={cn(
              "grid grid-cols-[1.3fr_1fr_1fr] items-center justify-items-center",
              out && "opacity-45",
            )}
          >
            <Led
              value={p ? ledPad(p.number, 2) : "  "}
              color="amber"
              h="7.2vh"
              dim={!p}
            />
            <Led
              value={p ? String(p.fouls) : " "}
              color="red"
              h="7.2vh"
              dim={!p}
            />
            <Led
              value={p ? ledPad(p.points, 2) : "  "}
              color="red"
              h="7.2vh"
              dim={!p}
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
        "flex flex-col gap-[0.6vh]",
        align === "left" ? "items-start" : "items-end",
      )}
    >
      <span className="font-mono text-[3.4vh] leading-none font-bold tracking-[0.16em] text-[#ffb020] uppercase drop-shadow-[0_0_0.4vh_rgba(255,176,32,0.6)]">
        {info.nameEn}
      </span>
      <span className="flex items-center gap-[0.6vw] font-sans text-[2vh] leading-none text-[#e8e4d6]">
        <span
          className="inline-block h-[1.2vh] w-[3vw] rounded-full"
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
      <div className="flex flex-col items-center gap-[0.8vh]">
        <span className={LABEL}>Fouls</span>
        <Led
          value={String(match.fouls[team])}
          color="red"
          h="9vh"
          className={cn(
            timed &&
              config.kind === "timed" &&
              match.fouls[team] >= config.foulBonusAt &&
              "animate-pulse",
          )}
        />
      </div>
      <div className="flex flex-col items-center gap-[0.8vh]">
        <span className={LABEL}>T.O.L.</span>
        <Led value={String(match.timeouts[team])} color="amber" h="6.5vh" />
      </div>
    </div>
  );

  return (
    <div className="grid h-full w-full grid-cols-[1fr_2.3fr_1fr] gap-[1vw] bg-[#0f3b2a] [background-image:radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)] px-[1.2vw] py-[1.6vh]">
      <PlayerPanel players={onCourt(match.players, "a")} side="left" />

      <PanelBox className="flex animate-[sb-pop_0.5s_ease-out_both] flex-col justify-between px-[1.4vw] py-[1.6vh]">
        {/* Clock row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[1vw]">
          <TeamName info={match.houseA} align="left" />
          <div className="flex flex-col items-center gap-[0.8vh]">
            {finished ? (
              <span className="font-mono text-[10vh] leading-none font-bold tracking-[0.2em] text-[#ff3b30] drop-shadow-[0_0_0.6vh_rgba(255,59,48,0.7)]">
                FINAL
              </span>
            ) : (
              <Led
                value={clock}
                color="red"
                h="14vh"
                className={cn(periodOver && "animate-pulse")}
              />
            )}
            {pre && (
              <span className={cn(LABEL, "text-[1.8vh]")}>
                Starting soon · เริ่มเร็ว ๆ นี้
              </span>
            )}
            {paused && (
              <span className="rounded-[0.4vh] bg-[#e8e4d6] px-[1vw] py-[0.4vh] font-mono text-[1.8vh] leading-none tracking-[0.24em] text-[#101311] uppercase">
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
              <div className="flex flex-col items-center gap-[0.6vh]">
                <span className={LABEL}>Shot</span>
                <Led
                  value={ledPad(shot, 2)}
                  color="red"
                  h="7vh"
                  className={cn(shot <= 5 && "animate-pulse")}
                />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-[0.8vh]">
            <span className={LABEL}>Period</span>
            {overtime ? (
              <span className="font-mono text-[7vh] leading-none font-bold tracking-[0.14em] text-[#ffb020] drop-shadow-[0_0_0.5vh_rgba(255,176,32,0.7)]">
                OT
                {match.currentSet - match.bestOf > 1
                  ? match.currentSet - match.bestOf
                  : ""}
              </span>
            ) : (
              <Led
                value={String(match.currentSet)}
                color="amber"
                h="8vh"
                dim={pre}
              />
            )}
          </div>
          <div className="justify-self-start pl-[2vw]">
            {shot !== null && match.shotClockTeam === "b" && (
              <div className="flex flex-col items-center gap-[0.6vh]">
                <span className={LABEL}>Shot</span>
                <Led
                  value={ledPad(shot, 2)}
                  color="red"
                  h="7vh"
                  className={cn(shot <= 5 && "animate-pulse")}
                />
              </div>
            )}
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="justify-self-start">
            <Led value={ledPad(total.a, 3)} color="amber" h="19vh" dim={pre} />
          </div>
          <div className="flex flex-col items-center gap-[0.8vh] px-[2vw]">
            <span className={LABEL}>Player foul</span>
            <div className="flex items-center gap-[1vw]">
              <Led
                value={lastFoul ? ledPad(lastFoul.number, 2) : "  "}
                color="red"
                h="7vh"
                dim={!lastFoul}
              />
              <Led
                value={lastFoul ? String(lastFoul.fouls) : " "}
                color="red"
                h="7vh"
                dim={!lastFoul}
              />
            </div>
            {lastFoul && (
              <span className={cn(LABEL, "text-[1.6vh]")}>
                {(lastFoul.team === "a" ? match.houseA : match.houseB).nameEn}
              </span>
            )}
          </div>
          <div className="justify-self-end">
            <Led value={ledPad(total.b, 3)} color="amber" h="19vh" dim={pre} />
          </div>
        </div>

        {/* Fouls + timeouts, bottom labels */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end">
          <div className="justify-self-start">{sideStats("a")}</div>
          <span className={cn(LABEL, "pb-[1vh] text-[2.4vh]")}>
            {finished
              ? "Final · จบการแข่งขัน"
              : `${match.bestOf} × ${match.periodMinutes} min`}
          </span>
          <div className="justify-self-end">{sideStats("b")}</div>
        </div>
        <div className="grid grid-cols-3 pt-[1vh] text-center">
          <span
            className={cn(LABEL, "justify-self-start text-[2.6vh] font-bold")}
          >
            Score
          </span>
          <span className={cn(LABEL, "text-[2.6vh] font-bold")}>Match</span>
          <span
            className={cn(LABEL, "justify-self-end text-[2.6vh] font-bold")}
          >
            Score
          </span>
        </div>
      </PanelBox>

      <PlayerPanel players={onCourt(match.players, "b")} side="right" />
    </div>
  );
}
