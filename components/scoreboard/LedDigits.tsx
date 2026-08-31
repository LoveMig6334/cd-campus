import { cn } from "@/lib/cn";

/*
 * Seven-segment LED glyphs as inline SVG — no font needed, reads like a gym
 * scoreboard from 20 m. Unlit segments stay faintly visible (real boards do).
 */

export type LedColor = "red" | "amber" | "green";

const COLOR: Record<LedColor, string> = {
  red: "#ff3b30",
  amber: "#ffb020",
  green: "#39ff6a",
};

// Segment layout in a 60×100 box: a top, b top-right, c bottom-right,
// d bottom, e bottom-left, f top-left, g middle.
const SEGMENTS: Record<string, { x: number; y: number; w: number; h: number }> =
  {
    a: { x: 10, y: 2, w: 40, h: 9 },
    b: { x: 50, y: 8, w: 9, h: 40 },
    c: { x: 50, y: 52, w: 9, h: 40 },
    d: { x: 10, y: 89, w: 40, h: 9 },
    e: { x: 1, y: 52, w: 9, h: 40 },
    f: { x: 1, y: 8, w: 9, h: 40 },
    g: { x: 10, y: 45.5, w: 40, h: 9 },
  };

const DIGITS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  "-": "g",
  " ": "",
};

function Glyph({
  ch,
  color,
  dim,
}: {
  ch: string;
  color: string;
  dim: boolean;
}) {
  if (ch === ":") {
    return (
      <svg viewBox="0 0 24 100" className="h-full w-auto" aria-hidden>
        {[30, 70].map((cy) => (
          <circle
            key={cy}
            cx="12"
            cy={cy}
            r="5.5"
            fill={color}
            opacity={dim ? 0.08 : 1}
          />
        ))}
      </svg>
    );
  }
  const lit = dim ? "" : (DIGITS[ch] ?? "");
  return (
    <svg viewBox="0 0 60 100" className="h-full w-auto" aria-hidden>
      {Object.entries(SEGMENTS).map(([k, s]) => (
        <rect
          key={k}
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          rx="3"
          fill={color}
          opacity={lit.includes(k) ? 1 : 0.08}
        />
      ))}
    </svg>
  );
}

/**
 * LED readout. `value` is rendered glyph by glyph (digits, "-", ":" and
 * spaces); `dim` draws every segment unlit (an empty slot). `h` sizes the
 * glyph height (any CSS length, e.g. "12vh").
 */
export function Led({
  value,
  color = "red",
  h,
  dim = false,
  className,
}: {
  value: string;
  color?: LedColor;
  h: string;
  dim?: boolean;
  className?: string;
}) {
  const fill = COLOR[color];
  return (
    <span
      role="img"
      aria-label={dim ? "" : value.trim()}
      className={cn("inline-flex items-stretch gap-[0.12em]", className)}
      style={{
        height: h,
        fontSize: h,
        filter: dim ? undefined : `drop-shadow(0 0 0.04em ${fill})`,
      }}
    >
      {value.split("").map((ch, i) => (
        <Glyph key={i} ch={ch} color={fill} dim={dim} />
      ))}
    </span>
  );
}

/** Left-pad a number with spaces (unlit digits) to a fixed width. */
export function ledPad(n: number, width: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(width, " ");
}
