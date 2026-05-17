import { AdminBookingsListTable } from "@/components/admin/AdminBookingsListTable";
import { BookingsWeekGrid } from "@/components/admin/BookingsWeekGrid";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import {
  addDays,
  getMonthlyBookings,
  getPendingBookings,
  getWeekBookings,
  mondayOf,
  weekDaysOf,
} from "@/lib/queries/bookings";
import { EN_MONTHS_ABBR, EN_MONTHS_FULL, today } from "@/lib/time";
import Link from "next/link";

function isValidDate(s: string | undefined): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function fmtEn(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return `${d} ${EN_MONTHS_ABBR[m - 1]} ${y}`;
}

function fmtWeekRange(start: string, end: string): string {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  if (sm === em) return `Week of ${sd}–${ed} ${EN_MONTHS_ABBR[sm - 1]}`;
  return `Week of ${sd} ${EN_MONTHS_ABBR[sm - 1]} – ${ed} ${EN_MONTHS_ABBR[em - 1]}`;
}

const LINK_BTN =
  "inline-block border-[1.5px] border-line bg-paper px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all hover:bg-cream-2";

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const todayISO = today();
  const selectedDate = isValidDate(params.date) ? params.date : todayISO;
  const weekStart = mondayOf(selectedDate);
  const weekEnd = addDays(weekStart, 6);
  const days = weekDaysOf(weekStart);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const [selYear, selMonth] = selectedDate.split("-").map(Number);
  const monthLabel = `${EN_MONTHS_FULL[selMonth - 1]} ${selYear}`;

  const [week, monthlyBookings, pendingBookings] = await Promise.all([
    getWeekBookings(weekStart, weekEnd),
    getMonthlyBookings(selYear, selMonth),
    getPendingBookings(),
  ]);

  return (
    <>
      <RealtimeRefresh tables={["bookings"]} channelKey="rt-bookings" />
      <AdminTopbar
        titleTh="จองห้อง"
        eyebrow={`Bookings · ${fmtEn(selectedDate)}`}
        actions={
          <>
            <Link href={`?date=${prevWeek}`} className={LINK_BTN}>
              ◀ Last week
            </Link>
            <Btn type="button" variant="ink">
              {fmtWeekRange(weekStart, weekEnd)}
            </Btn>
            <Link href={`?date=${nextWeek}`} className={LINK_BTN}>
              Next week ▶
            </Link>
            <Link
              href="/admin/bookings/new"
              className="border-line bg-blue hover:bg-blue-deep inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white uppercase [box-shadow:3px_3px_0_var(--color-ink)] transition-all hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:4px_4px_0_var(--color-ink)]"
            >
              + New Booking
            </Link>
          </>
        }
      />

      <BookingsWeekGrid
        weekDays={days}
        selectedDate={selectedDate}
        today={todayISO}
        rooms={week.rooms}
        bookingsByRoomDay={week.bookingsByRoomDay}
      />

      <Card className="mt-4.5">
        <CardTitle
          th="การจองทั้งเดือน"
          en={`Monthly bookings · ${monthLabel}`}
          menu={`${monthlyBookings.length} bookings`}
        />
        <AdminBookingsListTable
          rows={monthlyBookings}
          emptyHint="No bookings this month yet"
        />
      </Card>

      <Card className="mt-4.5">
        <CardTitle
          th="รออนุมัติ"
          en="Pending approval"
          menu={`${pendingBookings.length} pending`}
        />
        <AdminBookingsListTable
          rows={pendingBookings}
          emptyHint="No pending bookings"
        />
      </Card>
    </>
  );
}
