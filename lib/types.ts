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
  /** When set, the day cell renders as a Link (URL-param picker) */
  href?: string;
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
  /** When set, the tab renders as a Link (URL-param picker) */
  href?: string;
};

export type BookingPeriod = {
  id?: "morning" | "midday" | "evening";
  label: string;
  time: string;
  status: "available" | "selected" | "booked";
  /** When set, the period button renders as a Link (URL-param picker) */
  href?: string;
};

export type Room = {
  id: string;
  nameEn: string;
  nameTh: string;
  status: "free" | "full";
  /** When set, the room row renders as a Link (URL-param picker) */
  href?: string;
  /** True when this room is the URL-selected room */
  selected?: boolean;
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

/* ------------------------------------------------------------------ */
/* Admin */
/* ------------------------------------------------------------------ */

export type AdminKpi = {
  label: string;
  th: string;
  num: string;
  delta: { kind: "up" | "down" | "flat"; text: string };
};

export type AdminEvent = {
  time: string;
  title: string;
  tag: string;
  /** Left-border color (CSS value or one of CATEGORY_COLOR keys) */
  barColor: string;
};

export type AdminBookingRow = {
  roomEn: string;
  roomTh: string;
  user: string;
  klass: string;
  start: string;
  end: string;
  status: "Confirmed" | "Pending" | "Review";
};

export type BigCalDay = {
  num: number;
  inMonth: boolean;
  isToday?: boolean;
  events?: BigCalEvent[];
};

export type BigCalEvent = {
  title: string;
  /** Color variant — "highlight" = yellow/ink (used for the briefing chip) */
  variant: CalendarCategory | "highlight";
};

export type ScoreboardEntry = {
  house: House;
  nameEn: string;
  nameTh: string;
  rankSubtitle: string;
  score: number;
  stat: string;
};

export type SportResultRow = {
  id?: string;
  titleTh: string;
  titleEn: string;
  category: "Track" | "Team";
  /** Houses ordered 1st → 4th */
  placements: House[];
  time: string;
};

/* ------------------------------------------------------------------ */
/* Admin Bookings (Gantt) */
/* ------------------------------------------------------------------ */

export type GanttBarVariant = "default" | "y" | "p" | "g" | "o";

export type GanttBar = {
  /** Display name in italic */
  who: string;
  /** Trailing meta line */
  meta: string;
  /** Left % within the cell (0–100) */
  leftPct: number;
  /** Width % within the cell (0–100) */
  widthPct: number;
  variant?: GanttBarVariant;
};

export type GanttRoom = {
  nameEn: string;
  nameTh: string;
  bars: GanttBar[];
};

export type AdminTodayBookingRow = {
  id: string;
  room: string;
  user: string;
  start: string;
  end: string;
  purpose: string;
  status: "Confirmed" | "Pending" | "Review";
};

/* ------------------------------------------------------------------ */
/* Admin Portfolio */
/* ------------------------------------------------------------------ */

export type PortfolioThumbIcon =
  | "trend"
  | "sun"
  | "wave"
  | "cube"
  | "calendar"
  | "beakers";

export type PortfolioTagPill = {
  label: string;
  background: string;
  /** Default white */
  textColor?: string;
};

export type PortfolioAdminRow = {
  id: string;
  thumb: { iconKey: PortfolioThumbIcon; bg?: string };
  imagePath?: string | null;
  titleEn: string;
  titleTh: string;
  author: string;
  klass: string;
  tags: PortfolioTagPill[];
  submitted: string;
  status: "Published" | "Under Review" | "Draft";
};

/* ------------------------------------------------------------------ */
/* Admin Carelin Desk */
/* ------------------------------------------------------------------ */

export type CarelinDeskRow = {
  id: string;
  when: string;
  requester: { name: string; studentId: string; klass: string };
  title: string;
  snippet: string;
  status: "Open" | "Answered";
};

export type AdminTabItem = {
  id: string;
  label: string;
  count?: number;
};
