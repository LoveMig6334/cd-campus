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
        className="bg-cream border-line relative flex h-[800px] w-[390px] flex-col overflow-hidden rounded-[44px] border-2"
        style={{
          boxShadow:
            "0 0 0 6px var(--color-ink), 14px 14px 0 var(--color-blue), 14px 14px 0 8px var(--color-ink)",
        }}
      >
        <div className="bg-ink text-cream flex h-[30px] shrink-0 items-center justify-between px-7 font-mono text-[11px]">
          <span className="font-semibold">8:42</span>
          <div className="flex items-center gap-1">
            <span className="bg-cream inline-block h-1 w-1 rounded-full" />
            <span className="bg-cream inline-block h-1 w-1 rounded-full" />
            <span className="bg-cream inline-block h-1 w-1 rounded-full" />
            <span className="ml-1.5">5G</span>
            <span className="border-cream relative ml-1.5 inline-block h-[9px] w-[22px] rounded-[2px] border">
              <span className="bg-cream absolute inset-[1px] w-[14px]" />
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
