import type { House, ScoreboardEntry } from "@/supabase/seed/data/types";

const HOUSE_COLOR: Record<House, string> = {
  green: "var(--color-house-green)",
  purple: "var(--color-house-purple)",
  orange: "var(--color-house-orange)",
  pink: "var(--color-house-pink)",
};

export function ScoreboardCard({ entry }: { entry: ScoreboardEntry }) {
  return (
    <div className="relative overflow-hidden border-[1.5px] border-line bg-paper p-[18px]">
      <div
        aria-hidden
        className="mb-3 h-2 w-full"
        style={{ background: HOUSE_COLOR[entry.house] }}
      />
      <div className="font-display italic text-[26px] leading-none">
        {entry.nameEn}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mute-500">
        {entry.nameTh} · {entry.rankSubtitle}
      </div>
      <div className="my-4 font-display italic text-[56px] leading-none">
        {entry.score}
      </div>
      <div className="font-mono text-[10px] text-mute-500">{entry.stat}</div>
      <span className="mt-2.5 inline-block border border-blue px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-blue">
        ✎ edit score
      </span>
    </div>
  );
}
