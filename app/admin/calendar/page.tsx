import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminCalendarEventList } from "@/components/admin/AdminCalendarEventList";
import { BigCalGrid } from "@/components/admin/BigCalGrid";
import { Btn } from "@/components/admin/Btn";
import { CalendarLegend } from "@/components/admin/CalendarLegend";
import { getAdminMonth, getAdminMonthEventList } from "@/lib/queries/events";
import { EN_MONTHS_ABBR, currentYearMonth, today } from "@/lib/time";

export default async function AdminCalendar() {
  const { year, month, enLabel } = currentYearMonth();
  // (month + 10) % 12 = 0-indexed previous month; May(5) → Apr(3); Jan(1) → Dec(11)
  const prevAbbr = EN_MONTHS_ABBR[(month + 10) % 12];
  // month % 12 = 0-indexed next month; May(5) → Jun(5); Dec(12) → Jan(0)
  const nextAbbr = EN_MONTHS_ABBR[month % 12];
  const [days, list] = await Promise.all([
    getAdminMonth(year, month),
    getAdminMonthEventList(year, month),
  ]);
  const todayISO = today();
  const [todayY, todayM, todayD] = todayISO.split("-").map(Number);
  const todayInMonth = todayY === year && todayM === month;
  const daysWithToday = todayInMonth
    ? days.map((d) =>
        d.inMonth && d.num === todayD ? { ...d, isToday: true } : d,
      )
    : days;
  return (
    <>
      <AdminTopbar
        titleTh="ปฏิทิน"
        eyebrow={`Calendar · ${enLabel}`}
        actions={
          <>
            <Btn type="button">◀ {prevAbbr}</Btn>
            <Btn type="button">{enLabel}</Btn>
            <Btn type="button">{nextAbbr} ▶</Btn>
            <Link
              href="/admin/calendar/new"
              className="border-line bg-blue hover:bg-blue-deep inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white uppercase [box-shadow:3px_3px_0_var(--color-ink)] transition-all hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:4px_4px_0_var(--color-ink)]"
            >
              + Add Event
            </Link>
          </>
        }
      />
      <CalendarLegend />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
        <BigCalGrid days={daysWithToday} />
        <AdminCalendarEventList rows={list} />
      </div>
    </>
  );
}
