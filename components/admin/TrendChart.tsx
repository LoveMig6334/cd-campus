import type { TrendChartData } from "@/lib/queries/siteConfig";

export function TrendChart({ data }: { data: TrendChartData }) {
  const { months, path, points } = data;
  const lastIndex = points.length - 1;
  return (
    <>
      <div className="-mx-1.5 mt-1 h-[120px]">
        <svg
          viewBox="0 0 600 120"
          preserveAspectRatio="none"
          className="block h-full w-full"
        >
          <defs>
            <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1E2EE4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1E2EE4" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="#DAD6C4" strokeDasharray="3,3" strokeWidth="1">
            <line x1="0" y1="30" x2="600" y2="30" />
            <line x1="0" y1="60" x2="600" y2="60" />
            <line x1="0" y1="90" x2="600" y2="90" />
          </g>
          <path d={`${path} L600,120 L0,120 Z`} fill="url(#trendGrad)" />
          <path d={path} stroke="#1E2EE4" strokeWidth="2.5" fill="none" />
          <g fill="#0A0A0A">
            {points.map((p, i) =>
              i === lastIndex ? (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill="#F7E33A"
                  stroke="#0A0A0A"
                  strokeWidth="1.5"
                />
              ) : (
                <circle key={i} cx={p.x} cy={p.y} r="3" />
              ),
            )}
          </g>
        </svg>
      </div>
      <div className="text-mute-500 mt-1.5 flex justify-between font-mono text-[9px]">
        {months.map((m, i) => (
          <span
            key={m}
            className={i === months.length - 1 ? "text-blue font-semibold" : ""}
          >
            {m}
          </span>
        ))}
      </div>
    </>
  );
}
