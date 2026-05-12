import type { ReactNode } from "react";

type PhoneShellProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function PhoneShell({ header, footer, children }: PhoneShellProps) {
  return (
    <div className="flex justify-center px-4 py-10 sm:py-16">
      <div
        className="relative flex flex-col w-[390px] h-[800px] overflow-hidden rounded-[44px] bg-cream border-2 border-line"
        style={{
          boxShadow:
            "0 0 0 6px var(--color-ink), 14px 14px 0 var(--color-blue), 14px 14px 0 8px var(--color-ink)",
        }}
      >
        <div className="flex h-[30px] shrink-0 items-center justify-between bg-ink px-7 font-mono text-[11px] text-cream">
          <span className="font-semibold">8:42</span>
          <div className="flex items-center gap-1">
            <span className="inline-block h-1 w-1 rounded-full bg-cream" />
            <span className="inline-block h-1 w-1 rounded-full bg-cream" />
            <span className="inline-block h-1 w-1 rounded-full bg-cream" />
            <span className="ml-1.5">5G</span>
            <span className="relative ml-1.5 inline-block h-[9px] w-[22px] rounded-[2px] border border-cream">
              <span className="absolute inset-[1px] w-[14px] bg-cream" />
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          {header}
          <div className="flex-1">{children}</div>
        </div>
        {footer}
      </div>
    </div>
  );
}
