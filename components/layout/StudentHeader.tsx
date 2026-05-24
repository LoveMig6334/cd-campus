import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { formatBilingualDate } from "@/lib/date";

export function StudentHeader({ date = new Date() }: { date?: Date }) {
  const d = formatBilingualDate(date);
  return (
    <header className="bg-cream sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.06] px-5 pt-[14px] pb-[10px] dark:border-white/10">
      <div className="flex items-center gap-2.5">
        <BrandMark size={36} />
        <div>
          <div className="text-mute-500 font-mono text-[10px] tracking-[0.14em] uppercase">
            {d.en}
          </div>
          <div className="font-display text-[19px] leading-[1.1] italic">
            CD Smart <span className="text-blue-deep">Campus</span>
          </div>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
