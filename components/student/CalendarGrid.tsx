import Link from "next/link";
import type { CalendarDay } from "@/lib/types";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarGrid({
  days,
  compact,
}: {
  days: CalendarDay[];
  /** Use a denser grid (booking layout) */
  compact?: boolean;
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
        <DayCell key={i} day={day} />
      ))}
    </div>
  );
}

function DayCell({ day }: { day: CalendarDay }) {
  const base =
    "flex aspect-[1/1.05] flex-col items-center pt-1 font-mono text-[12px] rounded";

  if (!day.inMonth) {
    return <div className={cn(base, "text-mute-300")}>{day.num}</div>;
  }

  const stateClass =
    day.state === "today"
      ? "bg-blue text-white font-semibold"
      : day.state === "selected"
        ? "border-[1.5px] border-ink bg-yellow"
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

  if (day.href && day.state !== "closed") {
    // No prefetch: these point to searchParam variants of the dynamic booking
    // route, so each prefetch is a full server render (DB queries). Prefetching
    // every day cell saturates the pool and slows the actual click.
    return (
      <Link href={day.href} prefetch={false} className={cn(base, stateClass)}>
        {content}
      </Link>
    );
  }

  return <div className={cn(base, stateClass)}>{content}</div>;
}
