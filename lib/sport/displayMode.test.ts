import { describe, expect, it } from "vitest";
import { DISPLAY_MODES, parseDisplayMode } from "./displayMode";

describe("parseDisplayMode", () => {
  it("accepts every known mode", () => {
    for (const m of DISPLAY_MODES) {
      expect(parseDisplayMode({ mode: m })).toBe(m);
    }
  });

  it("falls back to 'match' for missing rows or malformed values", () => {
    expect(parseDisplayMode(null)).toBe("match");
    expect(parseDisplayMode(undefined)).toBe("match");
    expect(parseDisplayMode("idle")).toBe("match");
    expect(parseDisplayMode({ mode: "bogus" })).toBe("match");
    expect(parseDisplayMode({})).toBe("match");
    expect(parseDisplayMode([])).toBe("match");
  });
});
