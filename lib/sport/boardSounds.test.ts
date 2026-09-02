import { describe, expect, it } from "vitest";
import { soundsForTransition, type BoardSoundState } from "./boardSounds";

const base: BoardSoundState = {
  matchId: "m1",
  period: 1,
  finished: false,
  periodOver: false,
  shotClock: null,
};

describe("soundsForTransition", () => {
  it("buzzes when the period clock reaches 0:00", () => {
    expect(soundsForTransition(base, { ...base, periodOver: true })).toEqual([
      "buzzer",
    ]);
  });

  it("does not buzz again while the clock stays at 0:00", () => {
    const over = { ...base, periodOver: true };
    expect(soundsForTransition(over, over)).toEqual([]);
  });

  it("buzzes when a period is ended early by the operator", () => {
    expect(soundsForTransition(base, { ...base, period: 2 })).toEqual([
      "buzzer",
    ]);
    expect(soundsForTransition(base, { ...base, finished: true })).toEqual([
      "buzzer",
    ]);
  });

  it("does not buzz on End period after the clock already expired", () => {
    const over = { ...base, periodOver: true };
    expect(soundsForTransition(over, { ...base, period: 2 })).toEqual([]);
    expect(soundsForTransition(over, { ...base, finished: true })).toEqual([]);
  });

  it("sounds the horn when the shot clock runs out", () => {
    expect(
      soundsForTransition(
        { ...base, shotClock: 1 },
        { ...base, shotClock: 0 },
      ),
    ).toEqual(["shot"]);
  });

  it("stays quiet when the shot clock is reset or cleared", () => {
    expect(
      soundsForTransition({ ...base, shotClock: 0 }, { ...base, shotClock: 0 }),
    ).toEqual([]);
    expect(
      soundsForTransition(
        { ...base, shotClock: 3 },
        { ...base, shotClock: 24 },
      ),
    ).toEqual([]);
    expect(
      soundsForTransition(
        { ...base, shotClock: 3 },
        { ...base, shotClock: null },
      ),
    ).toEqual([]);
  });

  it("stays quiet when a different match (or the first load) arrives", () => {
    expect(
      soundsForTransition(
        { ...base, matchId: null },
        { ...base, periodOver: true, shotClock: 0 },
      ),
    ).toEqual([]);
    expect(
      soundsForTransition(base, {
        ...base,
        matchId: "m2",
        period: 3,
        periodOver: true,
      }),
    ).toEqual([]);
  });

  it("can report both sounds in one tick", () => {
    expect(
      soundsForTransition(
        { ...base, shotClock: 2 },
        { ...base, periodOver: true, shotClock: 0 },
      ),
    ).toEqual(["buzzer", "shot"]);
  });
});
