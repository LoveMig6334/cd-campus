import type { AdminKpi } from "@/lib/types";
import { cn } from "@/lib/cn";

const DELTA_CLASS: Record<AdminKpi["delta"]["kind"], string> = {
  up: "bg-house-green text-white border-house-green",
  down: "bg-house-pink text-white border-house-pink",
  flat: "bg-cream text-ink border-ink",
};

export function KpiCard({ kpi }: { kpi: AdminKpi }) {
  return (
    <div className="border-line bg-paper relative overflow-hidden border-[1.5px] p-4">
      <span
        aria-hidden
        className="halftone-bl pointer-events-none absolute -top-5 -right-5 h-20 w-20 opacity-40"
      />
      <div className="text-mute-500 relative font-mono text-[10px] tracking-[0.16em] uppercase">
        {kpi.label}
      </div>
      <div className="font-display text-mute-500 relative mt-0.5 text-[12px] italic">
        {kpi.th}
      </div>
      <div className="font-display relative my-2.5 text-[44px] leading-none italic">
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
