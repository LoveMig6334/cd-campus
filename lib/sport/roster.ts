import { isFouledOut, ON_COURT_MAX, type MatchPlayer } from "./rules";

/** Where a dragged jersey was dropped. A slot with no playerId is empty. */
export type RosterDropTarget =
  | { kind: "slot"; playerId?: string }
  | { kind: "bench" };

export type RosterMove =
  | { type: "court"; playerId: string }
  | { type: "bench"; playerId: string }
  | { type: "swap"; outId: string; inId: string };

/** Turn a drag/drop pair into the roster move it asks for, or null. */
export function resolveRosterDrop(
  players: MatchPlayer[],
  dragId: string,
  target: RosterDropTarget,
): RosterMove | null {
  const dragged = players.find((p) => p.id === dragId);
  if (!dragged) return null;

  if (target.kind === "bench") {
    return dragged.onCourt ? { type: "bench", playerId: dragged.id } : null;
  }

  if (dragged.onCourt || isFouledOut(dragged)) return null;

  if (target.playerId) {
    const out = players.find((p) => p.id === target.playerId);
    if (!out || !out.onCourt || out.team !== dragged.team) return null;
    return { type: "swap", outId: out.id, inId: dragged.id };
  }

  const courtSize = players.filter(
    (p) => p.team === dragged.team && p.onCourt,
  ).length;
  if (courtSize >= ON_COURT_MAX) return null;
  return { type: "court", playerId: dragged.id };
}
