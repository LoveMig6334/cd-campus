import type { AdminTabItem } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  tabs: AdminTabItem[];
  activeId: string;
  className?: string;
};

export function TabBar({ tabs, activeId, className }: Props) {
  return (
    <div
      className={cn("border-ink mb-3.5 flex gap-1 border-b-[1.5px]", className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "-mb-[1.5px] border-x-[1.5px] border-t-[1.5px] px-3.5 py-2.5 font-mono text-[11px] tracking-[0.1em] uppercase transition-colors",
              active
                ? "border-ink bg-paper text-ink"
                : "text-mute-500 hover:text-ink border-transparent",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <small className="ml-1 text-[10px] tracking-[0.04em]">
                ({tab.count})
              </small>
            )}
          </button>
        );
      })}
    </div>
  );
}
