import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { BigCalGrid } from "@/components/admin/BigCalGrid";
import { Btn } from "@/components/admin/Btn";
import { CalendarLegend } from "@/components/admin/CalendarLegend";
import { ADMIN_MAY_2026 } from "@/supabase/seed/data/admin-calendar";

export default function AdminCalendar() {
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
      <BigCalGrid days={ADMIN_MAY_2026} />
    </>
  );
}
