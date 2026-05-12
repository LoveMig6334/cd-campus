import { CATEGORY_COLOR, type CalendarEvent } from "@/lib/types";

export function CalendarEventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="border-line bg-paper flex items-center gap-3 rounded-[10px] border-[1.5px] px-3 py-2.5">
      <div className="text-mute-500 w-14 shrink-0 font-mono text-[10px]">
        {event.time}
      </div>
      <div
        aria-hidden
        className="w-[3px] self-stretch"
        style={{ background: CATEGORY_COLOR[event.category] }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] leading-[1.15] italic">
          {event.titleTh}
        </div>
        <div className="text-mute-500 mt-0.5 font-mono text-[9px] tracking-[0.12em] uppercase">
          {event.tag}
        </div>
      </div>
    </div>
  );
}
