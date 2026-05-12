import { formatBilingualDate } from "@/lib/date";

export function StudentHeader({ date = new Date() }: { date?: Date }) {
  const d = formatBilingualDate(date);
  return (
    <header className="bg-cream sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.06] px-5 pt-[14px] pb-[10px]">
      <div>
        <div className="text-mute-500 font-mono text-[10px] tracking-[0.14em] uppercase">
          {d.en}
        </div>
        <div className="font-display text-[19px] leading-[1.1] italic">
          {d.thWeekday} <span className="text-blue">{d.thDay}</span> {d.thMonth}
        </div>
      </div>
      <button
        type="button"
        aria-label="Notifications · การแจ้งเตือน"
        className="border-line bg-paper hover:bg-yellow relative grid h-9 w-9 place-items-center rounded-full border-[1.5px] transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        <span className="border-cream bg-blue absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-[1.5px] font-mono text-[9px] text-white">
          3
        </span>
      </button>
    </header>
  );
}
