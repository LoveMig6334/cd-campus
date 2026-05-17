import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { BookingTabs } from "@/components/student/BookingTabs";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { PeriodPicker } from "@/components/student/PeriodPicker";
import { RoomList } from "@/components/student/RoomList";
import { BookingConfirmForm } from "@/components/student/BookingConfirmForm";
import { IconButton } from "@/components/ui/IconButton";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { getMeetingRooms, getMusicRooms } from "@/lib/queries/rooms";
import type { BookingPeriod, BookingTab, CalendarDay, Room } from "@/lib/types";
import {
  BOOKING_PERIODS,
  BOOKING_TABS,
  buildBookingMonthDays,
  type PeriodId,
} from "@/lib/ui/booking";
import {
  EN_MONTHS_ABBR,
  currentYearMonth,
  monthDateSet,
  today,
} from "@/lib/time";

const TABS = ["music", "meeting"] as const;
type TabId = (typeof TABS)[number];

function isTab(v: string): v is TabId {
  return (TABS as readonly string[]).includes(v);
}

function isPeriodId(v: string): v is PeriodId {
  return v === "morning" || v === "midday" || v === "evening";
}


function buildHref(
  current: Record<string, string>,
  patch: Record<string, string | undefined>,
): string {
  const next: Record<string, string> = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k];
    else next[k] = v;
  }
  const qs = new URLSearchParams(next).toString();
  return qs ? `/student/booking?${qs}` : "/student/booking";
}

function periodLabel(p: PeriodId): string {
  return BOOKING_PERIODS.find((bp) => bp.id === p)?.label ?? "";
}

function roomLabel(rooms: Room[], id: string): string {
  return rooms.find((r) => r.id === id)?.nameEn ?? "";
}

function buildEyebrow(
  date: string,
  periodText: string,
  roomName: string,
  monthAbbr: string,
): string {
  if (!date && !periodText && !roomName) return "";
  const day = date ? Number(date.slice(-2)) : "·";
  return `${day} ${monthAbbr.toUpperCase()} · ${periodText ? periodText.toUpperCase() : "·"} · ${roomName ? roomName.toUpperCase() : "·"}`;
}

export default async function StudentBooking({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { year, month, enLabel } = currentYearMonth();
  const todayISO = today();
  const validDates = monthDateSet(year, month);
  const enMonthAbbr = EN_MONTHS_ABBR[month - 1];
  const monthStr = String(month).padStart(2, "0");
  const tabRaw = String(sp.tab ?? "music");
  const tab: TabId = isTab(tabRaw) ? tabRaw : "music";
  const dateRaw = String(sp.date ?? "");
  const date = validDates.has(dateRaw) ? dateRaw : "";
  const periodRaw = String(sp.period ?? "");
  const period = isPeriodId(periodRaw) ? periodRaw : "";
  const room = String(sp.room ?? "");
  const ok = sp.ok === "1";

  const rooms =
    tab === "music" ? await getMusicRooms() : await getMeetingRooms();

  const currentParams: Record<string, string> = {};
  if (tab !== "music") currentParams.tab = tab;
  if (date) currentParams.date = date;
  if (period) currentParams.period = period;
  if (room) currentParams.room = room;

  const tabs: BookingTab[] = BOOKING_TABS.map((t) => ({
    ...t,
    href: buildHref(currentParams, {
      tab: t.id === "music" ? undefined : t.id,
      room: undefined,
    }),
  }));

  const days: CalendarDay[] = buildBookingMonthDays(year, month, todayISO).map(
    (d) => {
      if (!d.inMonth || d.state === "closed") return d;
      const iso = `${year}-${monthStr}-${String(d.num).padStart(2, "0")}`;
      return {
        ...d,
        href: buildHref(currentParams, { date: iso }),
        state: iso === date ? ("selected" as const) : d.state,
      };
    },
  );

  const periods: BookingPeriod[] = BOOKING_PERIODS.map((p) => ({
    ...p,
    href: buildHref(currentParams, { period: p.id }),
    status: p.id === period ? ("selected" as const) : "available",
  }));

  const roomList: Room[] = rooms.map((r) => ({
    ...r,
    href: buildHref(currentParams, { room: r.id }),
    selected: r.id === room,
  }));

  const eyebrow = buildEyebrow(
    date,
    period ? periodLabel(period) : "",
    roomLabel(rooms, room),
    enMonthAbbr,
  );

  return (
    <>
      <PageHead
        titleTh="จองห้อง"
        titleEn="Room Booking"
        action={
          <IconButton label="Help · ช่วย">
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
              <path d="M12 17h.01M12 13a2 2 0 1 0-2-2" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        {ok && (
          <div className="border-ink bg-yellow text-ink border-[1.5px] px-3 py-2 font-mono text-[11px] tracking-[0.14em] uppercase">
            ✓ Booking submitted · ส่งคำขอแล้ว — admin will confirm shortly.
          </div>
        )}
        <BookingTabs tabs={tabs} activeId={tab} />

        <CalendarMonthRow titleTh={enLabel} subEn="เลือกวันที่จอง" compact />
        <CalendarGrid days={days} compact />

        <SectionDivider>★ Time period · ช่วงเวลา ★</SectionDivider>
        <PeriodPicker periods={periods} />

        <SectionDivider>★ Choose room · เลือกห้อง ★</SectionDivider>
        <RoomList rooms={roomList} />

        <SectionDivider>★ Confirm · ยืนยัน ★</SectionDivider>
        <BookingConfirmForm
          date={date}
          period={period}
          room={room}
          eyebrow={eyebrow}
        />
      </MobileBody>
    </>
  );
}
