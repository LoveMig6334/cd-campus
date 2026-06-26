import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { BookingBoard } from "@/components/student/BookingBoard";
import { IconButton } from "@/components/ui/IconButton";
import { getStudentMonthBookingDots } from "@/lib/queries/bookings";
import { getRoomsAndBookings } from "@/lib/queries/rooms";
import type { BookingPeriod, BookingTab, CalendarDay, Room } from "@/lib/types";
import {
  BOOKING_PERIODS,
  BOOKING_TABS,
  PERIOD_HOURS,
  buildBookingMonthDays,
  type PeriodId,
} from "@/lib/ui/booking";
import {
  EN_MONTHS_ABBR,
  EN_MONTHS_FULL,
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
  const cur = currentYearMonth();
  const nextMonth = cur.month === 12 ? 1 : cur.month + 1;
  const nextMonthYear = cur.month === 12 ? cur.year + 1 : cur.year;
  const nextMonthParam = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}`;
  const monthRaw = String(sp.month ?? "");
  const onNext = monthRaw === nextMonthParam;
  const year = onNext ? nextMonthYear : cur.year;
  const month = onNext ? nextMonth : cur.month;
  const enLabel = onNext ? `${EN_MONTHS_FULL[month - 1]} ${year}` : cur.enLabel;
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

  const [{ rooms, bookingsByRoom }, bookingDots] = await Promise.all([
    getRoomsAndBookings(
      tab === "music" ? "music" : "meeting",
      date || undefined,
    ),
    getStudentMonthBookingDots(year, month),
  ]);
  // Music tab shows a single room (the instrument subtitle is dropped) and
  // it's auto-selected so students don't have to pick.
  const visibleRooms = tab === "music" ? rooms.slice(0, 1) : rooms;
  const autoMusicRoom =
    tab === "music" && visibleRooms[0] ? visibleRooms[0].id : "";
  const effectiveRoom = room || autoMusicRoom;
  const selectedPeriodStart = period ? PERIOD_HOURS[period].start : "";

  // Period is "booked" if the selected room (or every visible room when none
  // is selected) has that period taken.
  function isPeriodBooked(periodStart: string): boolean {
    if (!date) return false;
    if (effectiveRoom) {
      return bookingsByRoom.get(effectiveRoom)?.has(periodStart) ?? false;
    }
    if (visibleRooms.length === 0) return false;
    return visibleRooms.every(
      (r) => bookingsByRoom.get(r.id)?.has(periodStart) ?? false,
    );
  }

  // Room is "full" for the selection: if a period is picked, only that
  // specific period needs to be booked; otherwise fall back to day-level.
  function isRoomFull(roomId: string): boolean {
    if (!date) return false;
    const booked = bookingsByRoom.get(roomId);
    if (!booked) return false;
    if (selectedPeriodStart) return booked.has(selectedPeriodStart);
    return booked.size >= Object.keys(PERIOD_HOURS).length;
  }

  const currentParams: Record<string, string> = {};
  if (tab !== "music") currentParams.tab = tab;
  if (date) currentParams.date = date;
  if (period) currentParams.period = period;
  if (room) currentParams.room = room;
  if (onNext) currentParams.month = nextMonthParam;

  // Month nav strips date/period/room so navigating to a sibling month
  // doesn't drag a now-invalid selection across.
  const monthNavBase: Record<string, string> = {};
  if (tab !== "music") monthNavBase.tab = tab;
  const nextMonthHref = onNext
    ? undefined
    : buildHref(monthNavBase, { month: nextMonthParam });
  const prevMonthHref = onNext
    ? buildHref(monthNavBase, { month: undefined })
    : undefined;

  const tabs: BookingTab[] = BOOKING_TABS.map((t) => ({
    ...t,
    href: buildHref(currentParams, {
      tab: t.id === "music" ? undefined : t.id,
      room: undefined,
    }),
  }));

  const days: CalendarDay[] = buildBookingMonthDays(year, month, todayISO).map(
    (d) => {
      if (!d.inMonth) return d;
      const dots = bookingDots.get(d.num);
      const withDots = dots && dots.length ? { ...d, dots } : d;
      if (withDots.state === "closed") return withDots;
      const iso = `${year}-${monthStr}-${String(d.num).padStart(2, "0")}`;
      return {
        ...withDots,
        iso,
        href: buildHref(currentParams, { date: iso }),
        state: iso === date ? ("selected" as const) : withDots.state,
      };
    },
  );

  const periods: BookingPeriod[] = BOOKING_PERIODS.map((p) => {
    const booked = isPeriodBooked(PERIOD_HOURS[p.id].start);
    const status: BookingPeriod["status"] = booked
      ? "booked"
      : p.id === period
        ? "selected"
        : "available";
    return {
      ...p,
      // Omit the href on booked periods so the cell is no longer clickable.
      href: booked ? undefined : buildHref(currentParams, { period: p.id }),
      status,
    };
  });

  const roomList: Room[] = visibleRooms.map((r) => {
    const full = isRoomFull(r.id);
    return {
      ...r,
      status: full ? ("full" as const) : ("free" as const),
      nameTh: tab === "music" ? "" : r.nameTh,
      // Full rooms aren't clickable — any new booking would conflict anyway.
      href: full ? undefined : buildHref(currentParams, { room: r.id }),
      selected: r.id === effectiveRoom,
    };
  });

  const eyebrow = buildEyebrow(
    date,
    period ? periodLabel(period) : "",
    roomLabel(rooms, effectiveRoom),
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
        <BookingBoard
          tabs={tabs}
          days={days}
          periods={periods}
          roomList={roomList}
          tab={tab}
          date={date}
          period={period}
          room={effectiveRoom}
          eyebrow={eyebrow}
          enLabel={enLabel}
          onNext={onNext}
          nextMonthParam={nextMonthParam}
          prevMonthHref={prevMonthHref}
          nextMonthHref={nextMonthHref}
        />
      </MobileBody>
    </>
  );
}
