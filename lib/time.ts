const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

const THAI_MONTHS_ABBR = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

const EN_MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const EN_MONTHS_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export { THAI_MONTHS_FULL, THAI_MONTHS_ABBR, EN_MONTHS_FULL, EN_MONTHS_ABBR };

/**
 * Bangkok-local Y/M/D/H/min parts for a Date. Uses Intl so the server's own
 * TZ (UTC on Vercel) doesn't cause an off-by-one at midnight, and Supabase's
 * UTC-formatted timestamps map back to the right Bangkok wall-clock values.
 */
function bangkokPartsOf(d: Date): {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    h: get("hour"),
    min: get("minute"),
  };
}

function bangkokParts(): { y: number; m: number; d: number } {
  return bangkokPartsOf(new Date());
}

function tsToDate(ts: string): Date | null {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "HH:MM" in Asia/Bangkok for an ISO timestamp (e.g. one from Supabase). */
export function bangkokTimeOf(ts: string): string {
  const d = tsToDate(ts);
  if (!d) return "00:00";
  const p = bangkokPartsOf(d);
  return `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
}

/** Day-of-month (1–31) in Asia/Bangkok for an ISO timestamp. */
export function bangkokDayOf(ts: string): number {
  const d = tsToDate(ts);
  return d ? bangkokPartsOf(d).d : 0;
}

/** Month (1–12) in Asia/Bangkok for an ISO timestamp. */
export function bangkokMonthOf(ts: string): number {
  const d = tsToDate(ts);
  return d ? bangkokPartsOf(d).m : 0;
}

/** "YYYY-MM-DD" in Asia/Bangkok for an ISO timestamp. */
export function bangkokDateOf(ts: string): string {
  const d = tsToDate(ts);
  if (!d) return "";
  const p = bangkokPartsOf(d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" in Asia/Bangkok. */
export function today(): string {
  const { y, m, d } = bangkokParts();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Current Bangkok-local year + 1-indexed month with display labels. */
export function currentYearMonth(): {
  year: number;
  month: number;
  thaiLabel: string;
  enLabel: string;
} {
  const { y, m } = bangkokParts();
  return {
    year: y,
    month: m,
    thaiLabel: THAI_MONTHS_FULL[m - 1],
    enLabel: `${EN_MONTHS_FULL[m - 1]} ${y}`,
  };
}

/** Add `n` days to a YYYY-MM-DD string. Internal; mirrors bookings.ts addDays. */
function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const TIME_RE = /T(\d{2}:\d{2})/;
const MONTH_DAY_RE = /-(\d{2})-(\d{2})T/;

/**
 * Convert a full ISO timestamp to a Thai relative label:
 *   - same day as today: "HH:mm"
 *   - one day before today: "เมื่อวาน"
 *   - any other date: "D <Thai month abbr>"
 */
export function relativeThaiDay(ts: string): string {
  const dateISO = ts.slice(0, 10);
  const todayISO = today();
  if (dateISO === todayISO) {
    const t = ts.match(TIME_RE);
    return t ? t[1] : "";
  }
  if (dateISO === addDays(todayISO, -1)) return "เมื่อวาน";
  const m = ts.match(MONTH_DAY_RE);
  if (!m) return ts;
  const day = parseInt(m[2], 10);
  const mon = parseInt(m[1], 10);
  return `${day} ${THAI_MONTHS_ABBR[mon - 1]}`;
}

/**
 * 6-row × 7-col (42 cells, Sun-first) skeleton for a 1-indexed (year, month).
 * Leading days come from the previous month, trailing days from the next.
 * Sun-first matches the CalendarGrid / BigCalGrid weekday headers (`Su Mo Tu
 * We Th Fr Sa`). Layout is timezone-invariant — we never derive "today" from
 * these Dates.
 */
export function buildMonthGrid(
  year: number,
  month: number,
): { num: number; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // JS getUTCDay is already Sun=0 … Sat=6, matching the Sun-first grid.
  const leadCount = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysInPrev = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

  const cells: { num: number; inMonth: boolean }[] = [];
  for (let i = leadCount; i > 0; i--) {
    cells.push({ num: daysInPrev - i + 1, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ num: d, inMonth: true });
  }
  let trailing = 1;
  while (cells.length < 42) {
    cells.push({ num: trailing++, inMonth: false });
  }
  return cells;
}

/**
 * Set of "YYYY-MM-DD" strings for every in-month day of (year, month).
 * Used as a validation set for URL params.
 */
export function monthDateSet(year: number, month: number): Set<string> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out = new Set<string>();
  for (let d = 1; d <= daysInMonth; d++) {
    out.add(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return out;
}
