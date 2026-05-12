import type { ReactNode } from "react";

export function CtaButton({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <button
      type="button"
      className="w-full border-[1.5px] border-line bg-blue px-3 py-3.5 text-white transition-transform [box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:[box-shadow:6px_6px_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:[box-shadow:0_0_0_var(--color-ink)]"
    >
      <div className="font-display italic text-[19px]">{children}</div>
      {eyebrow && (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-yellow">
          {eyebrow}
        </div>
      )}
    </button>
  );
}
