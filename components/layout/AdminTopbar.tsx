import type { ReactNode } from "react";

type AdminTopbarProps = {
  titleTh: string;
  eyebrow: string;
  actions?: ReactNode;
};

export function AdminTopbar({ titleTh, eyebrow, actions }: AdminTopbarProps) {
  return (
    <div className="mb-[22px] flex flex-wrap items-end justify-between gap-[18px]">
      <div>
        <div className="font-display text-[44px] leading-none italic">
          {titleTh}
          <span className="text-blue text-[32px]">.</span>
        </div>
        <div className="text-mute-500 mt-1.5 font-mono text-[11px] tracking-[0.22em] uppercase">
          ★ {eyebrow} ★
        </div>
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
