import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminTodayBookingsTable } from "@/components/admin/AdminTodayBookingsTable";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { Gantt } from "@/components/admin/Gantt";
import {
  ADMIN_BOOKING_DATE,
  ADMIN_TODAY_BOOKINGS,
  GANTT_HOURS,
  GANTT_ROOMS,
} from "@/supabase/seed/data/admin-bookings";

export default function AdminBookings() {
  return (
    <>
      <AdminTopbar
        titleTh="จองห้อง"
        eyebrow={`Bookings · ${ADMIN_BOOKING_DATE}`}
        actions={
          <>
            <Btn>◀ 12 May</Btn>
            <Btn variant="ink">13 May (TUE)</Btn>
            <Btn>14 May ▶</Btn>
            <Btn variant="primary">+ New Booking</Btn>
          </>
        }
      />

      <Gantt hours={GANTT_HOURS} rooms={GANTT_ROOMS} />

      <Card className="mt-[18px]">
        <CardTitle
          th="รายการจองวันนี้"
          en="Today's bookings"
          menu="12 active · 2 pending"
        />
        <AdminTodayBookingsTable rows={ADMIN_TODAY_BOOKINGS} />
      </Card>
    </>
  );
}
