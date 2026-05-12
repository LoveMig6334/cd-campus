import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { CalendarChipRow } from "@/components/student/CalendarChipRow";
import { CalendarEventCard } from "@/components/student/CalendarEventCard";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { IconButton } from "@/components/ui/IconButton";
import {
  CALENDAR_CHIPS,
  MAY_2026_DAYS,
  SELECTED_DAY_EVENTS,
  SELECTED_DAY_LABEL,
} from "@/supabase/seed/data/calendar";

export default function StudentCalendar() {
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
        <CalendarMonthRow titleTh="พฤษภาคม" subEn="May 2026" />
        <CalendarChipRow chips={CALENDAR_CHIPS} activeId="all" />
        <CalendarGrid days={MAY_2026_DAYS} />

        <div className="flex items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span>{SELECTED_DAY_LABEL}</span>
          <span aria-hidden className="h-px flex-1 bg-line" />
        </div>
        <div className="space-y-2">
          {SELECTED_DAY_EVENTS.map((event, i) => (
            <CalendarEventCard key={i} event={event} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
