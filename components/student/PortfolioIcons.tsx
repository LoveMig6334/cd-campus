import type { PortfolioIconKey } from "@/lib/types";

const SVG_PROPS = {
  viewBox: "0 0 64 64",
  fill: "none" as const,
  stroke: "#0A0A0A",
  strokeWidth: 2.5,
  width: "100%",
  height: "100%",
};

function CropIcon() {
  return (
    <svg {...SVG_PROPS}>
      <rect x="8" y="14" width="48" height="36" fill="#FFF" />
      <path d="M8 38 L24 26 L36 36 L56 18 L56 50 L8 50 Z" fill="#1E2EE4" />
      <circle cx="46" cy="22" r="4" fill="#F7E33A" stroke="#0A0A0A" />
    </svg>
  );
}

function SolarIcon() {
  return (
    <svg {...SVG_PROPS}>
      <circle cx="32" cy="28" r="14" fill="#FFF" />
      <circle cx="32" cy="28" r="6" fill="#1E2EE4" />
      <path d="M14 56 L20 38 L44 38 L50 56 Z" fill="#F7E33A" />
    </svg>
  );
}

function ShmIcon() {
  return (
    <svg {...SVG_PROPS}>
      <rect x="10" y="10" width="44" height="44" fill="#FFF" />
      <path
        d="M10 32 Q22 14 32 32 T54 32"
        stroke="#1E2EE4"
        strokeWidth={3}
        fill="none"
      />
      <circle cx="32" cy="32" r="3" fill="#F7E33A" stroke="#0A0A0A" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg {...SVG_PROPS}>
      <rect x="10" y="10" width="44" height="44" fill="#FFF" />
      <circle cx="32" cy="26" r="8" fill="#1E2EE4" stroke="#0A0A0A" />
      <path d="M16 52 Q22 38 32 38 T48 52 Z" fill="#F7E33A" stroke="#0A0A0A" />
    </svg>
  );
}

const REGISTRY: Record<PortfolioIconKey, () => React.ReactElement> = {
  crop: CropIcon,
  solar: SolarIcon,
  shm: ShmIcon,
  profile: ProfileIcon,
};

export function PortfolioIcon({ icon }: { icon: PortfolioIconKey }) {
  const Cmp = REGISTRY[icon];
  return <Cmp />;
}
