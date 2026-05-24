import type { ReactNode } from "react";

// Solid glyphs — one accent color per tile, shared ink outline + white detail,
// sparing yellow pops. No blue: blue stays the tile footer + nav (the 30%), so
// the colored glyph reads distinctly. Colors route through CSS tokens.
// Each tile's fill uses a dedicated `--icon-*` token; the fallback is the light
// value, and globals.css overrides each to a lighter tint inside `.dark` so the
// glyphs read a little softer/brighter on the dark panel. INK (the outline) and
// YELLOW flip via the shared token overrides.
const INK = "var(--color-ink, #15151a)";
const WHITE = "#fff";
const YELLOW = "var(--color-yellow, #fff100)";
const VIOLET = "var(--icon-violet, #8e5bd9)";
const TEAL = "var(--icon-teal, #1f9e90)";
const ORANGE = "var(--icon-orange, #f2843b)";
const GREEN = "var(--icon-green, #3fae6c)";
const AMBER = "var(--icon-amber, #e0a020)";
const PINK = "var(--icon-pink, #e94d8f)";

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <Glyph>
      <rect
        x="6"
        y="14"
        width="52"
        height="44"
        rx="6"
        fill={VIOLET}
        stroke={INK}
        strokeWidth={2}
      />
      <line x1="6" y1="27" x2="58" y2="27" stroke={WHITE} strokeWidth={2.5} />
      <rect
        x="16"
        y="7"
        width="6"
        height="14"
        rx="3"
        fill={WHITE}
        stroke={INK}
        strokeWidth={2}
      />
      <rect
        x="42"
        y="7"
        width="6"
        height="14"
        rx="3"
        fill={WHITE}
        stroke={INK}
        strokeWidth={2}
      />
      <circle cx="20" cy="38" r="2.6" fill={WHITE} />
      <circle cx="32" cy="38" r="2.6" fill={WHITE} />
      <circle cx="44" cy="38" r="2.6" fill={YELLOW} />
      <circle cx="20" cy="48" r="2.6" fill={WHITE} />
      <circle cx="32" cy="48" r="2.6" fill={WHITE} />
      <circle cx="44" cy="48" r="2.6" fill={WHITE} />
    </Glyph>
  );
}

export function BookingIcon() {
  return (
    <Glyph>
      <rect
        x="16"
        y="8"
        width="32"
        height="50"
        rx="5"
        fill={TEAL}
        stroke={INK}
        strokeWidth={2}
      />
      <rect
        x="22"
        y="14"
        width="20"
        height="36"
        rx="2"
        fill="none"
        stroke={WHITE}
        strokeWidth={2}
      />
      <circle
        cx="39"
        cy="33"
        r="2.6"
        fill={YELLOW}
        stroke={INK}
        strokeWidth={1.2}
      />
    </Glyph>
  );
}

export function SportIcon() {
  return (
    <Glyph>
      <path
        d="M19 15 H11 V19 A7 7 0 0 0 18 26"
        stroke={INK}
        strokeWidth={2.5}
      />
      <path
        d="M45 15 H53 V19 A7 7 0 0 1 46 26"
        stroke={INK}
        strokeWidth={2.5}
      />
      <path
        d="M19 13 H45 V19 A13 13 0 0 1 19 19 Z"
        fill={ORANGE}
        stroke={INK}
        strokeWidth={2}
      />
      <rect
        x="28"
        y="32"
        width="8"
        height="9"
        fill={ORANGE}
        stroke={INK}
        strokeWidth={2}
      />
      <rect
        x="21"
        y="41"
        width="22"
        height="5"
        rx="2"
        fill={ORANGE}
        stroke={INK}
        strokeWidth={2}
      />
      <rect
        x="16"
        y="49"
        width="32"
        height="7"
        rx="3"
        fill={ORANGE}
        stroke={INK}
        strokeWidth={2}
      />
      <path
        d="M32 15 l1.6 3.7 l4 0.3 l-3 2.7 l1 3.9 l-3.6 -2.1 l-3.6 2.1 l1 -3.9 l-3 -2.7 l4 -0.3 Z"
        fill={YELLOW}
        stroke={INK}
        strokeWidth={1}
      />
    </Glyph>
  );
}

export function PortfolioIcon() {
  return (
    <Glyph>
      <path
        d="M25 23 V19 A7 7 0 0 1 39 19 V23"
        stroke={INK}
        strokeWidth={2.5}
      />
      <rect
        x="9"
        y="22"
        width="46"
        height="31"
        rx="5"
        fill={GREEN}
        stroke={INK}
        strokeWidth={2}
      />
      <line x1="9" y1="35" x2="55" y2="35" stroke={WHITE} strokeWidth={2.5} />
      <rect
        x="28"
        y="31"
        width="8"
        height="8"
        rx="1.5"
        fill={YELLOW}
        stroke={INK}
        strokeWidth={1.5}
      />
    </Glyph>
  );
}

export function PshareIcon() {
  return (
    <Glyph>
      <path
        d="M32 18 C24 14 15 14 9 16 V49 C15 47 24 47 32 51 Z"
        fill={AMBER}
        stroke={INK}
        strokeWidth={2}
      />
      <path
        d="M32 18 C40 14 49 14 55 16 V49 C49 47 40 47 32 51 Z"
        fill={AMBER}
        stroke={INK}
        strokeWidth={2}
      />
      <path d="M32 18 V51" stroke={WHITE} strokeWidth={1.5} />
      <path
        d="M15 24 H26 M15 30 H26 M15 36 H24"
        stroke={WHITE}
        strokeWidth={2}
      />
      <path
        d="M38 24 H49 M38 30 H49 M40 36 H49"
        stroke={WHITE}
        strokeWidth={2}
      />
      <path
        d="M30 14 H34 V24 L32 21 L30 24 Z"
        fill={YELLOW}
        stroke={INK}
        strokeWidth={1.2}
      />
    </Glyph>
  );
}

export function CarelinIcon() {
  return (
    <Glyph>
      <path
        d="M12 12 H52 A6 6 0 0 1 58 18 V38 A6 6 0 0 1 52 44 H28 L18 53 V44 H12 A6 6 0 0 1 6 38 V18 A6 6 0 0 1 12 12 Z"
        fill={PINK}
        stroke={INK}
        strokeWidth={2}
      />
      <path
        d="M32 39 C32 39 21 32 21 24.5 C21 20 27.5 18.5 32 23 C36.5 18.5 43 20 43 24.5 C43 32 32 39 32 39 Z"
        fill={WHITE}
        stroke={INK}
        strokeWidth={1.5}
      />
    </Glyph>
  );
}
