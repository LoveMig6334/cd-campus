/**
 * What the hall board is allowed to show. Persisted in site_config under
 * `scoreboard_display` as `{ mode }`. The match itself is untouched by this —
 * "idle" merely hides it behind the Sports Day holding screen, so the referee
 * can flip back and forth without losing the score or the clock.
 */
export const DISPLAY_MODES = ["match", "idle"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

export const DISPLAY_MODE_KEY = "scoreboard_display";

export function isDisplayMode(v: unknown): v is DisplayMode {
  return (
    typeof v === "string" && (DISPLAY_MODES as readonly string[]).includes(v)
  );
}

export function parseDisplayMode(value: unknown): DisplayMode {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const mode = (value as { mode?: unknown }).mode;
    if (isDisplayMode(mode)) return mode;
  }
  return "match";
}
