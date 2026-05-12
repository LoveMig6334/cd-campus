import type { House, LeaderRow } from "@/lib/types";
import { cn } from "@/lib/cn";

const HOUSE_COLOR: Record<House, string> = {
  green: "var(--color-house-green)",
  purple: "var(--color-house-purple)",
  orange: "var(--color-house-orange)",
  pink: "var(--color-house-pink)",
};

export function Leaderboard({ rows }: { rows: LeaderRow[] }) {
  return (
    <section className="rounded-2xl border-[1.5px] border-line bg-paper p-3.5">
      <h2 className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em]">
        ★ Leaderboard · ตารางคะแนน
      </h2>
      <div>
        {rows.map((row, i) => (
          <div
            key={row.house}
            className={cn(
              "grid grid-cols-[24px_1fr_auto] items-center gap-2.5 py-2",
              i < rows.length - 1 && "border-b border-dashed border-mute-200",
            )}
          >
            <div
              className={cn(
                "text-center font-display italic text-[18px]",
                row.rank === 1 ? "text-blue" : "text-mute-500",
              )}
            >
              {row.rank}
            </div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 rounded-full border-[1.5px] border-ink"
                style={{ background: HOUSE_COLOR[row.house] }}
              />
              <span className="font-display italic text-[16px]">
                {row.nameEn} · {row.nameTh}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="min-w-[40px] text-right font-mono text-[13px] font-semibold">
                {row.score}
              </div>
              <div className="h-1.5 w-[60px] overflow-hidden border border-ink bg-mute-100">
                <span
                  className="block h-full"
                  style={{
                    width: `${row.barPct}%`,
                    background: HOUSE_COLOR[row.house],
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
