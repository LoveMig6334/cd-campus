import Link from "next/link";
import type { House, ScoreboardEntry } from "@/lib/types";

const HOUSE_COLOR: Record<House, string> = {
  green: "var(--color-house-green)",
  purple: "var(--color-house-purple)",
  orange: "var(--color-house-orange)",
  pink: "var(--color-house-pink)",
};

export function ScoreboardCard({ entry }: { entry: ScoreboardEntry }) {
  return (
    <div className="border-line bg-paper relative overflow-hidden border-[1.5px] p-[18px]">
      <div
        aria-hidden
        className="mb-3 h-2 w-full"
        style={{ background: HOUSE_COLOR[entry.house] }}
      />
      <div className="font-display text-[26px] leading-none italic">
        {entry.nameEn}
      </div>
      <div className="text-mute-500 mt-1 font-mono text-[10px] tracking-[0.16em] uppercase">
        {entry.nameTh} · {entry.rankSubtitle}
      </div>
      <div className="font-display my-4 text-[56px] leading-none italic">
        {entry.score}
      </div>
      <div className="text-mute-500 font-mono text-[10px]">{entry.stat}</div>
      <Link
        href="/admin/sport/edit"
        className="border-blue text-blue-deep mt-2.5 inline-block border px-2 py-1 font-mono text-[10px] tracking-[0.12em] uppercase"
      >
        ✎ edit score
      </Link>
    </div>
  );
}
