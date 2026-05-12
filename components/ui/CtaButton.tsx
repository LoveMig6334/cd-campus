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
      className="border-line bg-blue w-full border-[1.5px] px-3 py-3.5 text-white [box-shadow:4px_4px_0_var(--color-ink)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:[box-shadow:6px_6px_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:[box-shadow:0_0_0_var(--color-ink)]"
    >
      <div className="font-display text-[19px] italic">{children}</div>
      {eyebrow && (
        <div className="text-yellow mt-1 font-mono text-[10px] tracking-[0.18em] uppercase">
          {eyebrow}
        </div>
      )}
    </button>
  );
}
