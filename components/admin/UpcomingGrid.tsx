import { CATEGORY_COLOR, type CalendarEvent } from "@/data/types";

export function UpcomingGrid({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {events.map((event, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-[1.5px] border-line bg-paper px-3 py-2.5"
          style={{
            borderLeft: `3px solid ${CATEGORY_COLOR[event.category]}`,
          }}
        >
          <div className="w-14 shrink-0 font-mono text-[10px] text-mute-500">
            {event.time}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display italic text-[16px] leading-[1.15]">
              {event.titleTh}
            </div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-mute-500">
              {event.tag}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
