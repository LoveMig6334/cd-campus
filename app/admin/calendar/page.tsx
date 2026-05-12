import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { BigCalGrid } from "@/components/admin/BigCalGrid";
import { Btn } from "@/components/admin/Btn";
import { CalendarLegend } from "@/components/admin/CalendarLegend";
import { getAdminMonth } from "@/lib/queries/events";

export default async function AdminCalendar() {
  const days = await getAdminMonth(2026, 5);
  return (
    <>
      <AdminTopbar
        titleTh="ปฏิทิน"
        eyebrow="Calendar · May 2026"
        actions={
          <>
            <Btn>◀ Apr</Btn>
            <Btn>May 2026</Btn>
            <Btn>Jun ▶</Btn>
            <Link
              href="/admin/calendar/new"
              className="inline-block border-[1.5px] border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all bg-blue text-white [box-shadow:3px_3px_0_var(--color-ink)] hover:[box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:bg-blue-deep"
            >
              + Add Event
            </Link>
          </>
        }
      />
      <CalendarLegend />
      <BigCalGrid days={days} />
    </>
  );
}
