import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ThemeShell } from "./ThemeShell";

type PhoneShellProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export async function PhoneShell({
  header,
  footer,
  children,
}: PhoneShellProps) {
  const theme =
    (await cookies()).get("student-theme")?.value === "dark" ? "dark" : "light";

  return (
    <div className="flex sm:justify-center sm:px-4 sm:py-10 md:py-16">
      <ThemeShell
        initialTheme={theme}
        className="bg-cream text-ink sm:border-line relative flex h-dvh w-full flex-col overflow-hidden sm:h-[800px] sm:w-[390px] sm:rounded-[44px] sm:border-2 sm:shadow-[0_0_0_6px_var(--color-ink),14px_14px_0_var(--color-blue),14px_14px_0_8px_var(--color-ink)]"
      >
        <div className="bg-ink text-cream dark:bg-cream-2 dark:text-ink hidden h-[30px] shrink-0 items-center justify-between px-7 font-mono text-[11px] sm:flex">
          <span className="font-semibold">8:42</span>
          <div className="flex items-center gap-1">
            <span className="bg-cream dark:bg-ink inline-block h-1 w-1 rounded-full" />
            <span className="bg-cream dark:bg-ink inline-block h-1 w-1 rounded-full" />
            <span className="bg-cream dark:bg-ink inline-block h-1 w-1 rounded-full" />
            <span className="ml-1.5">5G</span>
            <span className="border-cream dark:border-ink relative ml-1.5 inline-block h-[9px] w-[22px] rounded-[2px] border">
              <span className="bg-cream dark:bg-ink absolute inset-[1px] w-[14px]" />
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          {header}
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
        {footer}
      </ThemeShell>
    </div>
  );
}
