import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  /** Adds the 5px blue offset shadow for emphasis */
  accent?: boolean;
  className?: string;
};

export function Card({ children, accent, className }: Props) {
  return (
    <div
      className={cn(
        "border-line bg-paper relative overflow-hidden border-[1.5px] px-5 py-[18px]",
        accent && "[box-shadow:5px_5px_0_var(--color-blue)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  th,
  en,
  menu,
}: {
  th: string;
  en: string;
  menu?: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-baseline gap-2.5">
      <span className="font-display text-[24px] leading-none italic">{th}</span>
      <span className="text-mute-500 font-mono text-[10px] tracking-[0.18em] uppercase">
        {en}
      </span>
      {menu && (
        <span className="text-mute-500 ml-auto font-mono text-[11px]">
          {menu}
        </span>
      )}
    </div>
  );
}
