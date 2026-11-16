import { describe, expect, it } from "vitest";
import {
  applyToCourt,
  BWF,
  correctPoint,
  courtFlags,
  declareWinner,
  endGame,
  endInterval,
  formatDuration,
  gamesWon,
  initialCourts,
  intervalRemaining,
  matchElapsed,
  newCourt,
  parseCourts,
  resetCourt,
  ruleGameWinner,
  scorePoint,
  serviceCourt,
  setLayout,
  startMatch,
  suggestedMatchWinner,
  undoCourt,
  type CourtMatch,
  type CourtsState,
  type Result,
  type Side,
} from "./badminton";

const T0 = 1_700_000_000_000;

function ok(r: Result): CourtMatch {
  if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
  return r.match;
}

function live(first: Side = "a"): CourtMatch {
  return ok(startMatch(newCourt(1), first, T0));
}

/** Score a sequence of rallies, skipping past any interval. */
function rallies(m: CourtMatch, seq: string): CourtMatch {
  let cur = m;
  for (const ch of seq) {
    cur = ok(scorePoint(cur, ch as Side, T0));
  }
  return cur;
}

function withScore(a: number, b: number, extra: Partial<CourtMatch> = {}) {
  return {
    ...live(),
    games: [{ a, b }],
    midIntervalTaken: true,
    ...extra,
  };
}

describe("ruleGameWinner", () => {
  it("21 with a 2-point lead wins", () => {
    expect(ruleGameWinner({ a: 21, b: 19 })).toBe("a");
    expect(ruleGameWinner({ a: 5, b: 21 })).toBe("b");
  });
  it("20-all goes to deuce until a 2-point lead", () => {
    expect(ruleGameWinner({ a: 21, b: 20 })).toBeNull();
    expect(ruleGameWinner({ a: 22, b: 20 })).toBe("a");
    expect(ruleGameWinner({ a: 27, b: 29 })).toBe("b");
  });
  it("caps at 30 — 30-29 wins", () => {
    expect(ruleGameWinner({ a: 29, b: 29 })).toBeNull();
    expect(ruleGameWinner({ a: 30, b: 29 })).toBe("a");
  });
});

describe("scorePoint", () => {
  it("rally winner scores and serves", () => {
    const m = ok(scorePoint(live("a"), "b", T0));
    expect(m.games[0]).toEqual({ a: 0, b: 1 });
    expect(m.serving).toBe("b");
  });

  it("starts the 60 s interval when the leader first reaches 11", () => {
    const m = rallies(live(), "aaaaaaaaaa"); // 10-0
    expect(m.status).toBe("live");
    const at11 = ok(scorePoint(m, "a", T0));
    expect(at11.status).toBe("interval");
    expect(at11.interval).toEqual({
      kind: "mid",
      endsAt: T0 + BWF.intervalSeconds * 1000,
    });
    expect(intervalRemaining(at11, T0 + 15_000)).toBe(45);
  });

  it("takes the 11-point interval only once per game", () => {
    let m = rallies(live(), "aaaaaaaaaaa"); // 11-0, interval
    m = ok(endInterval(m));
    m = rallies(m, "bbbbbbbbbbb"); // 11-11
    expect(m.status).toBe("live");
    expect(m.interval).toBeNull();
  });

  it("scoring during an interval resumes play", () => {
    const m = rallies(live(), "aaaaaaaaaaa");
    const next = ok(scorePoint(m, "b", T0));
    expect(next.status).toBe("live");
    expect(next.interval).toBeNull();
  });

  it("refuses points once the game is decided by the rules", () => {
    const r = scorePoint(withScore(21, 15), "b", T0);
    expect(r).toEqual({ ok: false, reason: "game_over" });
  });

  it("refuses points before the start and after the finish", () => {
    expect(scorePoint(newCourt(1), "a", T0).ok).toBe(false);
    const done = ok(declareWinner(live(), "a", T0));
    expect(scorePoint(done, "a", T0).ok).toBe(false);
  });
});

describe("correctPoint", () => {
  it("removes a point without changing the server, floored at 0", () => {
    const m = ok(correctPoint(withScore(3, 2, { serving: "b" }), "a"));
    expect(m.games[0]).toEqual({ a: 2, b: 2 });
    expect(m.serving).toBe("b");
    expect(correctPoint(live(), "a")).toEqual({ ok: false, reason: "floor" });
  });
});

describe("courtFlags", () => {
  it("flags game point at 20-x and match point on a game lead", () => {
    expect(courtFlags(withScore(20, 15)).gamePoint).toBe("a");
    expect(courtFlags(withScore(20, 15)).matchPoint).toBeNull();
    const second = withScore(20, 15, {
      games: [
        { a: 21, b: 10 },
        { a: 20, b: 15 },
      ],
      gameWinners: ["a"],
    });
    expect(courtFlags(second).matchPoint).toBe("a");
  });
  it("flags deuce at 20-all and game point at 29-29", () => {
    expect(courtFlags(withScore(20, 20)).deuce).toBe(true);
    expect(courtFlags(withScore(20, 20)).gamePoint).toBeNull();
    expect(courtFlags(withScore(29, 29)).gamePoint).toBe("a");
  });
  it("no flags once the game is decided", () => {
    expect(courtFlags(withScore(21, 10))).toMatchObject({
      gamePoint: null,
      deuce: false,
    });
  });
  it("change ends at the 11-point interval of the deciding game", () => {
    const m: CourtMatch = {
      ...live(),
      games: [
        { a: 21, b: 10 },
        { a: 10, b: 21 },
        { a: 10, b: 4 },
      ],
      gameWinners: ["a", "b"],
    };
    expect(courtFlags(ok(scorePoint(m, "a", T0))).changeEnds).toBe(true);
    expect(courtFlags(rallies(live(), "aaaaaaaaaaa")).changeEnds).toBe(false);
  });
});

describe("serviceCourt", () => {
  it("even server score serves from the right, odd from the left", () => {
    expect(serviceCourt(withScore(4, 7, { serving: "a" }))).toBe("right");
    expect(serviceCourt(withScore(4, 7, { serving: "b" }))).toBe("left");
  });
});

describe("endGame (manual)", () => {
  it("opens the next game behind a 120 s interval, game winner serving", () => {
    const m = ok(endGame(withScore(17, 21, { serving: "a" }), "b", T0));
    expect(m.gameWinners).toEqual(["b"]);
    expect(m.games).toEqual([
      { a: 17, b: 21 },
      { a: 0, b: 0 },
    ]);
    expect(m.serving).toBe("b");
    expect(m.status).toBe("interval");
    expect(m.interval).toEqual({
      kind: "game",
      endsAt: T0 + BWF.gameIntervalSeconds * 1000,
    });
    expect(m.midIntervalTaken).toBe(false);
  });

  it("moves to decision once a side holds two games", () => {
    let m = ok(endGame(withScore(21, 18), "a", T0));
    m = ok(endInterval(m));
    m = { ...m, games: [m.games[0], { a: 21, b: 12 }] };
    m = ok(endGame(m, "a", T0));
    expect(m.status).toBe("decision");
    expect(m.games).toHaveLength(2);
    expect(suggestedMatchWinner(m)).toBe("a");
    expect(gamesWon(m)).toEqual({ a: 2, b: 0 });
  });

  it("lets the operator pick a winner the score does not show (retirement)", () => {
    const m = ok(endGame(withScore(5, 9), "a", T0));
    expect(m.gameWinners).toEqual(["a"]);
  });

  it("is rejected outside play", () => {
    expect(endGame(newCourt(1), "a", T0).ok).toBe(false);
  });
});

describe("declareWinner", () => {
  it("finishes the match with the chosen winner and stops the clock", () => {
    const m = ok(declareWinner(live(), "b", T0 + 90_000));
    expect(m.status).toBe("finished");
    expect(m.winner).toBe("b");
    expect(matchElapsed(m, T0 + 999_000)).toBe(90);
  });
  it("cannot be declared before the start", () => {
    expect(declareWinner(newCourt(1), "a", T0).ok).toBe(false);
  });
});

describe("formatDuration", () => {
  it("mm:ss under an hour, h:mm:ss after", () => {
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(3725)).toBe("1:02:05");
  });
});

describe("courts state", () => {
  it("each court keeps its own match and undo history", () => {
    let s = initialCourts();
    s = applyToCourt(s, 1, startMatch(s.courts[1].match, "a", T0));
    s = applyToCourt(s, 1, scorePoint(s.courts[1].match, "a", T0));
    s = applyToCourt(s, 2, startMatch(s.courts[2].match, "b", T0));
    expect(s.courts[1].match.games[0]).toEqual({ a: 1, b: 0 });
    expect(s.courts[2].match.games[0]).toEqual({ a: 0, b: 0 });

    s = undoCourt(s, 1);
    expect(s.courts[1].match.games[0]).toEqual({ a: 0, b: 0 });
    expect(s.courts[2].match.status).toBe("live");
  });

  it("failed transitions change nothing", () => {
    const s = initialCourts();
    expect(applyToCourt(s, 1, scorePoint(s.courts[1].match, "a", T0))).toBe(s);
  });

  it("reset clears the court and its history", () => {
    let s = initialCourts();
    s = applyToCourt(s, 2, startMatch(s.courts[2].match, "a", T0));
    s = resetCourt(s, 2);
    expect(s.courts[2]).toEqual({ match: newCourt(2), history: [] });
  });

  it("switches the board layout without touching the courts", () => {
    const s = initialCourts();
    expect(s.layout).toBe("vertical");
    const h = setLayout(s, "horizontal");
    expect(h.layout).toBe("horizontal");
    expect(h.courts).toBe(s.courts);
    expect(setLayout(h, "horizontal")).toBe(h);
  });

  it("reads states saved before the layout setting as vertical", () => {
    const old: Partial<CourtsState> = setLayout(initialCourts(), "horizontal");
    delete old.layout;
    expect(parseCourts(JSON.stringify(old)).layout).toBe("vertical");
    const bad = { ...initialCourts(), layout: "diagonal" };
    expect(parseCourts(JSON.stringify(bad)).layout).toBe("vertical");
  });

  it("round-trips through JSON and rejects junk", () => {
    let s = initialCourts();
    s = applyToCourt(s, 1, startMatch(s.courts[1].match, "a", T0));
    s = applyToCourt(s, 1, scorePoint(s.courts[1].match, "b", T0));
    s = setLayout(s, "horizontal");
    expect(parseCourts(JSON.stringify(s))).toEqual(s);
    expect(parseCourts("not json")).toEqual(initialCourts());
    expect(parseCourts('{"v":2}')).toEqual(initialCourts());
    expect(parseCourts(null)).toEqual(initialCourts());
  });
});
