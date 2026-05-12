import type { House, LiveResult } from "@/lib/types";

const HOUSE_COLOR: Record<House, string> = {
  green: "var(--color-house-green)",
  purple: "var(--color-house-purple)",
  orange: "var(--color-house-orange)",
  pink: "var(--color-house-pink)",
};

export function SportFeedCard({ result }: { result: LiveResult }) {
  return (
    <article className="border-line bg-paper flex gap-3 rounded-[10px] border-[1.5px] p-3.5">
      <div className="bg-yellow text-ink grid h-10 w-10 shrink-0 place-items-center rounded-md">
        {result.icon === "running" ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="8" />
            <path d="M8 12h8" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="8" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[17px] leading-[1.15] italic">
          {result.titleTh}
        </div>
        <div className="text-mute-500 font-mono text-[10px]">
          {result.metaEn}
        </div>
        <div className="mt-1.5 flex gap-1">
          {result.placements.map((house, i) => (
            <span
              key={i}
              className="border-ink grid h-[18px] w-[18px] place-items-center rounded-full border-[1.5px] font-mono text-[9px] font-semibold text-white"
              style={{ background: HOUSE_COLOR[house] }}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
