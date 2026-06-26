"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookingConfirmForm } from "@/components/student/BookingConfirmForm";
import { BookingTabs } from "@/components/student/BookingTabs";
import { CalendarGrid } from "@/components/student/CalendarGrid";
import { CalendarMonthRow } from "@/components/student/CalendarMonthRow";
import { PeriodPicker } from "@/components/student/PeriodPicker";
import { RoomList } from "@/components/student/RoomList";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { cn } from "@/lib/cn";
import type { BookingPeriod, BookingTab, CalendarDay, Room } from "@/lib/types";

type Selection = {
  tab: BookingTab["id"];
  date: string;
  period: string;
  room: string;
};

type Kind = "tab" | "date" | "period" | "room";

type Props = Selection & {
  tabs: BookingTab[];
  days: CalendarDay[];
  periods: BookingPeriod[];
  roomList: Room[];
  eyebrow: string;
  enLabel: string;
  onNext: boolean;
  nextMonthParam: string;
  prevMonthHref?: string;
  nextMonthHref?: string;
};

/**
 * Client shell for the booking picker. The server still derives every view
 * model (availability, month nav); this component only makes *selection* feel
 * instant: a click highlights via useOptimistic immediately, then navigates
 * inside a transition to refresh availability from the server.
 *
 * The push URL is rebuilt from the merged optimistic selection (not the
 * server-baked per-item href) so a second click landing before the first
 * navigation commits still carries the earlier choice instead of dropping it.
 */
export function BookingBoard({
  tabs,
  days,
  periods,
  roomList,
  tab,
  date,
  period,
  room,
  eyebrow,
  enLabel,
  onNext,
  nextMonthParam,
  prevMonthHref,
  nextMonthHref,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingKind, setPendingKind] = useState<Kind | null>(null);
  const [sel, applyPatch] = useOptimistic<Selection, Partial<Selection>>(
    { tab, date, period, room },
    (state, patch) => ({ ...state, ...patch }),
  );

  useEffect(() => {
    if (!isPending) setPendingKind(null);
  }, [isPending]);

  function urlFor(s: Selection): string {
    const params = new URLSearchParams();
    if (s.tab !== "music") params.set("tab", s.tab);
    if (onNext) params.set("month", nextMonthParam);
    if (s.date) params.set("date", s.date);
    if (s.period) params.set("period", s.period);
    if (s.room) params.set("room", s.room);
    const qs = params.toString();
    return qs ? `/student/booking?${qs}` : "/student/booking";
  }

  function go(patch: Partial<Selection>, kind: Kind) {
    setPendingKind(kind);
    startTransition(() => {
      applyPatch(patch);
      router.push(urlFor({ ...sel, ...patch }));
    });
  }

  // Availability badges below depend on the date/tab (periods + rooms) and on
  // the period (room fullness). While the relevant data is in flight, dim that
  // section so a stale Booked/Full badge can't be read — or acted on — as fact.
  const periodsBusy =
    isPending && (pendingKind === "date" || pendingKind === "tab");
  const roomsBusy =
    isPending &&
    (pendingKind === "date" || pendingKind === "tab" || pendingKind === "period");
  const busyCls = "transition-opacity";
  const busyOn = "pointer-events-none opacity-50";

  return (
    <>
      <BookingTabs
        tabs={tabs}
        activeId={sel.tab}
        // Switching tab drops the room (the server strips it from the URL too).
        onSelect={(id) => go({ tab: id, room: "" }, "tab")}
      />

      <CalendarMonthRow
        titleTh={enLabel}
        subEn="เลือกวันที่จอง"
        compact
        prevHref={prevMonthHref}
        nextHref={nextMonthHref}
        prevDisabled={!onNext}
        nextDisabled={onNext}
      />
      <CalendarGrid
        days={days}
        compact
        selectedIso={sel.date}
        onDaySelect={(iso) => go({ date: iso }, "date")}
      />

      <SectionDivider>★ Time period · ช่วงเวลา ★</SectionDivider>
      <div className={cn(busyCls, periodsBusy && busyOn)} aria-busy={periodsBusy}>
        <PeriodPicker
          periods={periods}
          selectedId={sel.period}
          onSelect={(id) => go({ period: id }, "period")}
        />
      </div>

      <SectionDivider>★ Choose room · เลือกห้อง ★</SectionDivider>
      <div className={cn(busyCls, roomsBusy && busyOn)} aria-busy={roomsBusy}>
        <RoomList
          rooms={roomList}
          selectedId={sel.room}
          onSelect={(id) => go({ room: id }, "room")}
        />
      </div>

      <SectionDivider>★ Confirm · ยืนยัน ★</SectionDivider>
      <BookingConfirmForm
        date={sel.date}
        period={sel.period}
        room={sel.room}
        eyebrow={eyebrow}
      />
    </>
  );
}
