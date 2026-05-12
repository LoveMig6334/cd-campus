import type { PortfolioStats } from "@/data/types";

export function StatsStrip({ stats }: { stats: PortfolioStats[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border-[1.5px] border-line bg-paper p-2.5 text-center"
        >
          <div className="font-display italic text-[24px] leading-none text-blue">
            {s.num}
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-mute-500">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
