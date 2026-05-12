import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { BookingTabs } from "@/components/student/BookingTabs";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { PeriodPicker } from "@/components/student/PeriodPicker";
import { RoomList } from "@/components/student/RoomList";
import { CtaButton } from "@/components/ui/CtaButton";
import { IconButton } from "@/components/ui/IconButton";
import { SectionDivider } from "@/components/ui/SectionDivider";
import {
  BOOKING_ACTIVE_TAB,
  BOOKING_CONFIRM_EYEBROW,
  BOOKING_MAY_DAYS,
  BOOKING_PERIODS,
  BOOKING_ROOMS,
  BOOKING_TABS,
} from "@/data/bookings";

export default function StudentBooking() {
  return (
    <>
      <PageHead
        titleTh="จองห้อง"
        titleEn="Room Booking"
        action={
          <IconButton label="New booking · จองใหม่">
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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <BookingTabs tabs={BOOKING_TABS} activeId={BOOKING_ACTIVE_TAB} />

        <CalendarMonthRow titleTh="May 2026" subEn="เลือกวันที่จอง" compact />
        <CalendarGrid days={BOOKING_MAY_DAYS} compact />

        <SectionDivider>★ Time period · ช่วงเวลา ★</SectionDivider>
        <PeriodPicker periods={BOOKING_PERIODS} />

        <SectionDivider>★ Choose room · เลือกห้อง ★</SectionDivider>
        <RoomList rooms={BOOKING_ROOMS} />

        <CtaButton eyebrow={BOOKING_CONFIRM_EYEBROW}>
          Confirm Booking →
        </CtaButton>
      </MobileBody>
    </>
  );
}
