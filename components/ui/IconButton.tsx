import type { ReactNode } from "react";

export function IconButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-line bg-paper transition-colors hover:bg-yellow"
    >
      {children}
    </button>
  );
}
