import { describe, expect, it } from "vitest";
import { contrastRatio, contrastText, HOUSE_HEX, INK_HEX } from "./colors";

const WHITE = "#ffffff";

describe("contrastText", () => {
  it("always picks the higher-contrast option of ink vs white", () => {
    for (const hex of Object.values(HOUSE_HEX)) {
      const pick = contrastText(hex);
      const other = pick === INK_HEX ? WHITE : INK_HEX;
      expect(contrastRatio(hex, pick)).toBeGreaterThanOrEqual(
        contrastRatio(hex, other),
      );
    }
  });

  it("meets WCAG AA (4.5:1) against every house color", () => {
    for (const [house, hex] of Object.entries(HOUSE_HEX)) {
      const ratio = contrastRatio(hex, contrastText(hex));
      expect(ratio, `${house} ${hex}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("picks ink on light/mid backgrounds and white on dark ones", () => {
    expect(contrastText("#fff100")).toBe(INK_HEX); // brand yellow
    expect(contrastText("#f2843b")).toBe(INK_HEX); // house orange
    expect(contrastText("#102a4c")).toBe(WHITE); // navy
    expect(contrastText(INK_HEX)).toBe(WHITE);
  });

  it("is symmetric and sane", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });
});
