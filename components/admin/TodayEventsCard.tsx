import type { AdminEvent } from "@/data/types";
import { Card, CardTitle } from "./Card";

export function TodayEventsCard({ events }: { events: AdminEvent[] }) {
  return (
    <Card>
      <CardTitle th="วันนี้" en="Today's events" />
      <div>
        {events.map((event, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-l-[3px] py-2.5 pl-3.5 last:border-b-0"
            style={{
              borderLeftColor: event.barColor,
              borderBottom:
                i < events.length - 1
                  ? "1px dashed var(--color-mute-200)"
                  : undefined,
            }}
          >
            <div className="w-14 shrink-0 font-mono text-[10px] text-mute-500">
              {event.time}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display italic text-[16px] leading-[1.15]">
                {event.title}
              </div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-mute-500">
                {event.tag}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
