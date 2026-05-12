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
            <Btn variant="primary">+ Add Event</Btn>
          </>
        }
      />
      <CalendarLegend />
      <BigCalGrid days={days} />
    </>
  );
}
