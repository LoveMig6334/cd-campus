type Color = "ink" | "yellow" | "blue" | "pink";
type Position = "tl" | "tr";

const FILLS: Record<Color, string> = {
  ink: "#0A0A0A",
  yellow: "#F7E33A",
  blue: "#1E2EE4",
  pink: "#E94D8F",
};

const POSITION_CLASS: Record<Position, string> = {
  tl: "-top-[7px] -left-[7px]",
  tr: "-top-[7px] -right-[7px]",
};

export function MenuStar({
  color,
  position,
}: {
  color: Color;
  position: Position;
}) {
  const stroke = color === "ink" ? "none" : "#0A0A0A";
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-[3] ${POSITION_CLASS[position]}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={FILLS[color]}
        stroke={stroke}
        strokeWidth={color === "ink" ? 0 : 1}
      >
        <path d="M12 0 L13.5 9 L24 12 L13.5 15 L12 24 L10.5 15 L0 12 L10.5 9 Z" />
      </svg>
    </span>
  );
}
