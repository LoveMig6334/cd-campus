import type { HomeHero } from "@/lib/types";

export function HeroCard({ hero }: { hero: HomeHero }) {
  return (
    <section className="border-line bg-paper relative overflow-hidden rounded-2xl border-[1.5px] p-4">
      <span
        aria-hidden
        className="halftone-bl pointer-events-none absolute -top-[30px] -right-[30px] h-[120px] w-[120px] opacity-50"
      />
      <p className="text-mute-500 font-mono text-[10px] tracking-[0.16em] uppercase">
        {hero.eyebrow}
      </p>
      <h2 className="font-display relative z-[1] mt-1 mb-[14px] text-[26px] leading-[1.05] italic">
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
              <small className="text-yellow/80 text-[11px]">
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
          ? "border-blue bg-blue flex-1 rounded-md border px-2.5 py-2 text-white"
          : "border-line bg-cream flex-1 rounded-md border px-2.5 py-2"
      }
    >
      <div
        className={
          blue
            ? "text-yellow font-mono text-[9px] tracking-[0.12em] uppercase"
            : "text-mute-500 font-mono text-[9px] tracking-[0.12em] uppercase"
        }
      >
        {label}
      </div>
      <div className="font-display mt-0.5 text-[17px] leading-[1.1] italic">
        {value}
      </div>
    </div>
  );
}
