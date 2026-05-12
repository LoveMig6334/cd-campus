import type { PortfolioThumbIcon } from "@/data/types";

const SVG_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
};

function Trend() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M3 17 L9 11 L13 15 L21 7" />
    </svg>
  );
}

function Sun() {
  return (
    <svg {...SVG_PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1l2.1-2.1M17 7l2.1-2.1" />
    </svg>
  );
}

function Wave() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M2 12 Q8 4 12 12 T22 12" />
    </svg>
  );
}

function Cube() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M4 17V7l8-4 8 4v10M4 17l8 4 8-4M12 12l8-4M12 12l-8-4M12 12v9" />
    </svg>
  );
}

function CalendarSm() {
  return (
    <svg {...SVG_PROPS}>
      <rect x="3" y="6" width="18" height="14" rx="1" />
      <path d="M8 6V3M16 6V3M3 11h18" />
    </svg>
  );
}

function Beakers() {
  return (
    <svg {...SVG_PROPS}>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 9h18" />
      <circle cx="8" cy="14" r="1.5" />
      <circle cx="14" cy="14" r="1.5" />
    </svg>
  );
}

const REGISTRY: Record<PortfolioThumbIcon, () => React.ReactElement> = {
  trend: Trend,
  sun: Sun,
  wave: Wave,
  cube: Cube,
  calendar: CalendarSm,
  beakers: Beakers,
};

export function PortfolioThumbIconRender({
  icon,
}: {
  icon: PortfolioThumbIcon;
}) {
  const Cmp = REGISTRY[icon];
  return <Cmp />;
}
