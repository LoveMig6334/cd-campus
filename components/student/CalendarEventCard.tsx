import { CATEGORY_COLOR, type CalendarEvent } from "@/data/types";

export function CalendarEventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border-[1.5px] border-line bg-paper px-3 py-2.5">
      <div className="w-14 shrink-0 font-mono text-[10px] text-mute-500">
        {event.time}
      </div>
      <div
        aria-hidden
        className="w-[3px] self-stretch"
        style={{ background: CATEGORY_COLOR[event.category] }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-display italic text-[16px] leading-[1.15]">
          {event.titleTh}
        </div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-mute-500">
          {event.tag}
        </div>
      </div>
    </div>
  );
}
