import type { BookingTab } from "@/data/types";
import { cn } from "@/lib/cn";

export function BookingTabs({
  tabs,
  activeId,
}: {
  tabs: BookingTab[];
  activeId: BookingTab["id"];
}) {
  return (
    <div className="grid grid-cols-2 border-[1.5px] border-line bg-paper p-[3px]">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
              active ? "bg-ink text-yellow" : "text-mute-500",
            )}
          >
            {tab.labelEn} · {tab.labelTh}
          </button>
        );
      })}
    </div>
  );
}
