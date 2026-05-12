import type { AdminKpi } from "@/data/types";
import { cn } from "@/lib/cn";

const DELTA_CLASS: Record<AdminKpi["delta"]["kind"], string> = {
  up: "bg-house-green text-white border-house-green",
  down: "bg-house-pink text-white border-house-pink",
  flat: "bg-cream text-ink border-ink",
};

export function KpiCard({ kpi }: { kpi: AdminKpi }) {
  return (
    <div className="relative overflow-hidden border-[1.5px] border-line bg-paper p-4">
      <span
        aria-hidden
        className="halftone-bl pointer-events-none absolute -top-5 -right-5 h-20 w-20 opacity-40"
      />
      <div className="relative font-mono text-[10px] uppercase tracking-[0.16em] text-mute-500">
        {kpi.label}
      </div>
      <div className="relative mt-0.5 font-display italic text-[12px] text-mute-500">
        {kpi.th}
      </div>
      <div className="relative my-2.5 font-display italic text-[44px] leading-none">
        {kpi.num}
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px]",
          DELTA_CLASS[kpi.delta.kind],
        )}
      >
        {kpi.delta.text}
      </span>
    </div>
  );
}
