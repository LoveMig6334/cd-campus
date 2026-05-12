import { CATEGORY_COLOR } from "@/supabase/seed/data/types";
import { Pill } from "./Pill";

const ITEMS = [
  { label: "Sport", color: CATEGORY_COLOR.sport },
  { label: "Tradition", color: CATEGORY_COLOR.tradition },
  { label: "Music", color: CATEGORY_COLOR.music },
  { label: "Admin", color: CATEGORY_COLOR.admin },
  { label: "Academic", color: CATEGORY_COLOR.academic },
];

export function CalendarLegend() {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2">
      <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mute-500">
        Legend
      </span>
      {ITEMS.map((item) => (
        <Pill key={item.label} background={item.color} textColor="white">
          {item.label}
        </Pill>
      ))}
    </div>
  );
}
