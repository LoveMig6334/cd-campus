/** Sounds the hall board plays, served from public/audio/. */
export const BOARD_SOUNDS = [
  {
    id: "buzzer",
    labelEn: "Buzzer",
    labelTh: "เสียงหมดเวลา",
    file: "end_q.mp3",
  },
  {
    id: "shot",
    labelEn: "Shot clock",
    labelTh: "ช็อตคล็อก",
    file: "short clock.mp3",
  },
] as const;

export type BoardSoundId = (typeof BOARD_SOUNDS)[number]["id"];

export function isBoardSoundId(value: unknown): value is BoardSoundId {
  return BOARD_SOUNDS.some((s) => s.id === value);
}

/** The slice of a timed match the sound rules care about, sampled per tick. */
export type BoardSoundState = {
  matchId: string | null;
  period: number;
  finished: boolean;
  /** Clock at 0:00 while the match is still in play. */
  periodOver: boolean;
  shotClock: number | null;
};

/**
 * Sounds to play when the board's state moves from `prev` to `next`.
 * Transition-based so a reload of an already-expired period stays silent.
 */
export function soundsForTransition(
  prev: BoardSoundState,
  next: BoardSoundState,
): BoardSoundId[] {
  if (prev.matchId === null || prev.matchId !== next.matchId) return [];

  const out: BoardSoundId[] = [];
  const clockExpired = next.periodOver && !prev.periodOver;
  const endedEarly =
    !prev.periodOver &&
    (next.period > prev.period || (next.finished && !prev.finished));
  if (clockExpired || endedEarly) out.push("buzzer");

  if (prev.shotClock !== null && prev.shotClock > 0 && next.shotClock === 0) {
    out.push("shot");
  }
  return out;
}
