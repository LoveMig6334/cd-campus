"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { RosterDropTarget } from "@/lib/sport/roster";
import type { TeamKey } from "@/lib/sport/rules";

/** Data attributes a drop zone declares so the hook can find it under the pointer. */
export function dropZoneProps(team: TeamKey, target: RosterDropTarget) {
  return {
    "data-drop-team": team,
    "data-drop-kind": target.kind,
    "data-drop-player": target.kind === "slot" ? target.playerId : undefined,
  };
}

export type DragState = {
  playerId: string;
  team: TeamKey;
  x: number;
  y: number;
  over: RosterDropTarget | null;
};

const THRESHOLD_PX = 6;

/** Read the drop zone under a point; zones belonging to another team don't count. */
function zoneAt(x: number, y: number, team: TeamKey): RosterDropTarget | null {
  const el = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-drop-kind]");
  if (!el || el.dataset.dropTeam !== team) return null;
  if (el.dataset.dropKind === "bench") return { kind: "bench" };
  return { kind: "slot", playerId: el.dataset.dropPlayer || undefined };
}

/**
 * Pointer-based drag for jersey cards. Works for mouse and touch alike; a
 * drag only starts once the pointer moves a few px so taps still reach buttons.
 */
export function useDragPlayer(
  onDrop: (playerId: string, target: RosterDropTarget) => void,
) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const armed = useRef<{
    playerId: string;
    team: TeamKey;
    startX: number;
    startY: number;
  } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    dragRef.current = drag;
    onDropRef.current = onDrop;
  });

  useEffect(() => {
    function move(e: PointerEvent) {
      const a = armed.current;
      if (!a) return;
      const cur = dragRef.current;
      if (!cur) {
        if (
          Math.hypot(e.clientX - a.startX, e.clientY - a.startY) < THRESHOLD_PX
        ) {
          return;
        }
      }
      e.preventDefault();
      setDrag({
        playerId: a.playerId,
        team: a.team,
        x: e.clientX,
        y: e.clientY,
        over: zoneAt(e.clientX, e.clientY, a.team),
      });
    }
    function up() {
      const cur = dragRef.current;
      armed.current = null;
      if (cur?.over) onDropRef.current(cur.playerId, cur.over);
      setDrag(null);
    }
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  /** Spread onto a jersey card to make it draggable. */
  function handleProps(playerId: string, team: TeamKey) {
    return {
      onPointerDown(e: ReactPointerEvent<HTMLElement>) {
        if (e.button !== 0) return;
        // Buttons inside the card (−1, ✕) keep their tap.
        if ((e.target as HTMLElement).closest("button")) return;
        armed.current = {
          playerId,
          team,
          startX: e.clientX,
          startY: e.clientY,
        };
      },
      style: { touchAction: "none" as const },
    };
  }

  return { drag, handleProps };
}
