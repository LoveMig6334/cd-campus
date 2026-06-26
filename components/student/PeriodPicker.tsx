import Link from "next/link";
import type { BookingPeriod } from "@/lib/types";
import { cn } from "@/lib/cn";

const STATUS_DOT: Record<BookingPeriod["status"], string> = {
  available: "text-house-green",
  selected: "text-white",
  booked: "text-house-pink",
};

const STATUS_LABEL: Record<BookingPeriod["status"], string> = {
  available: "● Available",
  selected: "● Selected",
  booked: "● Booked",
};

export function PeriodPicker({
  periods,
  selectedId,
  onSelect,
}: {
  periods: BookingPeriod[];
  /** Booking: optimistically-selected period id — drives the highlight
   *  client-side so the click registers instantly. */
  selectedId?: string;
  /** Booking: select via client navigation instead of a Link. */
  onSelect?: (id: string, href: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {periods.map((p) => {
        // selectedId (when supplied) overrides the server-baked "selected"
        // status; a booked slot can never read as selected.
        const active =
          selectedId !== undefined
            ? p.id === selectedId && p.status !== "booked"
            : p.status === "selected";
        const displayStatus: BookingPeriod["status"] = active
          ? "selected"
          : p.status === "booked"
            ? "booked"
            : "available";
        const cls = cn(
          "block border-[1.5px] border-line px-2 py-2.5 text-center transition-colors",
          active ? "bg-blue text-white" : "bg-paper",
        );
        const inner = (
          <>
            <div className="font-display text-[16px] leading-none italic">
              {p.label}
            </div>
            <div
              className={cn(
                "mt-1 font-mono text-[9px] tracking-[0.06em]",
                active ? "text-yellow" : "text-mute-500",
              )}
            >
              {p.time}
            </div>
            <div
              className={cn(
                "mt-1 font-mono text-[8.5px] tracking-[0.12em] uppercase",
                STATUS_DOT[displayStatus],
              )}
            >
              {STATUS_LABEL[displayStatus]}
            </div>
          </>
        );

        if (p.href) {
          // Booking interactive mode: client-side select for an instant highlight.
          if (onSelect && p.id) {
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onSelect(p.id!, p.href!)}
                className={cn(cls, "cursor-pointer")}
              >
                {inner}
              </button>
            );
          }
          // No prefetch — dynamic booking route, prefetch only adds load.
          return (
            <Link
              key={p.label}
              href={p.href}
              prefetch={false}
              className={cn(cls, "cursor-pointer")}
            >
              {inner}
            </Link>
          );
        }

        return (
          <button key={p.label} type="button" className={cls}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
