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

export function PeriodPicker({ periods }: { periods: BookingPeriod[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {periods.map((p) => {
        const active = p.status === "selected";
        const cls = cn(
          "block border-[1.5px] border-line px-2 py-2.5 text-center transition-colors",
          active ? "bg-blue text-white" : "bg-paper",
        );
        const inner = (
          <>
            <div className="font-display italic text-[16px] leading-none">
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
                "mt-1 font-mono text-[8.5px] uppercase tracking-[0.12em]",
                STATUS_DOT[p.status],
              )}
            >
              {STATUS_LABEL[p.status]}
            </div>
          </>
        );

        if (p.href) {
          return (
            <Link key={p.label} href={p.href} className={cls}>
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
