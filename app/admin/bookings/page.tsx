import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { AdminTodayBookingsTable } from "@/components/admin/AdminTodayBookingsTable";
import { BookingsWeekGrid } from "@/components/admin/BookingsWeekGrid";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { Gantt } from "@/components/admin/Gantt";
import {
  addDays,
  getDayBookings,
  getGanttRooms,
  getWeekBookings,
  mondayOf,
  weekDaysOf,
} from "@/lib/queries/bookings";
import { GANTT_HOURS } from "@/lib/ui/admin";

const TODAY = "2026-05-12";
const MONTHS = [
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
];
const MONTHS_TH = [
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
];

function isValidDate(s: string | undefined): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function fmtEn(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function fmtEnShort(dateISO: string): string {
  const [, m, d] = dateISO.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function fmtTh(dateISO: string): string {
  const [, m, d] = dateISO.split("-").map(Number);
  return `${d} ${MONTHS_TH[m - 1]}`;
}

function fmtWeekRange(start: string, end: string): string {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  if (sm === em) return `Week of ${sd}–${ed} ${MONTHS[sm - 1]}`;
  return `Week of ${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]}`;
}

const LINK_BTN =
  "inline-block border-[1.5px] border-line bg-paper px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all hover:bg-cream-2";

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const selectedDate = isValidDate(params.date) ? params.date : TODAY;
  const weekStart = mondayOf(selectedDate);
  const weekEnd = addDays(weekStart, 6);
  const days = weekDaysOf(weekStart);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const [week, ganttRooms, dayBookings] = await Promise.all([
    getWeekBookings(weekStart, weekEnd),
    getGanttRooms(selectedDate),
    getDayBookings(selectedDate),
  ]);

  const activeCount = dayBookings.filter(
    (b) => b.status === "Confirmed",
  ).length;
  const pendingCount = dayBookings.filter((b) => b.status === "Pending").length;

  return (
    <>
      <AdminTopbar
        titleTh="จองห้อง"
        eyebrow={`Bookings · ${fmtEn(selectedDate)}`}
        actions={
          <>
            <Link href={`?date=${prevWeek}`} className={LINK_BTN}>
              ◀ Last week
            </Link>
            <Btn variant="ink">{fmtWeekRange(weekStart, weekEnd)}</Btn>
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
        today={TODAY}
        rooms={week.rooms}
        bookingsByRoomDay={week.bookingsByRoomDay}
      />

      <div className="mt-[18px]">
        <Gantt hours={GANTT_HOURS} rooms={ganttRooms} />
      </div>

      <Card className="mt-[18px]">
        <CardTitle
          th={`รายการจอง ${fmtTh(selectedDate)}`}
          en={`Bookings on ${fmtEnShort(selectedDate)}`}
          menu={`${activeCount} active · ${pendingCount} pending`}
        />
        <AdminTodayBookingsTable rows={dayBookings} />
      </Card>
    </>
  );
}
