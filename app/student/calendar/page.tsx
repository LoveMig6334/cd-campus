import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { CalendarChipRow } from "@/components/student/CalendarChipRow";
import { CalendarEventCard } from "@/components/student/CalendarEventCard";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { IconButton } from "@/components/ui/IconButton";
import { getStudentMonthBookingDots } from "@/lib/queries/bookings";
import { getStudentDayEvents, getStudentMonth } from "@/lib/queries/events";
import { CALENDAR_CHIPS, buildCalendarSkeleton } from "@/lib/ui/calendar";
import { EN_MONTHS_ABBR, currentYearMonth, today } from "@/lib/time";

export default async function StudentCalendar() {
  const { year, month, thaiLabel, enLabel } = currentYearMonth();
  const todayISO = today();
  const todayDay = Number(todayISO.slice(-2));
  const [monthDays, events, bookingDots] = await Promise.all([
    getStudentMonth(year, month),
    getStudentDayEvents(year, month, todayDay),
    getStudentMonthBookingDots(year, month),
  ]);
  const skeleton = buildCalendarSkeleton(year, month, todayISO);
  const days = skeleton.map((cell, i) => {
    if (!cell.inMonth) return cell;
    const eventDots = monthDays[i]?.dots ?? [];
    const bDots = bookingDots.get(cell.num) ?? [];
    const merged = [...eventDots, ...bDots];
    return merged.length ? { ...cell, dots: merged } : cell;
  });
  const selectedLabel = `Events on ${todayDay} ${EN_MONTHS_ABBR[month - 1]}`;

  return (
    <>
      <PageHead
        titleTh="ปฏิทินกิจกรรม"
        titleEn="Calendar"
        action={
          <IconButton label="Filter · ตัวกรอง">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <CalendarMonthRow titleTh={thaiLabel} subEn={enLabel} />
        <CalendarChipRow chips={CALENDAR_CHIPS} activeId="all" />
        <CalendarGrid days={days} />

        <div className="flex items-center gap-2 pt-1 font-mono text-[10px] tracking-[0.18em] uppercase">
          <span>{selectedLabel}</span>
          <span aria-hidden className="bg-line h-px flex-1" />
        </div>
        <div className="space-y-2">
          {events.map((event, i) => (
            <CalendarEventCard key={i} event={event} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
