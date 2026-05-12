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

/* ------------------------------------------------------------------ */
/* Calendar */
/* ------------------------------------------------------------------ */

export type CalendarCategory =
  | "sport"
  | "tradition"
  | "music"
  | "admin"
  | "academic";

export const CATEGORY_COLOR: Record<CalendarCategory, string> = {
  sport: "var(--color-house-orange)",
  tradition: "var(--color-house-purple)",
  music: "var(--color-house-pink)",
  admin: "var(--color-blue)",
  academic: "var(--color-house-green)",
};

export type CalendarChip = {
  id: "all" | CalendarCategory;
  labelEn: string;
};

export type CalendarDay = {
  num: number;
  /** false = day belongs to neighbouring month */
  inMonth: boolean;
  state?: "today" | "selected" | "closed";
  /** Optional dots beneath the number — CSS color values */
  dots?: string[];
};

export type CalendarEvent = {
  time: string;
  titleTh: string;
  tag: string;
  category: CalendarCategory;
};

/* ------------------------------------------------------------------ */
/* Sport day */
/* ------------------------------------------------------------------ */

export type LeaderRow = {
  rank: number;
  house: House;
  nameEn: string;
  nameTh: string;
  score: number;
  /** Bar fill percentage (0–100) */
  barPct: number;
};

export type LiveResult = {
  titleTh: string;
  metaEn: string;
  /** Placements ordered 1st → 4th */
  placements: House[];
  /** Icon variant for the chip */
  icon: "running" | "ball";
};

/* ------------------------------------------------------------------ */
/* Booking */
/* ------------------------------------------------------------------ */

export type BookingTab = {
  id: "music" | "meeting";
  labelEn: string;
  labelTh: string;
};

export type BookingPeriod = {
  label: string;
  time: string;
  status: "available" | "selected" | "booked";
};

export type Room = {
  nameEn: string;
  nameTh: string;
  status: "free" | "full";
};

/* ------------------------------------------------------------------ */
/* Portfolio */
/* ------------------------------------------------------------------ */

export type PortfolioIconKey = "crop" | "solar" | "shm";

export type Project = {
  title: string;
  titleTh: string;
  desc: string;
  authorLine: string;
  tags: string[];
  iconKey: PortfolioIconKey;
};

export type PortfolioStats = {
  num: number;
  label: string;
};

/* ------------------------------------------------------------------ */
/* P'share */
/* ------------------------------------------------------------------ */

export type PshareArt = {
  /** Art-panel halftone background utility class */
  halftone: "halftone-bl" | "halftone-bk" | "halftone-soft";
  /** Background color CSS value (default: var(--color-cream)) */
  bg?: string;
  /** Number text color (default: var(--color-ink)) */
  numColor?: string;
};

export type PsharePost = {
  slug: string;
  num: string;
  title: string;
  snippet: string;
  author: string;
  date: string;
  tags: string[];
  art: PshareArt;
};

export type PshareTagFilter = string;

/* ------------------------------------------------------------------ */
/* CD Carelin */
/* ------------------------------------------------------------------ */

export type CarelinReply = {
  teacher: string;
  role: string;
  when: string;
  body: string;
  /** Single-character avatar (Thai or Latin letter) */
  avatar: string;
};

export type CarelinRequest = {
  title: string;
  body: string;
  who: string;
  studentId: string;
  when: string;
  status: "open" | "answered";
  reply?: CarelinReply;
};
