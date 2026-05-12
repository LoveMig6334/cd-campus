import type { ReactNode } from "react";

export function SectionDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
        {children}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
