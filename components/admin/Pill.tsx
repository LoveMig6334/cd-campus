import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "ok" | "pend" | "rev" | "draft";

type Props = {
  children: ReactNode;
  variant?: Variant;
  /** Optional inline color overrides (e.g. for the calendar legend pills) */
  background?: string;
  textColor?: string;
};

const VARIANT_CLASS: Record<Variant, string> = {
  ok: "bg-house-green text-white border-house-green",
  pend: "bg-yellow text-ink border-ink",
  rev: "bg-house-purple text-white border-house-purple",
  draft: "bg-mute-200 text-ink border-ink",
};

export function Pill({ children, variant, background, textColor }: Props) {
  const variantClass = variant
    ? VARIANT_CLASS[variant]
    : "bg-paper text-ink border-ink";

  const inlineStyle =
    background || textColor
      ? { background, color: textColor, borderColor: background }
      : undefined;

  return (
    <span
      className={cn(
        "inline-block border px-2 py-0.5 font-mono text-[10px] tracking-[0.06em]",
        variantClass,
      )}
      style={inlineStyle}
    >
      {children}
    </span>
  );
}
