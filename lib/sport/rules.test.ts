import { describe, expect, it } from "vitest";
import {
  applyPoint,
  completedSetWinner,
  deriveFlags,
  endCurrentSet,
  firstServerOfSet,
  initialState,
  isValidFormat,
  leaderForEarlyEnd,
  matchWinner,
  setsToWin,
  setsWon,
  type MatchFormat,
  type ScoreState,
  type SetScore,
  type TeamKey,
} from "./rules";

const F3_15: MatchFormat = { bestOf: 3, pointsToWin: 15 };
const F5_25: MatchFormat = { bestOf: 5, pointsToWin: 25 };

function state(sets: SetScore[], serving: TeamKey = "a"): ScoreState {
  return { sets, currentSet: sets.length, serving };
}

describe("format validation", () => {
  it("accepts odd best-of 1-9 and points 1-99", () => {
    expect(isValidFormat({ bestOf: 3, pointsToWin: 15 })).toBe(true);
    expect(isValidFormat({ bestOf: 1, pointsToWin: 99 })).toBe(true);
    expect(isValidFormat({ bestOf: 4, pointsToWin: 15 })).toBe(false); // even
    expect(isValidFormat({ bestOf: 11, pointsToWin: 15 })).toBe(false);
    expect(isValidFormat({ bestOf: 3, pointsToWin: 0 })).toBe(false);
    expect(isValidFormat({ bestOf: 3, pointsToWin: 12.5 })).toBe(false);
  });

  it("derives the advisory sets-to-win majority", () => {
    expect(setsToWin(F3_15)).toBe(2);
    expect(setsToWin(F5_25)).toBe(3);
    expect(setsToWin({ bestOf: 1, pointsToWin: 15 })).toBe(1);
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
    const r = endCurrentSet("alternate", F3_15, state([{ a: 15, b: 12 }]));
    if (!r.ok) throw new Error("unexpected");
    expect(r.setWonBy).toBe("a");
    expect(r.state.sets).toEqual([
      { a: 15, b: 12 },
      { a: 0, b: 0 },
    ]);
    expect(r.state.currentSet).toBe(2);
  });

  it("allows ending below or above the advisory target", () => {
    expect(endCurrentSet("alternate", F3_15, state([{ a: 9, b: 7 }])).ok).toBe(
      true,
    );
    expect(
      endCurrentSet("alternate", F3_15, state([{ a: 22, b: 20 }])).ok,
    ).toBe(true);
  });

  it("refuses to end a tied set", () => {
    expect(
      endCurrentSet("alternate", F3_15, state([{ a: 10, b: 10 }])),
    ).toEqual({ ok: false, reason: "tied" });
  });

  it("refuses to end the final possible set (end the match instead)", () => {
    const s = state([
      { a: 15, b: 10 },
      { a: 9, b: 15 },
      { a: 15, b: 13 },
    ]);
    expect(endCurrentSet("alternate", F3_15, s)).toEqual({
      ok: false,
      reason: "last_set",
    });
  });

  it("volleyball alternates the first server; badminton gives it to the set winner", () => {
    const vb = endCurrentSet(
      "alternate",
      F5_25,
      state([{ a: 25, b: 20 }], "b"),
    );
    expect(vb.ok && vb.state.serving).toBe("b"); // set 2 opens with B

    const bm = endCurrentSet(
      "prevSetWinner",
      F3_15,
      state([{ a: 10, b: 15 }], "a"),
    );
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
    expect(matchWinner(F3_15, s)).toBe("a");
    // scoring is still allowed — the engine only advises
    expect(applyPoint(s, "b", 1).ok).toBe(true);
  });
});

describe("advisory flags", () => {
  it("deuce at target-1 tie, set point for the leader at target-1+", () => {
    expect(deriveFlags(F3_15, state([{ a: 14, b: 14 }])).deuce).toBe(true);
    expect(deriveFlags(F3_15, state([{ a: 13, b: 13 }])).deuce).toBe(false);
    expect(deriveFlags(F3_15, state([{ a: 14, b: 12 }])).setPoint).toBe("a");
    expect(deriveFlags(F3_15, state([{ a: 16, b: 15 }])).setPoint).toBe("a");
    expect(deriveFlags(F3_15, state([{ a: 14, b: 14 }])).setPoint).toBeNull();
  });

  it("escalates set point to match point one set from the majority", () => {
    const closing = state([
      { a: 15, b: 11 },
      { a: 14, b: 9 },
    ]);
    const flags = deriveFlags(F3_15, closing);
    expect(flags.setPoint).toBe("a");
    expect(flags.matchPoint).toBe("a");

    const opening = deriveFlags(F3_15, state([{ a: 14, b: 9 }]));
    expect(opening.matchPoint).toBeNull();
  });
});

describe("end-of-competition winner", () => {
  it("prefers the completed-sets leader, then current-set points, else null", () => {
    expect(
      leaderForEarlyEnd(
        state([
          { a: 15, b: 10 },
          { a: 5, b: 9 },
        ]),
      ),
    ).toBe("a");
    expect(leaderForEarlyEnd(state([{ a: 10, b: 12 }]))).toBe("b");
    expect(leaderForEarlyEnd(state([{ a: 10, b: 10 }]))).toBeNull();
    expect(
      leaderForEarlyEnd(
        state([
          { a: 15, b: 10 },
          { a: 10, b: 15 },
          { a: 7, b: 7 },
        ]),
      ),
    ).toBeNull();
  });
});
