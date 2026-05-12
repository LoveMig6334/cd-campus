import { CATEGORY_COLOR, type CalendarChip } from "@/supabase/seed/data/types";
import { cn } from "@/lib/cn";

export function CalendarChipRow({
  chips,
  activeId,
}: {
  chips: CalendarChip[];
  activeId: CalendarChip["id"];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const active = chip.id === activeId;
        const dotColor =
          chip.id === "all" ? null : CATEGORY_COLOR[chip.id];
        return (
          <button
            key={chip.id}
            type="button"
            className={cn(
              "rounded-full border-[1.2px] border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
              active ? "bg-ink text-yellow" : "bg-paper text-ink",
            )}
          >
            {dotColor && (
              <span
                aria-hidden
                className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full align-middle"
                style={{ background: dotColor }}
              />
            )}
            {chip.labelEn}
          </button>
        );
      })}
    </div>
  );
}
