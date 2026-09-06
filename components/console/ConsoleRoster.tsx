"use client";

import { useState, type FormEvent } from "react";
import type { MatchView } from "@/lib/types";
import {
  bench,
  isFouledOut,
  onCourt,
  ON_COURT_MAX,
  ROSTER_MAX,
  type MatchPlayer,
  type TeamKey,
} from "@/lib/sport/rules";
import {
  resolveRosterDrop,
  type RosterDropTarget,
  type RosterMove,
} from "@/lib/sport/roster";
import { HOUSE_HEX } from "@/lib/sport/colors";
import { cn } from "@/lib/cn";
import { Badge, Button, FIELD, Panel } from "@/components/console/ui";
import {
  dropZoneProps,
  useDragPlayer,
  type DragState,
} from "@/components/console/useDragPlayer";

type Props = {
  players: MatchPlayer[];
  houseA: MatchView["houseA"];
  houseB: MatchView["houseB"];
  onAdd: (team: TeamKey, number: number) => void;
  onRemove: (playerId: string) => void;
  onMove: (move: RosterMove) => void;
  /** −1 foul correction (only while live). */
  onFoulMinus: (playerId: string) => void;
  fixable: boolean;
};

type CardProps = {
  player: MatchPlayer;
  fixable: boolean;
  dragging: boolean;
  onFoulMinus: (playerId: string) => void;
  onRemove?: (playerId: string) => void;
  handle: Record<string, unknown>;
  className?: string;
};

function PlayerCard({
  player: p,
  fixable,
  dragging,
  onFoulMinus,
  onRemove,
  handle,
  className,
}: CardProps) {
  const out = isFouledOut(p);
  return (
    <div
      {...handle}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[13px] select-none",
        out && "text-gray-400",
        dragging && "opacity-30",
        className,
      )}
      aria-label={`#${p.number}${out ? " fouled out" : ""}`}
    >
      <span className="font-semibold tabular-nums">#{p.number}</span>
      {out && <Badge tone="gray">OUT</Badge>}
      <span className="ml-auto flex items-center gap-2 tabular-nums">
        <span
          className={cn("text-gray-500", out && "font-semibold text-red-600")}
          title="Fouls"
        >
          FL {p.fouls}
          <button
            type="button"
            disabled={!fixable || p.fouls === 0}
            onClick={() => onFoulMinus(p.id)}
            className="ml-1 cursor-pointer rounded border border-gray-200 px-1.5 text-[11px] text-gray-500 hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Remove a foul from #${p.number}`}
            title="−1 foul correction"
          >
            −1
          </button>
        </span>
        <span className="text-gray-500" title="Points">
          PTS {p.points}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(p.id)}
            className="cursor-pointer text-gray-400 hover:text-red-600"
            aria-label={`Remove #${p.number}`}
          >
            ✕
          </button>
        )}
      </span>
    </div>
  );
}

function isOver(drag: DragState | null, team: TeamKey, t: RosterDropTarget) {
  if (!drag || drag.team !== team || !drag.over) return false;
  if (drag.over.kind === "bench" || t.kind === "bench") {
    return drag.over.kind === t.kind;
  }
  return drag.over.playerId === t.playerId;
}

function TeamRoster({
  team,
  info,
  players,
  onAdd,
  onRemove,
  onFoulMinus,
  fixable,
  drag,
  handleProps,
}: Props & {
  team: TeamKey;
  info: MatchView["houseA"];
  drag: DragState | null;
  handleProps: (playerId: string, team: TeamKey) => Record<string, unknown>;
}) {
  const [number, setNumber] = useState("");
  const court = onCourt(players, team);
  const rest = bench(players, team);
  const total = court.length + rest.length;
  const full = total >= ROSTER_MAX;
  const emptySlots = Math.max(0, ON_COURT_MAX - court.length);
  const dragged =
    drag?.team === team
      ? players.find((p) => p.id === drag.playerId)
      : undefined;
  // Can the dragged bench player land on an empty slot / an on-court card?
  const canLand = (t: RosterDropTarget) =>
    !!dragged && resolveRosterDrop(players, dragged.id, t) !== null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(number);
    if (!Number.isInteger(n) || n < 0 || n > 99) return;
    onAdd(team, n);
    setNumber("");
  }

  const benchTarget: RosterDropTarget = { kind: "bench" };
  const benchActive = canLand(benchTarget);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-800">
        <span
          className="inline-block size-3 rounded-full"
          style={{ background: HOUSE_HEX[info.key] }}
        />
        {info.nameEn} · {info.nameTh}
        <span className="ml-auto text-[12px] font-normal text-gray-500">
          {court.length}/{ON_COURT_MAX} on court · {total}/{ROSTER_MAX}
        </span>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] tracking-wide text-gray-500 uppercase">
          On court · ในสนาม
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {court.map((p) => {
            const t: RosterDropTarget = { kind: "slot", playerId: p.id };
            const over = isOver(drag, team, t);
            return (
              <div key={p.id} {...dropZoneProps(team, t)}>
                <PlayerCard
                  player={p}
                  fixable={fixable}
                  dragging={drag?.playerId === p.id}
                  onFoulMinus={onFoulMinus}
                  handle={handleProps(p.id, team)}
                  className={cn(
                    "border-yellow bg-yellow/20",
                    canLand(t) && "border-dashed",
                    over && "ring-marine ring-2",
                  )}
                />
              </div>
            );
          })}
          {Array.from({ length: emptySlots }, (_, i) => {
            const t: RosterDropTarget = { kind: "slot" };
            const over = isOver(drag, team, t);
            return (
              <div
                key={`empty-${i}`}
                {...dropZoneProps(team, t)}
                className={cn(
                  "border-yellow bg-yellow/10 flex h-[38px] items-center justify-center rounded-lg border-2 border-dashed text-[11px] text-gray-500",
                  canLand(t) && "bg-yellow/40",
                  over && "ring-marine ring-2",
                )}
              >
                {i === 0 && court.length === 0 ? "Drag a player here" : ""}
              </div>
            );
          })}
        </div>
      </div>

      <div
        {...dropZoneProps(team, benchTarget)}
        className={cn(
          "rounded-xl border border-gray-200 bg-gray-50 p-2",
          benchActive && "border-dashed border-gray-400",
          isOver(drag, team, benchTarget) && "ring-marine ring-2",
        )}
      >
        <div className="mb-1.5 px-0.5 text-[11px] tracking-wide text-gray-500 uppercase">
          In team · ในทีม
        </div>
        {rest.length === 0 ? (
          <p className="px-0.5 pb-1 text-[13px] text-gray-500">
            {total === 0
              ? "No players yet — add jersey numbers below."
              : "Everyone is on court."}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {rest.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                fixable={fixable}
                dragging={drag?.playerId === p.id}
                onFoulMinus={onFoulMinus}
                onRemove={onRemove}
                handle={handleProps(p.id, team)}
              />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2">
        <label className="block w-28">
          <span className="text-[11px] text-gray-500">Jersey #</span>
          <input
            type="number"
            min={0}
            max={99}
            step={1}
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            disabled={full}
            className={cn(FIELD, "mt-0.5 px-2 py-1.5")}
          />
        </label>
        <Button type="submit" variant="ghost" disabled={full}>
          + Add
        </Button>
      </form>
    </div>
  );
}

/** Roster editor for timed sports — drag jerseys between the bench and the court. */
export function ConsoleRoster(props: Props) {
  const [open, setOpen] = useState(props.players.length === 0);
  const { drag, handleProps } = useDragPlayer((playerId, target) => {
    const move = resolveRosterDrop(props.players, playerId, target);
    if (move) props.onMove(move);
  });
  const ghost = drag
    ? props.players.find((p) => p.id === drag.playerId)
    : undefined;

  return (
    <Panel
      title="Roster · ผู้เล่น"
      aside={
        <Button
          variant="ghost"
          className="py-1.5"
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide" : "Edit roster"}
        </Button>
      }
    >
      {open ? (
        <div className="grid gap-6 md:grid-cols-2">
          <TeamRoster
            {...props}
            team="a"
            info={props.houseA}
            drag={drag}
            handleProps={handleProps}
          />
          <TeamRoster
            {...props}
            team="b"
            info={props.houseB}
            drag={drag}
            handleProps={handleProps}
          />
        </div>
      ) : (
        <p className="text-[13px] text-gray-500">
          {onCourt(props.players, "a").length} on court ·{" "}
          {onCourt(props.players, "b").length} on court — tap a jersey chip
          above before +1 / +2 / +3 / Foul to credit a player.
        </p>
      )}
      {drag && ghost && (
        <div
          aria-hidden
          className="border-yellow bg-yellow pointer-events-none fixed z-50 rounded-lg border px-3 py-1.5 text-[13px] font-semibold shadow-lg"
          style={{
            left: drag.x,
            top: drag.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          #{ghost.number}
        </div>
      )}
    </Panel>
  );
}
