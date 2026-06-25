import Link from "next/link";
import { IconButton } from "@/components/ui/IconButton";

type Props = {
  titleTh: string;
  subEn: string;
  /** Set true to render month-name in 20px instead of 26px (used by booking) */
  compact?: boolean;
  /** When set, the previous-month button becomes a Link to this href. */
  prevHref?: string;
  /** When set, the next-month button becomes a Link to this href. */
  nextHref?: string;
  /** When true (and no href), render a greyed-out button (boundary state). */
  prevDisabled?: boolean;
  nextDisabled?: boolean;
};

const ICON_BTN_BASE =
  "border-line bg-paper grid h-9 w-9 place-items-center rounded-full border-[1.5px]";

export function CalendarMonthRow({
  titleTh,
  subEn,
  compact,
  prevHref,
  nextHref,
  prevDisabled,
  nextDisabled,
}: Props) {
  return (
    <div className="flex items-center justify-between">
      <div
        className={
          compact
            ? "font-display text-[20px] leading-none italic"
            : "font-display text-[26px] leading-none italic"
        }
      >
        {titleTh}
        <small className="text-mute-500 mt-0.5 block font-mono text-[10px] tracking-[0.16em] uppercase not-italic">
          {subEn}
        </small>
      </div>
      <div className="flex gap-1.5">
        <NavButton
          dir="left"
          href={prevHref}
          disabled={prevDisabled}
          label="Previous month · เดือนก่อนหน้า"
        />
        <NavButton
          dir="right"
          href={nextHref}
          disabled={nextDisabled}
          label="Next month · เดือนถัดไป"
        />
      </div>
    </div>
  );
}

function NavButton({
  dir,
  href,
  disabled,
  label,
}: {
  dir: "left" | "right";
  href?: string;
  disabled?: boolean;
  label: string;
}) {
  if (href) {
    // No prefetch — month nav targets the dynamic booking route.
    return (
      <Link
        href={href}
        prefetch={false}
        aria-label={label}
        className={`${ICON_BTN_BASE} hover:bg-yellow transition-colors`}
      >
        <Chevron dir={dir} />
      </Link>
    );
  }
  if (disabled) {
    return (
      <span
        aria-label={label}
        aria-disabled="true"
        className={`${ICON_BTN_BASE} pointer-events-none opacity-40`}
      >
        <Chevron dir={dir} />
      </span>
    );
  }
  return (
    <IconButton label={label}>
      <Chevron dir={dir} />
    </IconButton>
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
