export type House = "green" | "purple" | "orange" | "pink";

export type HomeHero = {
  /** Mono caps eyebrow above the headline (e.g. "Today · Term 1 / Week 6") */
  eyebrow: string;
  /** Bilingual headline lines, rendered stacked */
  titleLines: string[];
  /** First pill — leading house highlight (rendered with blue fill) */
  leading: { house: House; label: string; points: number };
  /** Second pill — location */
  whereTh: string;
  /** Third pill — weather */
  weather: { degrees: number; glyph: string };
};

export type HomeMenuItem = {
  href: string;
  labelEn: string;
  labelTh: string;
  /** Halftone art panel variant */
  art: "bk" | "bl";
  /** Optional decorative star sticker */
  star?: { color: "ink" | "yellow" | "blue" | "pink"; position: "tl" | "tr" };
  /** Inline SVG icon (drawn on the art panel) */
  icon: import("react").ReactNode;
};
