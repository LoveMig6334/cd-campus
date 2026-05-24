import type { AdminWeekDay } from "@/lib/queries/events";
import { Card, CardTitle } from "./Card";

export function WeekEventsCard({ days }: { days: AdminWeekDay[] }) {
  const total = days.reduce((n, d) => n + d.events.length, 0);
  const active = days.filter((d) => d.events.length > 0);

  return (
    <Card accent>
      <CardTitle
        th="สัปดาห์นี้"
        en="This week's events"
        menu={`${total} event${total === 1 ? "" : "s"}`}
      />
      {active.length === 0 ? (
        <p className="text-mute-500 py-8 text-center font-mono text-[11px] tracking-[0.12em] uppercase">
          No events this week · ไม่มีกิจกรรมสัปดาห์นี้
        </p>
      ) : (
        <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((day) => (
            <div key={day.dateISO}>
              <div className="border-line flex items-baseline gap-2 border-b-[1.5px] pb-1.5">
                <span className="font-display text-[17px] leading-none italic">
                  {day.weekdayTh}
                </span>
                <span className="text-mute-500 font-mono text-[9px] tracking-[0.14em] uppercase">
                  {day.label}
                </span>
                {day.isToday && (
                  <span className="text-blue-deep ml-auto font-mono text-[9px] tracking-[0.14em] uppercase">
                    Today
                  </span>
                )}
              </div>
              <div className="mt-1">
                {day.events.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-l-[3px] py-2 pl-3.5"
                    style={{
                      borderLeftColor: event.barColor,
                      borderBottom:
                        i < day.events.length - 1
                          ? "1px dashed var(--color-mute-200)"
                          : undefined,
                    }}
                  >
                    <div className="text-mute-500 w-10 shrink-0 font-mono text-[10px]">
                      {event.time}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-[15px] leading-[1.15] italic">
                        {event.title}
                      </div>
                      <div className="text-mute-500 mt-0.5 font-mono text-[9px] tracking-[0.12em] uppercase">
                        {event.tag}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
