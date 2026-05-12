import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "primary" | "ink";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const VARIANT: Record<Variant, string> = {
  default: "bg-paper text-ink hover:bg-cream-2",
  primary:
    "bg-blue text-white [box-shadow:3px_3px_0_var(--color-ink)] hover:[box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:bg-blue-deep",
  ink: "bg-ink text-yellow",
};

export function Btn({
  variant = "default",
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={cn(
        "border-[1.5px] border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all",
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
