import Link from "next/link";
import type { CalendarDay } from "@/lib/types";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarGrid({
  days,
  compact,
  selectedIso,
  onDaySelect,
}: {
  days: CalendarDay[];
  /** Use a denser grid (booking layout) */
  compact?: boolean;
  /** Booking: optimistically-selected ISO date — drives the highlight client-
   *  side, overriding the server-baked `state`, so a click colours instantly. */
  selectedIso?: string;
  /** Booking: select via client navigation instead of a Link, so the highlight
   *  is instant while data refreshes in the background. */
  onDaySelect?: (iso: string, href: string) => void;
}) {
  return (
    <div
      className={cn(
        "border-line bg-paper grid grid-cols-7 border-[1.5px]",
        compact ? "gap-px p-1.5" : "gap-0.5 p-2",
      )}
    >
      {WEEKDAYS.map((d) => (
        <div
          key={d}
          className="text-mute-500 py-1 text-center font-mono text-[9px] tracking-[0.14em] uppercase"
        >
          {d}
        </div>
      ))}
      {days.map((day, i) => (
        <DayCell
          key={i}
          day={day}
          selectedIso={selectedIso}
          onDaySelect={onDaySelect}
        />
      ))}
    </div>
  );
}

function DayCell({
  day,
  selectedIso,
  onDaySelect,
}: {
  day: CalendarDay;
  selectedIso?: string;
  onDaySelect?: (iso: string, href: string) => void;
}) {
  const base =
    "flex aspect-[1/1.05] flex-col items-center pt-1 font-mono text-[12px] rounded";

  if (!day.inMonth) {
    return <div className={cn(base, "text-mute-300")}>{day.num}</div>;
  }

  // When selectedIso is supplied (booking), it is the source of truth for the
  // selected highlight; otherwise fall back to the server-baked state.
  const selected =
    selectedIso !== undefined
      ? day.iso === selectedIso
      : day.state === "selected";
  const stateClass = selected
    ? "border-[1.5px] border-ink bg-yellow"
    : day.state === "today"
      ? "bg-blue text-white font-semibold"
      : day.state === "closed"
        ? "text-mute-300 line-through"
        : "";

  const content = (
    <>
      {day.num}
      {day.dots && day.dots.length > 0 && (
        <div className="mt-0.5 flex gap-0.5">
          {day.dots.map((color, i) => (
            <span
              key={i}
              className="inline-block h-1 w-1 rounded-full"
              style={{ background: color }}
            />
          ))}
        </div>
      )}
    </>
  );

  if (day.state !== "closed" && day.href) {
    // Booking interactive mode: client-side select for an instant highlight.
    if (onDaySelect && day.iso) {
      return (
        <button
          type="button"
          onClick={() => onDaySelect(day.iso!, day.href!)}
          className={cn(base, stateClass, "cursor-pointer")}
        >
          {content}
        </button>
      );
    }
    // No prefetch: these point to searchParam variants of the dynamic booking
    // route, so each prefetch is a full server render (DB queries). Prefetching
    // every day cell saturates the pool and slows the actual click.
    return (
      <Link
        href={day.href}
        prefetch={false}
        className={cn(base, stateClass, "cursor-pointer")}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn(base, stateClass)}>{content}</div>;
}
