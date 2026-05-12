import Link from "next/link";
import type { BookingTab } from "@/lib/types";
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
        const cls = cn(
          "py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
          active ? "bg-ink text-yellow" : "text-mute-500",
        );
        const label = `${tab.labelEn} · ${tab.labelTh}`;

        if (tab.href) {
          return (
            <Link key={tab.id} href={tab.href} className={cls}>
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
