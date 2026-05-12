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
      className="border-line bg-paper hover:bg-yellow grid h-9 w-9 place-items-center rounded-full border-[1.5px] transition-colors"
    >
      {children}
    </button>
  );
}
