import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminCalendarEventList } from "@/components/admin/AdminCalendarEventList";
import { BigCalGrid } from "@/components/admin/BigCalGrid";
import { Btn } from "@/components/admin/Btn";
import { CalendarLegend } from "@/components/admin/CalendarLegend";
import { getAdminMonth, getAdminMonthEventList } from "@/lib/queries/events";

export default async function AdminCalendar() {
  const [days, list] = await Promise.all([
    getAdminMonth(2026, 5),
    getAdminMonthEventList(2026, 5),
  ]);
  return (
    <>
      <AdminTopbar
        titleTh="ปฏิทิน"
        eyebrow="Calendar · May 2026"
        actions={
          <>
            <Btn type="button">◀ Apr</Btn>
            <Btn type="button">May 2026</Btn>
            <Btn type="button">Jun ▶</Btn>
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
        <BigCalGrid days={days} />
        <AdminCalendarEventList rows={list} />
      </div>
    </>
  );
}
