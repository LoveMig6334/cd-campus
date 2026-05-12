const SVG_PROPS = {
  viewBox: "0 0 64 64",
  fill: "none" as const,
  stroke: "#0A0A0A",
  strokeWidth: 2.5,
  width: "100%",
  height: "100%",
};

export function CalendarIcon() {
  return (
    <svg {...SVG_PROPS}>
      <rect x="6" y="12" width="52" height="46" rx="2" fill="#FFF" />
      <line x1="6" y1="22" x2="58" y2="22" />
      <line x1="18" y1="6" x2="18" y2="16" />
      <line x1="46" y1="6" x2="46" y2="16" />
      <circle cx="20" cy="34" r="2" fill="#1E2EE4" />
      <circle cx="32" cy="34" r="2" fill="#1E2EE4" />
      <circle cx="44" cy="34" r="2" fill="#1E2EE4" />
      <circle cx="20" cy="46" r="2" fill="#1E2EE4" />
      <circle cx="32" cy="46" r="2" fill="#F7E33A" />
      <circle cx="44" cy="46" r="2" fill="#1E2EE4" />
    </svg>
  );
}

export function BookingIcon() {
  return (
    <svg {...SVG_PROPS}>
      <rect x="14" y="12" width="36" height="46" rx="2" fill="#FFF" />
      <path d="M14 22 L50 22" />
      <path d="M22 32 q10 -8 20 0" fill="none" />
      <circle cx="22" cy="44" r="3" fill="#1E2EE4" />
      <circle cx="42" cy="44" r="3" fill="#1E2EE4" />
      <path d="M22 44 L22 36 M42 44 L42 36" />
    </svg>
  );
}

export function SportIcon() {
  return (
    <svg {...SVG_PROPS}>
      <circle cx="32" cy="32" r="20" fill="#FFF" />
      <path
        d="M32 12 L36 28 L52 28 L40 38 L44 54 L32 44 L20 54 L24 38 L12 28 L28 28 Z"
        fill="#F7E33A"
      />
    </svg>
  );
}

export function PortfolioIcon() {
  return (
    <svg {...SVG_PROPS}>
      <rect x="8" y="14" width="36" height="44" fill="#FFF" />
      <rect x="14" y="8" width="36" height="44" fill="#1E2EE4" />
      <line x1="20" y1="20" x2="42" y2="20" stroke="#F7E33A" />
      <line x1="20" y1="28" x2="42" y2="28" stroke="#F7E33A" />
      <line x1="20" y1="36" x2="36" y2="36" stroke="#F7E33A" />
    </svg>
  );
}

export function PshareIcon() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M8 16 L32 12 L32 54 L8 50 Z" fill="#FFF" />
      <path d="M56 16 L32 12 L32 54 L56 50 Z" fill="#F7E33A" />
      <line x1="32" y1="12" x2="32" y2="54" />
      <circle cx="50" cy="22" r="3.5" fill="#1E2EE4" />
      <path
        d="M50 22 L46 16 M50 22 L56 18"
        stroke="#1E2EE4"
        strokeWidth={2.5}
      />
    </svg>
  );
}

export function CarelinIcon() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M8 14 L56 14 L56 44 L36 44 L26 54 L26 44 L8 44 Z" fill="#FFF" />
      <path
        d="M32 22 c-4 -4 -12 -2 -12 5 c0 7 12 13 12 13 s12 -6 12 -13 c0 -7 -8 -9 -12 -5 Z"
        fill="#E94D8F"
      />
    </svg>
  );
}
