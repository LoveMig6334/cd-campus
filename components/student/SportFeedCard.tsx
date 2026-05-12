import type { House, LiveResult } from "@/lib/types";

const HOUSE_COLOR: Record<House, string> = {
  green: "var(--color-house-green)",
  purple: "var(--color-house-purple)",
  orange: "var(--color-house-orange)",
  pink: "var(--color-house-pink)",
};

export function SportFeedCard({ result }: { result: LiveResult }) {
  return (
    <article className="flex gap-3 rounded-[10px] border-[1.5px] border-line bg-paper p-3.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-yellow text-ink">
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
        <div className="font-display italic text-[17px] leading-[1.15]">
          {result.titleTh}
        </div>
        <div className="font-mono text-[10px] text-mute-500">
          {result.metaEn}
        </div>
        <div className="mt-1.5 flex gap-1">
          {result.placements.map((house, i) => (
            <span
              key={i}
              className="grid h-[18px] w-[18px] place-items-center rounded-full border-[1.5px] border-ink font-mono text-[9px] font-semibold text-white"
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
