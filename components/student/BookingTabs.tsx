import Link from "next/link";
import type { BookingTab } from "@/lib/types";
import { cn } from "@/lib/cn";

export function BookingTabs({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: BookingTab[];
  activeId: BookingTab["id"];
  /** Booking: select via client navigation instead of a Link, so the active
   *  tab switches instantly while the room list refreshes in the background. */
  onSelect?: (id: BookingTab["id"], href: string) => void;
}) {
  return (
    <div className="border-line bg-paper grid grid-cols-2 border-[1.5px] p-[3px]">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const cls = cn(
          "py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
          active
            ? "bg-ink text-yellow dark:bg-blue dark:text-white"
            : "text-mute-500",
        );
        const label = `${tab.labelEn} · ${tab.labelTh}`;

        if (tab.href) {
          // Booking interactive mode: client-side select for an instant switch.
          if (onSelect) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id, tab.href!)}
                className={cn(cls, "cursor-pointer")}
              >
                {label}
              </button>
            );
          }
          // No prefetch — dynamic booking route, prefetch only adds load.
          return (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch={false}
              className={cn(cls, "cursor-pointer")}
            >
              {label}
            </Link>
          );
        }

        return (
          <button key={tab.id} type="button" className={cls}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
