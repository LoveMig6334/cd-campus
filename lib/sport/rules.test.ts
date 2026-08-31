import { describe, expect, it } from "vitest";
import {
  applyFoul,
  applyPoint,
  completedSetWinner,
  deriveFlags,
  endCurrentPeriod,
  firstServerOfSet,
  formatClock,
  initialState,
  isValidFormat,
  leaderForEarlyEnd,
  matchWinner,
  periodLabel,
  periodLengthSeconds,
  periodRemainingSeconds,
  setsToWin,
  setsWon,
  shotClockRemaining,
  SPORTS,
  totalPoints,
  type MatchFormat,
  type ScoreState,
  type SetScore,
  type TeamKey,
} from "./rules";

const VB = SPORTS.volleyball;
const BM = SPORTS.badminton;
const BB = SPORTS.basketball;
const F3_15: MatchFormat = { bestOf: 3, pointsToWin: 15, periodMinutes: null };
const F5_25: MatchFormat = { bestOf: 5, pointsToWin: 25, periodMinutes: null };
const BB4_7: MatchFormat = { bestOf: 4, pointsToWin: 15, periodMinutes: 7 };

function state(
  sets: SetScore[],
  serving: TeamKey = "a",
  fouls = { a: 0, b: 0 },
): ScoreState {
  return { sets, currentSet: sets.length, serving, fouls };
}

describe("format validation", () => {
  it("accepts odd best-of 1-9 and points 1-99 for set sports", () => {
    expect(isValidFormat("sets", F3_15)).toBe(true);
    expect(
      isValidFormat("sets", { ...F3_15, bestOf: 1, pointsToWin: 99 }),
    ).toBe(true);
    expect(isValidFormat("sets", { ...F3_15, bestOf: 4 })).toBe(false); // even
    expect(isValidFormat("sets", { ...F3_15, bestOf: 11 })).toBe(false);
    expect(isValidFormat("sets", { ...F3_15, pointsToWin: 0 })).toBe(false);
    expect(isValidFormat("sets", { ...F3_15, pointsToWin: 12.5 })).toBe(false);
  });

  it("accepts 1-12 periods and 1-60 minutes for timed sports", () => {
    expect(isValidFormat("timed", BB4_7)).toBe(true);
    expect(isValidFormat("timed", { ...BB4_7, bestOf: 2 })).toBe(true); // even ok
    expect(isValidFormat("timed", { ...BB4_7, bestOf: 13 })).toBe(false);
    expect(isValidFormat("timed", { ...BB4_7, periodMinutes: null })).toBe(
      false,
    );
    expect(isValidFormat("timed", { ...BB4_7, periodMinutes: 61 })).toBe(false);
    expect(isValidFormat("timed", { ...BB4_7, periodMinutes: 7.5 })).toBe(
      false,
    );
  });

  it("derives the advisory sets-to-win majority", () => {
    expect(setsToWin(F3_15)).toBe(2);
    expect(setsToWin(F5_25)).toBe(3);
    expect(setsToWin({ ...F3_15, bestOf: 1 })).toBe(1);
  });
});

describe("rally scoring", () => {
  it("adds a point and hands the serve to the scorer", () => {
    const r = applyPoint(initialState(), "b", 1);
    expect(r.ok && r.state.sets[0]).toEqual({ a: 0, b: 1 });
    expect(r.ok && r.state.serving).toBe("b");
  });

  it("floors at 0 on -1 and leaves serving unchanged on corrections", () => {
    expect(applyPoint(initialState(), "a", -1)).toEqual({
      ok: false,
      reason: "floor",
    });

    const up = applyPoint(initialState(), "a", 1);
    if (!up.ok) throw new Error("unexpected");
    const down = applyPoint(up.state, "a", -1);
    expect(down.ok && down.state.sets[0]).toEqual({ a: 0, b: 0 });
    expect(down.ok && down.state.serving).toBe("a");
  });

  it("never auto-ends a set — scoring continues past the target", () => {
    const r = applyPoint(state([{ a: 15, b: 14 }]), "a", 1);
    expect(r.ok && r.state.sets).toEqual([{ a: 16, b: 14 }]);
    expect(r.ok && r.state.currentSet).toBe(1);
  });
});

describe("admin-controlled set endings", () => {
  it("ends a set for the leader and opens the next", () => {
    const r = endCurrentPeriod(VB, F3_15, state([{ a: 15, b: 12 }]));
    if (!r.ok) throw new Error("unexpected");
    expect(r.setWonBy).toBe("a");
    expect(r.overtime).toBe(false);
    expect(r.state.sets).toEqual([
      { a: 15, b: 12 },
      { a: 0, b: 0 },
    ]);
    expect(r.state.currentSet).toBe(2);
  });

  it("allows ending below or above the advisory target", () => {
    expect(endCurrentPeriod(VB, F3_15, state([{ a: 9, b: 7 }])).ok).toBe(true);
    expect(endCurrentPeriod(VB, F3_15, state([{ a: 22, b: 20 }])).ok).toBe(
      true,
    );
  });

  it("refuses to end a tied set", () => {
    expect(endCurrentPeriod(VB, F3_15, state([{ a: 10, b: 10 }]))).toEqual({
      ok: false,
      reason: "tied",
    });
  });

  it("refuses to end the final possible set (end the match instead)", () => {
    const s = state([
      { a: 15, b: 10 },
      { a: 9, b: 15 },
      { a: 15, b: 13 },
    ]);
    expect(endCurrentPeriod(VB, F3_15, s)).toEqual({
      ok: false,
      reason: "last_set",
    });
  });

  it("volleyball alternates the first server; badminton gives it to the set winner", () => {
    const vb = endCurrentPeriod(VB, F5_25, state([{ a: 25, b: 20 }], "b"));
    expect(vb.ok && vb.state.serving).toBe("b"); // set 2 opens with B

    const bm = endCurrentPeriod(BM, F3_15, state([{ a: 10, b: 15 }], "a"));
    expect(bm.ok && bm.state.serving).toBe("b"); // winner serves next set

    expect(
      firstServerOfSet(
        "alternate",
        [
          { a: 25, b: 20 },
          { a: 20, b: 25 },
        ],
        3,
      ),
    ).toBe("a");
    expect(firstServerOfSet("prevSetWinner", [{ a: 10, b: 15 }], 2)).toBe("b");
  });
});

describe("set counting and advisory match winner", () => {
  it("counts only admin-closed sets by score comparison", () => {
    const s = state([
      { a: 15, b: 14 }, // closed, no win-by-2 needed
      { a: 9, b: 15 }, // closed
      { a: 3, b: 0 }, // current — not counted
    ]);
    expect(setsWon(s)).toEqual({ a: 1, b: 1 });
    expect(setsWon(s, true)).toEqual({ a: 2, b: 1 });
    expect(completedSetWinner({ a: 7, b: 7 })).toBeNull();
  });

  it("flags the advisory majority without freezing anything", () => {
    const s = state([
      { a: 15, b: 10 },
      { a: 15, b: 12 },
      { a: 0, b: 0 },
    ]);
    expect(matchWinner(VB, F3_15, s)).toBe("a");
    // scoring is still allowed — the engine only advises
    expect(applyPoint(s, "b", 1).ok).toBe(true);
  });
});

describe("advisory flags", () => {
  it("deuce at target-1 tie, set point for the leader at target-1+", () => {
    expect(deriveFlags(VB, F3_15, state([{ a: 14, b: 14 }])).deuce).toBe(true);
    expect(deriveFlags(VB, F3_15, state([{ a: 13, b: 13 }])).deuce).toBe(false);
    expect(deriveFlags(VB, F3_15, state([{ a: 14, b: 12 }])).setPoint).toBe(
      "a",
    );
    expect(deriveFlags(VB, F3_15, state([{ a: 16, b: 15 }])).setPoint).toBe(
      "a",
    );
    expect(
      deriveFlags(VB, F3_15, state([{ a: 14, b: 14 }])).setPoint,
    ).toBeNull();
  });

  it("escalates set point to match point one set from the majority", () => {
    const closing = state([
      { a: 15, b: 11 },
      { a: 14, b: 9 },
    ]);
    const flags = deriveFlags(VB, F3_15, closing);
    expect(flags.setPoint).toBe("a");
    expect(flags.matchPoint).toBe("a");

    const opening = deriveFlags(VB, F3_15, state([{ a: 14, b: 9 }]));
    expect(opening.matchPoint).toBeNull();
  });
});

describe("end-of-competition winner", () => {
  it("prefers the completed-sets leader, then current-set points, else null", () => {
    expect(
      leaderForEarlyEnd(
        VB,
        state([
          { a: 15, b: 10 },
          { a: 5, b: 9 },
        ]),
      ),
    ).toBe("a");
    expect(leaderForEarlyEnd(VB, state([{ a: 10, b: 12 }]))).toBe("b");
    expect(leaderForEarlyEnd(VB, state([{ a: 10, b: 10 }]))).toBeNull();
    expect(
      leaderForEarlyEnd(
        VB,
        state([
          { a: 15, b: 10 },
          { a: 10, b: 15 },
          { a: 7, b: 7 },
        ]),
      ),
    ).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Timed sports (basketball)                                            */
/* ------------------------------------------------------------------ */

describe("basketball scoring", () => {
  it("adds 1, 2 or 3 points and keeps fouls", () => {
    const s = state([{ a: 0, b: 0 }], "a", { a: 2, b: 0 });
    const r1 = applyPoint(s, "b", 3);
    expect(r1.ok && r1.state.sets[0]).toEqual({ a: 0, b: 3 });
    expect(r1.ok && r1.state.fouls).toEqual({ a: 2, b: 0 });
    const r2 = applyPoint(r1.ok ? r1.state : s, "a", 2);
    expect(r2.ok && r2.state.sets[0]).toEqual({ a: 2, b: 3 });
  });

  it("fouls accumulate per team and floor at 0", () => {
    const s = initialState();
    const r = applyFoul(s, "a", 1);
    expect(r.ok && r.state.fouls).toEqual({ a: 1, b: 0 });
    expect(r.ok && r.state.sets).toEqual(s.sets);
    expect(applyFoul(s, "b", -1)).toEqual({ ok: false, reason: "floor" });
  });

  it("sums total points across periods", () => {
    expect(
      totalPoints(
        state([
          { a: 10, b: 12 },
          { a: 5, b: 3 },
        ]),
      ),
    ).toEqual({ a: 15, b: 15 });
  });
});

describe("basketball periods", () => {
  it("ends a tied quarter and opens the next one, carrying fouls", () => {
    const r = endCurrentPeriod(
      BB,
      BB4_7,
      state([{ a: 10, b: 10 }], "a", { a: 3, b: 1 }),
    );
    expect(r.ok && r.state.currentSet).toBe(2);
    expect(r.ok && r.state.sets).toEqual([
      { a: 10, b: 10 },
      { a: 0, b: 0 },
    ]);
    expect(r.ok && r.state.fouls).toEqual({ a: 3, b: 1 });
    expect(r.ok && r.setWonBy).toBeNull();
    expect(r.ok && r.overtime).toBe(false);
  });

  it("opens overtime when the final period ends tied", () => {
    const s = state([
      { a: 10, b: 8 },
      { a: 5, b: 7 },
      { a: 9, b: 9 },
      { a: 4, b: 4 },
    ]);
    const r = endCurrentPeriod(BB, BB4_7, s);
    expect(r.ok && r.overtime).toBe(true);
    expect(r.ok && r.state.currentSet).toBe(5);

    const ot = state([...s.sets, { a: 3, b: 3 }]);
    const again = endCurrentPeriod(BB, BB4_7, ot);
    expect(again.ok && again.overtime).toBe(true); // OT2
    expect(again.ok && again.state.currentSet).toBe(6);
  });

  it("refuses to end a decided final period", () => {
    const s = state([
      { a: 10, b: 8 },
      { a: 5, b: 7 },
      { a: 9, b: 9 },
      { a: 6, b: 4 },
    ]);
    expect(endCurrentPeriod(BB, BB4_7, s)).toEqual({
      ok: false,
      reason: "last_set",
    });
    // …and a decided overtime period likewise
    const ot = state([...s.sets.slice(0, 3), { a: 4, b: 4 }, { a: 5, b: 2 }]);
    expect(endCurrentPeriod(BB, BB4_7, ot)).toEqual({
      ok: false,
      reason: "last_set",
    });
  });

  it("decides the winner on total points only", () => {
    const lead = state([
      { a: 10, b: 8 },
      { a: 5, b: 7 },
      { a: 9, b: 9 },
      { a: 6, b: 4 },
    ]);
    expect(leaderForEarlyEnd(BB, lead)).toBe("a");
    expect(matchWinner(BB, BB4_7, lead)).toBeNull(); // no set-majority concept
    expect(leaderForEarlyEnd(BB, state([{ a: 20, b: 20 }]))).toBeNull();
    expect(deriveFlags(BB, BB4_7, state([{ a: 14, b: 14 }]))).toEqual({
      deuce: false,
      setPoint: null,
      matchPoint: null,
    });
  });

  it("labels quarters and overtime", () => {
    expect(periodLabel(BB, BB4_7, 1)).toBe("Q1");
    expect(periodLabel(BB, BB4_7, 4)).toBe("Q4");
    expect(periodLabel(BB, BB4_7, 5)).toBe("OT");
    expect(periodLabel(BB, BB4_7, 6)).toBe("OT2");
    expect(periodLabel(VB, F3_15, 2)).toBe("Set 2");
  });
});

describe("basketball clock", () => {
  it("uses period minutes for regulation and 5 min for overtime", () => {
    expect(periodLengthSeconds(BB, BB4_7, 1)).toBe(420);
    expect(periodLengthSeconds(BB, BB4_7, 4)).toBe(420);
    expect(periodLengthSeconds(BB, BB4_7, 5)).toBe(300);
    expect(periodLengthSeconds(BB, { ...BB4_7, periodMinutes: null }, 1)).toBe(
      420,
    );
  });

  it("counts down from the period offset and holds at zero", () => {
    const t0 = Date.parse("2026-08-31T03:00:00Z");
    const clock = {
      timerSeconds: 100,
      timerStartedAt: "2026-08-31T03:00:00Z",
      periodStartedSeconds: 100,
      currentSet: 2,
    };
    expect(periodRemainingSeconds(BB, BB4_7, clock, t0 + 30_000)).toBe(390);
    expect(periodRemainingSeconds(BB, BB4_7, clock, t0 + 999_000)).toBe(0);
    expect(
      periodRemainingSeconds(BB, BB4_7, { ...clock, timerStartedAt: null }, t0),
    ).toBe(420);
    expect(formatClock(390)).toBe("06:30");
    expect(formatClock(0)).toBe("00:00");
  });
});

describe("shot clock", () => {
  const t0 = Date.parse("2026-08-31T03:00:00Z");

  it("counts down from ends_at while running, ceil to whole seconds, floored at 0", () => {
    const sc = {
      shotClockEndsAt: "2026-08-31T03:00:24Z",
      shotClockRemaining: null,
    };
    expect(shotClockRemaining(sc, t0)).toBe(24);
    expect(shotClockRemaining(sc, t0 + 10_400)).toBe(14);
    expect(shotClockRemaining(sc, t0 + 30_000)).toBe(0);
  });

  it("shows the frozen value while paused and null when cleared", () => {
    expect(
      shotClockRemaining({ shotClockEndsAt: null, shotClockRemaining: 9 }, t0),
    ).toBe(9);
    expect(
      shotClockRemaining(
        { shotClockEndsAt: null, shotClockRemaining: null },
        t0,
      ),
    ).toBeNull();
  });
});
