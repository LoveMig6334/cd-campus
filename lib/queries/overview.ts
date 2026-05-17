import { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/queries/util";
import type { AdminKpi } from "@/lib/types";

const MONTH_ABBR = [
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

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function compareDelta(
  curr: number,
  prev: number,
  prevAbbr: string,
): AdminKpi["delta"] {
  if (curr > prev)
    return { kind: "up", text: `▲ ${fmt(curr - prev)} vs ${prevAbbr}` };
  if (curr < prev)
    return { kind: "down", text: `▼ ${fmt(prev - curr)} vs ${prevAbbr}` };
  return { kind: "flat", text: `— same as ${prevAbbr}` };
}

function newThisMonthDelta(n: number, noun: string): AdminKpi["delta"] {
  // kind stays "flat" so the badge renders cream; the ▲ glyph is informational,
  // not directional — a running total has no "good/bad" polarity.
  if (n > 0) return { kind: "flat", text: `▲ ${fmt(n)} ${noun} this month` };
  return { kind: "flat", text: `— none this month` };
}

export async function getOverviewKpis(): Promise<AdminKpi[]> {
  const db = await createClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

  const { start: thisStart, next: thisNext } = monthRange(
    currentYear,
    currentMonth,
  );
  const { start: prevStart, next: prevNext } = monthRange(prevYear, prevMonth);
  const prevAbbr = MONTH_ABBR[prevMonth - 1];

  const [
    eventsThis,
    eventsPrev,
    bookingsThis,
    bookingsPrev,
    carelinOpen,
    carelinNewThis,
    pshareTotal,
    pshareNewThis,
  ] = await Promise.all([
    db
      .from("events")
      .select("*", { count: "exact", head: true })
      .is("tag", null)
      .gte("starts_at", thisStart)
      .lt("starts_at", thisNext),
    db
      .from("events")
      .select("*", { count: "exact", head: true })
      .is("tag", null)
      .gte("starts_at", prevStart)
      .lt("starts_at", prevNext),
    db
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", thisStart)
      .lt("starts_at", thisNext),
    db
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", prevStart)
      .lt("starts_at", prevNext),
    db
      .from("carelin_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    db
      .from("carelin_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thisStart)
      .lt("created_at", thisNext),
    db
      .from("pshare_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    db
      .from("pshare_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", thisStart)
      .lt("published_at", thisNext),
  ]);

  for (const r of [
    eventsThis,
    eventsPrev,
    bookingsThis,
    bookingsPrev,
    carelinOpen,
    carelinNewThis,
    pshareTotal,
    pshareNewThis,
  ]) {
    if (r.error) throw new Error(`getOverviewKpis: ${r.error.message}`);
  }

  const eventsCurr = eventsThis.count ?? 0;
  const eventsPrevN = eventsPrev.count ?? 0;
  const bookingsCurr = bookingsThis.count ?? 0;
  const bookingsPrevN = bookingsPrev.count ?? 0;
  const carelinOpenN = carelinOpen.count ?? 0;
  const carelinNewN = carelinNewThis.count ?? 0;
  const pshareTotalN = pshareTotal.count ?? 0;
  const pshareNewN = pshareNewThis.count ?? 0;

  return [
    {
      label: "Events · this month",
      th: "กิจกรรมเดือนนี้",
      num: fmt(eventsCurr),
      delta: compareDelta(eventsCurr, eventsPrevN, prevAbbr),
    },
    {
      label: "Bookings · this month",
      th: "การจองเดือนนี้",
      num: fmt(bookingsCurr),
      delta: compareDelta(bookingsCurr, bookingsPrevN, prevAbbr),
    },
    {
      label: "Carelin · open",
      th: "Carelin ค้างตอบ",
      num: fmt(carelinOpenN),
      delta: newThisMonthDelta(carelinNewN, "new"),
    },
    {
      label: "P-Share · published",
      th: "เผยแพร่แล้ว",
      num: fmt(pshareTotalN),
      delta: newThisMonthDelta(pshareNewN, "published"),
    },
  ];
}
