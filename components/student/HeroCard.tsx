import type { HomeHero } from "@/lib/types";

export function HeroCard({ hero }: { hero: HomeHero }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border-[1.5px] border-line bg-paper p-4">
      <span
        aria-hidden
        className="halftone-bl pointer-events-none absolute -top-[30px] -right-[30px] h-[120px] w-[120px] opacity-50"
      />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute-500">
        {hero.eyebrow}
      </p>
      <h2 className="relative z-[1] mt-1 mb-[14px] font-display italic text-[26px] leading-[1.05]">
        {hero.titleLines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </h2>
      <div className="relative z-[1] flex gap-2">
        <HeroPill
          label="Leading"
          value={
            <>
              {hero.leading.label}{" "}
              <small className="text-[11px] text-yellow/80">
                {hero.leading.points} pts
              </small>
            </>
          }
          variant="blue"
        />
        <HeroPill label="Where" value={hero.whereTh} />
        <HeroPill
          label="Weather"
          value={
            <>
              {hero.weather.degrees}°{" "}
              <small className="text-[11px]">{hero.weather.glyph}</small>
            </>
          }
        />
      </div>
    </section>
  );
}

function HeroPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: React.ReactNode;
  variant?: "blue";
}) {
  const blue = variant === "blue";
  return (
    <div
      className={
        blue
          ? "flex-1 rounded-md border border-blue bg-blue px-2.5 py-2 text-white"
          : "flex-1 rounded-md border border-line bg-cream px-2.5 py-2"
      }
    >
      <div
        className={
          blue
            ? "font-mono text-[9px] uppercase tracking-[0.12em] text-yellow"
            : "font-mono text-[9px] uppercase tracking-[0.12em] text-mute-500"
        }
      >
        {label}
      </div>
      <div className="mt-0.5 font-display italic text-[17px] leading-[1.1]">
        {value}
      </div>
    </div>
  );
}
