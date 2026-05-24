import type { PortfolioStats } from "@/lib/types";

export function StatsStrip({ stats }: { stats: PortfolioStats[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border-line bg-paper border-[1.5px] p-2.5 text-center"
        >
          <div className="font-display text-blue-deep text-[24px] leading-none italic">
            {s.num}
          </div>
          <div className="text-mute-500 mt-1 font-mono text-[9px] tracking-[0.14em] uppercase">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
