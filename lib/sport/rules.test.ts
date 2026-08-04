import { describe, expect, it } from "vitest";
import {
  applyPoint,
  deriveFlags,
  firstServerOfSet,
  initialState,
  leaderForEarlyEnd,
  matchWinner,
  setsToWin,
  setsWon,
  setWinner,
  SPORTS,
  type ScoreState,
  type SetScore,
  type TeamKey,
} from "./rules";

const VB = SPORTS.volleyball;
const BM = SPORTS.badminton;

function state(sets: SetScore[], serving: TeamKey = "a"): ScoreState {
  return { sets, currentSet: sets.length, serving };
}

/** Score `n` consecutive rally points for `team`, asserting each one lands. */
function rally(
  config: typeof VB,
  s: ScoreState,
  team: TeamKey,
  n: number,
): ScoreState {
  let cur = s;
  for (let i = 0; i < n; i++) {
    const r = applyPoint(config, cur, team, 1);
    if (!r.ok) throw new Error(`rally point ${i + 1} rejected: ${r.reason}`);
    cur = r.state;
  }
  return cur;
}

describe("basic rally scoring", () => {
  it("adds a point and hands the serve to the scorer", () => {
    const r = applyPoint(VB, initialState(), "b", 1);
    expect(r.ok && r.state.sets[0]).toEqual({ a: 0, b: 1 });
    expect(r.ok && r.state.serving).toBe("b");
  });

  it("floors at 0 on -1 and leaves serving unchanged on corrections", () => {
    const floor = applyPoint(VB, initialState(), "a", -1);
    expect(floor).toEqual({ ok: false, reason: "floor" });

    const up = applyPoint(VB, initialState(), "a", 1);
    if (!up.ok) throw new Error("unexpected");
    const down = applyPoint(VB, up.state, "a", -1);
    expect(down.ok && down.state.sets[0]).toEqual({ a: 0, b: 0 });
    expect(down.ok && down.state.serving).toBe("a"); // serve stays with prior scorer
  });
});

describe("set transitions", () => {
  it("wins a volleyball set at 25-23 and opens a fresh set", () => {
    const s = state([{ a: 24, b: 23 }]);
    const r = applyPoint(VB, s, "a", 1);
    if (!r.ok) throw new Error("unexpected");
    expect(r.setJustWon).toBe("a");
    expect(r.matchWon).toBeNull();
    expect(r.state.sets).toEqual([
      { a: 25, b: 23 },
      { a: 0, b: 0 },
    ]);
    expect(r.state.currentSet).toBe(2);
  });

  it("refuses to end a set at 25-24 (win by 2), ends at 26-24", () => {
    expect(setWinner(VB, { a: 25, b: 24 }, 1)).toBeNull();
    expect(setWinner(VB, { a: 26, b: 24 }, 1)).toBe("a");
  });

  it("volleyball deciding set (5th) plays to 15", () => {
    const four: SetScore[] = [
      { a: 25, b: 20 },
      { a: 20, b: 25 },
      { a: 25, b: 20 },
      { a: 20, b: 25 },
    ];
    expect(setWinner(VB, { a: 15, b: 13 }, 5)).toBe("a");
    expect(setWinner(VB, { a: 15, b: 13 }, 3)).toBeNull(); // only the 5th

    const r = applyPoint(VB, state([...four, { a: 14, b: 13 }]), "a", 1);
    expect(r.ok && r.matchWon).toBe("a");
  });

  it("badminton cap: 30 wins at margin 1, win-by-2 waived", () => {
    expect(setWinner(BM, { a: 29, b: 29 }, 1)).toBeNull();
    expect(setWinner(BM, { a: 30, b: 29 }, 1)).toBe("a");
  });

  it("-1 cannot reopen a completed set", () => {
    // applyPoint auto-advances, so a completed current set only exists when the
    // match is over — both guards answer the same tap.
    const done = state([
      { a: 21, b: 15 },
      { a: 21, b: 15 },
    ]);
    expect(applyPoint(BM, done, "a", -1)).toEqual({
      ok: false,
      reason: "match_over",
    });
    // Right after a set rollover the fresh set is 0-0: -1 floors instead of
    // crossing back into the previous set.
    const rolled = state([
      { a: 25, b: 20 },
      { a: 0, b: 0 },
    ]);
    expect(applyPoint(VB, rolled, "b", -1)).toEqual({
      ok: false,
      reason: "floor",
    });
  });
});

describe("serving across sets", () => {
  it("volleyball alternates first server each set", () => {
    expect(firstServerOfSet(VB, [], 1)).toBe("a");
    expect(firstServerOfSet(VB, [{ a: 25, b: 20 }], 2)).toBe("b");
    expect(
      firstServerOfSet(
        VB,
        [
          { a: 25, b: 20 },
          { a: 20, b: 25 },
        ],
        3,
      ),
    ).toBe("a");
  });

  it("badminton gives the next set's first serve to the set winner", () => {
    expect(firstServerOfSet(BM, [{ a: 15, b: 21 }], 2)).toBe("b");
    const r = applyPoint(BM, state([{ a: 20, b: 10 }]), "a", 1);
    expect(r.ok && r.state.serving).toBe("a");
    const r2 = applyPoint(BM, state([{ a: 10, b: 20 }], "b"), "b", 1);
    expect(r2.ok && r2.state.serving).toBe("b");
  });
});

describe("deuce / set point / match point flags", () => {
  it("flags deuce at 24-24 (volleyball) and 20-20 (badminton)", () => {
    expect(deriveFlags(VB, state([{ a: 24, b: 24 }])).deuce).toBe(true);
    expect(deriveFlags(VB, state([{ a: 23, b: 23 }])).deuce).toBe(false);
    expect(deriveFlags(BM, state([{ a: 20, b: 20 }])).deuce).toBe(true);
    expect(deriveFlags(BM, state([{ a: 29, b: 29 }])).deuce).toBe(true);
  });

  it("flags set point and escalates to match point on the deciding set", () => {
    const early = deriveFlags(VB, state([{ a: 24, b: 20 }]));
    expect(early.setPoint).toBe("a");
    expect(early.matchPoint).toBeNull();

    const closing = deriveFlags(
      VB,
      state([
        { a: 25, b: 20 },
        { a: 25, b: 20 },
        { a: 24, b: 20 },
      ]),
    );
    expect(closing.setPoint).toBe("a");
    expect(closing.matchPoint).toBe("a");
  });

  it("no set point during deuce until someone leads", () => {
    expect(deriveFlags(VB, state([{ a: 24, b: 24 }])).setPoint).toBeNull();
    expect(deriveFlags(VB, state([{ a: 25, b: 24 }])).setPoint).toBe("a");
  });
});

describe("match winner and end of match", () => {
  it("wins badminton 2-0 and freezes further scoring", () => {
    let s = state([{ a: 20, b: 10 }]);
    const r = applyPoint(BM, s, "a", 1);
    if (!r.ok) throw new Error("unexpected");
    s = rally(BM, r.state, "a", 20);
    const final = applyPoint(BM, s, "a", 1);
    if (!final.ok) throw new Error("unexpected");
    expect(final.matchWon).toBe("a");
    expect(final.state.sets).toHaveLength(2);
    expect(matchWinner(BM, final.state)).toBe("a");
    expect(applyPoint(BM, final.state, "b", 1)).toEqual({
      ok: false,
      reason: "match_over",
    });
  });

  it("counts sets correctly mid-match", () => {
    const s = state([
      { a: 25, b: 20 },
      { a: 23, b: 25 },
      { a: 10, b: 8 },
    ]);
    expect(setsWon(VB, s)).toEqual({ a: 1, b: 1 });
    expect(matchWinner(VB, s)).toBeNull();
    expect(setsToWin(VB)).toBe(3);
    expect(setsToWin(BM)).toBe(2);
  });
});

describe("early end (schedule ran out)", () => {
  it("prefers the sets leader, then current-set points, else null", () => {
    expect(
      leaderForEarlyEnd(
        VB,
        state([
          { a: 25, b: 20 },
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
          { a: 25, b: 20 },
          { a: 20, b: 25 },
          { a: 7, b: 7 },
        ]),
      ),
    ).toBeNull();
  });
});
