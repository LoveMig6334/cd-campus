import type { House } from "@/lib/types";

// keep in sync with app/globals.css @theme --color-house-*
export const HOUSE_HEX: Record<House, string> = {
  green: "#3fae6c",
  purple: "#8e5bd9",
  orange: "#f2843b",
  pink: "#e94d8f",
};

export const INK_HEX = "#15151a";
const WHITE_HEX = "#ffffff";

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  );
}

/** WCAG contrast ratio between two #rrggbb colors (1..21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = luminance(hexA);
  const lb = luminance(hexB);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Ink or white — whichever contrasts more against the given background. */
export function contrastText(bgHex: string): "#15151a" | "#ffffff" {
  return contrastRatio(bgHex, INK_HEX) >= contrastRatio(bgHex, WHITE_HEX)
    ? INK_HEX
    : WHITE_HEX;
}
