import Link from "next/link";
import { cn } from "@/lib/cn";
import { CATEGORY_COLOR } from "@/lib/types";
import type { AdminCalendarRow } from "@/lib/queries/events";
import { deleteEvent } from "@/app/admin/calendar/actions";

function formatDateTime(ts: string): { date: string; time: string } {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  if (!m) return { date: ts.slice(0, 10), time: ts.slice(11, 16) };
  const monthMap: Record<string, string> = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
  };
  return {
    date: `${parseInt(m[3], 10)} ${monthMap[m[2]] ?? m[2]}`,
    time: m[4],
  };
}

export function AdminCalendarEventList({ rows }: { rows: AdminCalendarRow[] }) {
  return (
    <div className="border-ink bg-paper border-[1.5px]">
      <div className="border-ink bg-cream text-mute-700 border-b-[1.5px] px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase">
        This month · {rows.length} events
      </div>
      <ul>
        {rows.length === 0 && (
          <li className="text-mute-500 px-3 py-3 font-mono text-[12px]">
            No events this month.
          </li>
        )}
        {rows.map((row, i) => {
          const { date, time } = formatDateTime(row.starts_at);
          const dot = CATEGORY_COLOR[row.category];
          const border =
            i < rows.length - 1 ? "border-b border-dashed border-mute-200" : "";
          return (
            <li
              key={row.id}
              className={cn("flex items-center gap-3 px-3 py-2.5", border)}
            >
              <span
                className="border-ink h-2 w-2 shrink-0 border"
                style={{ background: dot }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-mute-500 font-mono text-[10px] tracking-[0.14em] uppercase">
                    {date} · {time}
                  </span>
                  {row.highlight && (
                    <span className="font-mono text-[9px] tracking-[0.14em] text-yellow-700 uppercase">
                      ★ briefing
                    </span>
                  )}
                </div>
                <div className="font-display truncate text-[14px] italic">
                  {row.title_th}
                </div>
                {row.tag && (
                  <div className="text-mute-500 truncate font-mono text-[10px]">
                    {row.tag}
                  </div>
                )}
              </div>
              <Link
                href={`/admin/calendar/${row.id}/edit`}
                className="border-line bg-paper text-mute-700 hover:bg-cream border-[1.5px] px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase"
              >
                Edit
              </Link>
              <form action={deleteEvent}>
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="font-mono text-[10px] tracking-[0.14em] text-red-600 uppercase hover:text-red-700"
                >
                  Delete
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
