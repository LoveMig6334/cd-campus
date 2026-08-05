import type { MatchView } from "@/lib/types";
import { setsWon, SPORTS } from "@/lib/sport/rules";
import { HOUSE_HEX } from "@/lib/sport/colors";

function HouseDot({ hex }: { hex: string }) {
  return (
    <span
      className="border-ink inline-block h-3 w-3 shrink-0 rounded-full border-[1.5px]"
      style={{ background: hex }}
    />
  );
}

export function MatchResultCard({ match }: { match: MatchView }) {
  const config = SPORTS[match.sport];
  const won = setsWon(
    { sets: match.sets, currentSet: match.currentSet, serving: match.serving },
    true, // finished match — the last set counts
  );
  const winner = match.winner === "a" ? match.houseA : match.houseB;

  return (
    <article className="border-line bg-paper rounded-[10px] border-[1.5px] p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-display text-[17px] leading-[1.15] italic">
          {config.labelTh}
          {match.roundLabel ? ` · ${match.roundLabel}` : ""}
        </div>
        <div className="text-mute-500 font-mono text-[10px] whitespace-nowrap">
          {config.labelEn}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[13px]">
        <HouseDot hex={HOUSE_HEX[match.houseA.key]} />
        <span className="min-w-0 truncate">
          {match.houseA.nameEn} · {match.houseA.nameTh}
        </span>
        <span className="font-mono text-[13px] font-semibold tabular-nums">
          {won.a}
        </span>
        <span className="text-mute-500">–</span>
        <span className="font-mono text-[13px] font-semibold tabular-nums">
          {won.b}
        </span>
        <span className="min-w-0 truncate text-right">
          {match.houseB.nameEn} · {match.houseB.nameTh}
        </span>
        <HouseDot hex={HOUSE_HEX[match.houseB.key]} />
      </div>

      <div className="text-mute-500 mt-1.5 flex flex-wrap items-center gap-x-2 font-mono text-[10px]">
        <span className="tabular-nums">
          {match.sets.map((s) => `${s.a}–${s.b}`).join(", ")}
        </span>
        {match.winner && (
          <span className="text-ink">
            · ชนะ: {winner.nameTh} ({winner.nameEn})
          </span>
        )}
        {match.endedAt && (
          <span>
            ·{" "}
            {new Date(match.endedAt).toLocaleString("en-GB", {
              timeZone: "Asia/Bangkok",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </article>
  );
}
