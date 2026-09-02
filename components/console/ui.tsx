import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Console design primitives — white/gray ground, marine + sky structure,
   gold reserved for the single "live" accent on each screen. */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-marine text-[26px] leading-tight font-semibold">
          {title}
        </h1>
        <p className="mt-1 text-[13px] text-gray-500">{subtitle}</p>
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function Panel({
  children,
  className,
  title,
  aside,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  aside?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,42,76,0.06)]",
        className,
      )}
    >
      {(title || aside) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-marine text-[15px] font-semibold">{title}</h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

type Variant = "primary" | "sky" | "gold" | "ghost" | "danger";

const BTN: Record<Variant, string> = {
  primary: "bg-marine text-white hover:bg-[#0b4aa0] shadow-sm",
  sky: "bg-sky text-white hover:bg-[#1f7fd0] shadow-sm",
  gold: "bg-gold text-marine hover:bg-[#d9c61c] shadow-sm",
  ghost:
    "bg-white text-marine border border-gray-200 hover:border-sky hover:bg-sky-soft",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        BTN[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export const FIELD =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition-colors focus:border-sky focus:ring-2 focus:ring-sky/20";
export const LABEL = "block text-[13px] font-medium text-gray-700";

export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: "gray" | "sky" | "gold" | "green" | "marine";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    gray: "bg-gray-100 text-gray-600",
    sky: "bg-sky-soft text-sky",
    gold: "bg-gold text-marine",
    green: "bg-emerald-50 text-emerald-700",
    marine: "bg-marine text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function HouseDot({
  hex,
  className,
}: {
  hex: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full", className)}
      style={{ background: hex }}
    />
  );
}
