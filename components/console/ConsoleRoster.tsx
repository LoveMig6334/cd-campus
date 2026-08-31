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
import { HOUSE_HEX } from "@/lib/sport/colors";
import { cn } from "@/lib/cn";
import { Badge, Button, FIELD, Panel } from "@/components/console/ui";

type Props = {
  players: MatchPlayer[];
  houseA: MatchView["houseA"];
  houseB: MatchView["houseB"];
  onAdd: (team: TeamKey, number: number, name: string) => void;
  onRemove: (playerId: string) => void;
  onToggle: (playerId: string) => void;
  /** −1 foul correction (only while live). */
  onFoulMinus: (playerId: string) => void;
  fixable: boolean;
};

function TeamRoster({
  team,
  info,
  players,
  onAdd,
  onRemove,
  onToggle,
  onFoulMinus,
  fixable,
}: Props & { team: TeamKey; info: MatchView["houseA"] }) {
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const court = onCourt(players, team);
  const rest = bench(players, team);
  const all = [...court, ...rest];
  const full = all.length >= ROSTER_MAX;

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(number);
    if (!Number.isInteger(n) || n < 0 || n > 99) return;
    onAdd(team, n, name);
    setNumber("");
    setName("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-800">
        <span
          className="inline-block size-3 rounded-full"
          style={{ background: HOUSE_HEX[info.key] }}
        />
        {info.nameEn} · {info.nameTh}
        <span className="ml-auto text-[12px] font-normal text-gray-500">
          {court.length}/{ON_COURT_MAX} on court · {all.length}/{ROSTER_MAX}
        </span>
      </div>

      {all.length === 0 ? (
        <p className="text-[13px] text-gray-500">
          No players yet — add jersey numbers below.
        </p>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-wide text-gray-500 uppercase">
              <th className="py-1 pr-2 font-medium">On court</th>
              <th className="py-1 pr-2 font-medium">#</th>
              <th className="py-1 pr-2 font-medium">Name</th>
              <th className="py-1 pr-2 text-right font-medium">FL</th>
              <th className="py-1 pr-2 text-right font-medium">PTS</th>
              <th className="py-1">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {all.map((p) => {
              const out = isFouledOut(p);
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-t border-gray-100",
                    out && "text-gray-400",
                  )}
                >
                  <td className="py-1.5 pr-2">
                    <input
                      type="checkbox"
                      checked={p.onCourt}
                      disabled={!p.onCourt && court.length >= ON_COURT_MAX}
                      onChange={() => onToggle(p.id)}
                      aria-label={`#${p.number} on court`}
                      className="accent-marine size-4"
                    />
                  </td>
                  <td className="py-1.5 pr-2 font-semibold tabular-nums">
                    #{p.number}
                  </td>
                  <td className="py-1.5 pr-2">
                    {p.name ?? <span className="text-gray-400">—</span>}
                    {out && (
                      <Badge tone="gray" className="ml-2">
                        OUT
                      </Badge>
                    )}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 pr-2 text-right tabular-nums",
                      out && "font-semibold text-red-600",
                    )}
                  >
                    {p.fouls}
                    <button
                      type="button"
                      disabled={!fixable || p.fouls === 0}
                      onClick={() => onFoulMinus(p.id)}
                      className="ml-1.5 cursor-pointer rounded border border-gray-200 px-1.5 text-[11px] text-gray-500 hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Remove a foul from #${p.number}`}
                      title="−1 foul correction"
                    >
                      −1
                    </button>
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {p.points}
                  </td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(p.id)}
                      className="cursor-pointer text-gray-400 hover:text-red-600"
                      aria-label={`Remove #${p.number}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <label className="block w-20">
          <span className="text-[11px] text-gray-500">#</span>
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
        <label className="block flex-1">
          <span className="text-[11px] text-gray-500">Name (optional)</span>
          <input
            type="text"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
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

/** Roster editor for timed sports — jersey numbers, on-court flags, stats. */
export function ConsoleRoster(props: Props) {
  const [open, setOpen] = useState(props.players.length === 0);
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
          <TeamRoster {...props} team="a" info={props.houseA} />
          <TeamRoster {...props} team="b" info={props.houseB} />
        </div>
      ) : (
        <p className="text-[13px] text-gray-500">
          {onCourt(props.players, "a").length} on court ·{" "}
          {onCourt(props.players, "b").length} on court — tap a jersey chip
          above before +1 / +2 / +3 / Foul to credit a player.
        </p>
      )}
    </Panel>
  );
}
