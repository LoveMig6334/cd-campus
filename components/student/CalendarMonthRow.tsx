import { IconButton } from "@/components/ui/IconButton";

type Props = {
  titleTh: string;
  subEn: string;
  /** Set true to render month-name in 20px instead of 26px (used by booking) */
  compact?: boolean;
};

export function CalendarMonthRow({ titleTh, subEn, compact }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div
        className={
          compact
            ? "font-display italic text-[20px] leading-none"
            : "font-display italic text-[26px] leading-none"
        }
      >
        {titleTh}
        <small className="mt-0.5 block font-mono text-[10px] not-italic uppercase tracking-[0.16em] text-mute-500">
          {subEn}
        </small>
      </div>
      <div className="flex gap-1.5">
        <IconButton label="Previous month · เดือนก่อนหน้า">
          <Chevron dir="left" />
        </IconButton>
        <IconButton label="Next month · เดือนถัดไป">
          <Chevron dir="right" />
        </IconButton>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
