import { CATEGORY_COLOR, type BigCalDay, type BigCalEvent } from "@/lib/types";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const VARIANT_COLOR: Record<BigCalEvent["variant"], string> = {
  sport: CATEGORY_COLOR.sport,
  tradition: CATEGORY_COLOR.tradition,
  music: CATEGORY_COLOR.music,
  admin: CATEGORY_COLOR.admin,
  academic: CATEGORY_COLOR.academic,
  highlight: "var(--color-yellow)",
};

const VARIANT_TEXT: Record<BigCalEvent["variant"], string> = {
  sport: "white",
  tradition: "white",
  music: "white",
  admin: "white",
  academic: "white",
  highlight: "var(--color-ink)",
};

export function BigCalGrid({ days }: { days: BigCalDay[] }) {
  return (
    <div className="grid grid-cols-7 border-[1.5px] border-ink bg-paper">
      <div className="col-span-7 grid grid-cols-7 bg-ink font-mono text-[10px] tracking-[0.18em] text-yellow">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2.5 py-2">
            {d}
          </div>
        ))}
      </div>
      {days.map((day, i) => (
        <div
          key={i}
          className={cn(
            "relative aspect-[1/0.85] overflow-hidden border-r border-b border-dashed border-mute-200 px-2 py-1.5",
            (i + 1) % 7 === 0 && "border-r-0",
            !day.inMonth && "bg-cream-2 text-mute-300",
            day.isToday && "bg-blue text-white",
          )}
        >
          <span className="font-mono text-[11px]">{day.num}</span>
          {day.events?.map((event, j) => (
            <div
              key={j}
              className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap px-1 py-0.5 font-mono text-[9px]"
              style={{
                background: VARIANT_COLOR[event.variant],
                color: VARIANT_TEXT[event.variant],
              }}
            >
              {event.title}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
