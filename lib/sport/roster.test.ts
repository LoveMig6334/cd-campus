import { describe, expect, it } from "vitest";
import type { MatchPlayer } from "./rules";
import { resolveRosterDrop } from "./roster";

const p = (
  id: string,
  onCourt: boolean,
  extra: Partial<MatchPlayer> = {},
): MatchPlayer => ({
  id,
  team: "a",
  number: Number(id.replace(/\D/g, "")) || 0,
  name: null,
  fouls: 0,
  points: 0,
  onCourt,
  ...extra,
});

const fullCourt = ["c1", "c2", "c3", "c4", "c5"].map((id) => p(id, true));

describe("resolveRosterDrop", () => {
  it("puts a bench player on court when dropped on an empty slot", () => {
    const players = [p("c1", true), p("b7", false)];
    expect(resolveRosterDrop(players, "b7", { kind: "slot" })).toEqual({
      type: "court",
      playerId: "b7",
    });
  });

  it("swaps a bench player with the on-court player they are dropped on", () => {
    const players = [...fullCourt, p("b7", false)];
    expect(
      resolveRosterDrop(players, "b7", { kind: "slot", playerId: "c3" }),
    ).toEqual({ type: "swap", outId: "c3", inId: "b7" });
  });

  it("benches an on-court player dropped on the bench", () => {
    const players = [p("c1", true), p("b7", false)];
    expect(resolveRosterDrop(players, "c1", { kind: "bench" })).toEqual({
      type: "bench",
      playerId: "c1",
    });
  });

  it("refuses to court a player onto an empty slot when the court is full", () => {
    const players = [...fullCourt, p("b7", false)];
    expect(resolveRosterDrop(players, "b7", { kind: "slot" })).toBeNull();
  });

  it("refuses to court a fouled-out player", () => {
    const players = [p("c1", true), p("b7", false, { fouls: 5 })];
    expect(resolveRosterDrop(players, "b7", { kind: "slot" })).toBeNull();
    expect(
      resolveRosterDrop(players, "b7", { kind: "slot", playerId: "c1" }),
    ).toBeNull();
  });

  it("ignores drops that change nothing", () => {
    const players = [p("c1", true), p("b7", false)];
    expect(resolveRosterDrop(players, "c1", { kind: "slot" })).toBeNull();
    expect(
      resolveRosterDrop(players, "c1", { kind: "slot", playerId: "c1" }),
    ).toBeNull();
    expect(resolveRosterDrop(players, "b7", { kind: "bench" })).toBeNull();
  });

  it("ignores drops across teams", () => {
    const players = [p("c1", true), p("b7", false, { team: "b" })];
    expect(
      resolveRosterDrop(players, "b7", { kind: "slot", playerId: "c1" }),
    ).toBeNull();
  });
});
