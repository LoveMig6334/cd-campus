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
        <div className="font-display italic text-[44px] leading-none">
          {titleTh}
          <span className="text-[32px] text-blue">.</span>
        </div>
        <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-mute-500">
          ★ {eyebrow} ★
        </div>
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
