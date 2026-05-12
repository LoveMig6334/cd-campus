import type { ReactNode } from "react";

type Props = {
  /** Offset shadow color */
  accent?: "yellow" | "pink";
  children: ReactNode;
};

export function Blurb({ accent = "yellow", children }: Props) {
  return (
    <div
      className="border-[1.5px] border-line bg-paper px-3.5 py-3 text-[12.5px] leading-[1.45] text-mute-700"
      style={{
        boxShadow:
          accent === "pink"
            ? "3px 3px 0 var(--color-house-pink)"
            : "3px 3px 0 var(--color-yellow)",
      }}
    >
      {children}
    </div>
  );
}
