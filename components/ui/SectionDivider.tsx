import type { ReactNode } from "react";

export function SectionDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="bg-line h-px flex-1" />
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
        {children}
      </span>
      <span className="bg-line h-px flex-1" />
    </div>
  );
}
