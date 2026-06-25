import { Suspense, type ReactNode } from "react";
import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { CalendarChipRow } from "@/components/student/CalendarChipRow";
import { CalendarEventCard } from "@/components/student/CalendarEventCard";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { IconButton } from "@/components/ui/IconButton";
import { getStudentDayEvents, getStudentMonth } from "@/lib/queries/events";
import { CALENDAR_CHIPS, buildCalendarSkeleton } from "@/lib/ui/calendar";
import type { CalendarDay } from "@/lib/types";
import { EN_MONTHS_ABBR, currentYearMonth, today } from "@/lib/time";

export default function StudentCalendar() {
  const { year, month, thaiLabel, enLabel } = currentYearMonth();
  const todayISO = today();
  const todayDay = Number(todayISO.slice(-2));
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
        {/* Static shell paints immediately; the grid dots + event list stream
            in behind Suspense (fallback shows the real grid sans dots). */}
        <CalendarMonthRow titleTh={thaiLabel} subEn={enLabel} />
        <CalendarChipRow chips={CALENDAR_CHIPS} activeId="all" />
        <Suspense
          fallback={
            <CalendarSection
              days={buildCalendarSkeleton(year, month, todayISO)}
              selectedLabel={selectedLabel}
            />
          }
        >
          <CalendarData
            year={year}
            month={month}
            todayISO={todayISO}
            todayDay={todayDay}
            selectedLabel={selectedLabel}
          />
        </Suspense>
      </MobileBody>
    </>
  );
}

async function CalendarData({
  year,
  month,
  todayISO,
  todayDay,
  selectedLabel,
}: {
  year: number;
  month: number;
  todayISO: string;
  todayDay: number;
  selectedLabel: string;
}) {
  const [monthDays, events] = await Promise.all([
    getStudentMonth(year, month),
    getStudentDayEvents(year, month, todayDay),
  ]);
  const days = buildCalendarSkeleton(year, month, todayISO).map((cell, i) => {
    if (!cell.inMonth) return cell;
    const eventDots = monthDays[i]?.dots ?? [];
    return eventDots.length ? { ...cell, dots: eventDots } : cell;
  });
  return (
    <CalendarSection days={days} selectedLabel={selectedLabel}>
      {events.map((event, i) => (
        <CalendarEventCard key={i} event={event} />
      ))}
    </CalendarSection>
  );
}

// Shared by the loaded state (children = event cards) and the Suspense fallback
// (no children → pulsing placeholders). The grid renders either way, so only
// the dots + event list change on resolve — a near-seamless transition.
function CalendarSection({
  days,
  selectedLabel,
  children,
}: {
  days: CalendarDay[];
  selectedLabel: string;
  children?: ReactNode;
}) {
  return (
    <>
      <CalendarGrid days={days} />
      <div className="flex items-center gap-2 pt-1 font-mono text-[10px] tracking-[0.18em] uppercase">
        <span>{selectedLabel}</span>
        <span aria-hidden className="bg-line h-px flex-1" />
      </div>
      <div className="space-y-2">
        {children ?? (
          <div className="animate-pulse space-y-2">
            <div className="border-line bg-paper h-16 border-[1.5px]" />
            <div className="border-line bg-paper h-16 border-[1.5px]" />
          </div>
        )}
      </div>
    </>
  );
}
