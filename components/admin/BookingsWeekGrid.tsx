import Link from "next/link";
import type { GanttBarVariant } from "@/lib/types";
import type { WeekChip } from "@/lib/queries/bookings";
import { cn } from "@/lib/cn";

const CHIP_VARIANT: Record<GanttBarVariant, string> = {
  default: "bg-blue text-white",
  y: "bg-yellow text-ink",
  p: "bg-house-purple text-white",
  g: "bg-house-green text-white",
  o: "bg-house-orange text-white",
};

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_ABBR = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function dayHeader(dateISO: string, idx: number, today: string) {
  const [, m, d] = dateISO.split("-").map(Number);
  return {
    weekday: WEEKDAY_LABELS[idx],
    dayNum: d,
    monthAbbr: MONTH_ABBR[m - 1],
    isToday: dateISO === today,
  };
}

export function BookingsWeekGrid({
  weekDays,
  selectedDate,
  today,
  rooms,
  bookingsByRoomDay,
}: {
  weekDays: string[];
  selectedDate: string;
  today: string;
  rooms: { id: string; nameEn: string; nameTh: string }[];
  bookingsByRoomDay: Record<string, Record<string, WeekChip[]>>;
}) {
  return (
    <div className="border-line bg-cream overflow-x-auto border-[1.5px] p-3.5">
      <div className="grid min-w-[820px] grid-cols-[160px_repeat(7,1fr)]">
        <div className="border-ink bg-paper text-mute-500 border-b-[1.5px] px-2.5 py-2 font-mono text-[10px] tracking-[0.1em] uppercase">
          Room
        </div>
        {weekDays.map((dayISO, i) => {
          const h = dayHeader(dayISO, i, today);
          const isSelected = dayISO === selectedDate;
          return (
            <Link
              key={dayISO}
              href={`?date=${dayISO}`}
              className={cn(
                "border-ink border-b-[1.5px] px-2.5 py-2 text-left",
                i < 6 && "border-mute-300 border-r border-dashed",
                isSelected ? "bg-blue text-white" : "bg-paper",
              )}
            >
              <div
                className={cn(
                  "font-mono text-[10px] tracking-[0.1em] uppercase",
                  isSelected ? "text-white/80" : "text-mute-500",
                )}
              >
                {h.weekday}
                {h.isToday && " · today"}
              </div>
              <div
                className={cn(
                  "font-display text-[14px] leading-tight italic",
                  isSelected ? "text-white" : "text-ink",
                )}
              >
                {h.dayNum} {h.monthAbbr}
              </div>
            </Link>
          );
        })}

        {rooms.map((room) => (
          <RoomRow
            key={room.id}
            room={room}
            weekDays={weekDays}
            bookings={bookingsByRoomDay[room.id] ?? {}}
          />
        ))}
      </div>
    </div>
  );
}

function RoomRow({
  room,
  weekDays,
  bookings,
}: {
  room: { id: string; nameEn: string; nameTh: string };
  weekDays: string[];
  bookings: Record<string, WeekChip[]>;
}) {
  return (
    <>
      <div className="border-mute-300 border-r-ink bg-paper font-display border-r-[1.5px] border-b border-dashed px-2.5 py-3 text-[15px] italic">
        {room.nameEn}
        <small className="text-mute-500 mt-0.5 block font-mono text-[9px] tracking-[0.14em] uppercase not-italic">
          {room.nameTh}
        </small>
      </div>
      {weekDays.map((dayISO, i) => {
        const chips = bookings[dayISO] ?? [];
        return (
          <div
            key={dayISO}
            className={cn(
              "border-mute-300 bg-paper relative min-h-16 overflow-hidden border-b border-dashed px-1.5 py-1.5",
              i < 6 && "border-mute-300 border-r border-dashed",
            )}
          >
            {chips.map((c) => (
              <Link
                key={c.id}
                href={`/admin/bookings/${c.id}/edit`}
                className={cn(
                  "border-ink mt-0.5 block border-[1.5px] px-1.5 py-0.5 font-mono text-[10px] [box-shadow:1px_1px_0_var(--color-ink)] first:mt-0",
                  CHIP_VARIANT[c.variant],
                )}
              >
                {c.startHHMM}
              </Link>
            ))}
          </div>
        );
      })}
    </>
  );
}
