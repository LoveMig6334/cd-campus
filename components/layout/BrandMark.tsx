import Image from "next/image";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 44, className }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "bg-paper border-line inline-block border-[1.5px]",
        "shadow-[2px_2px_0_var(--color-yellow)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/profile.png"
        alt="Chitralada 2026"
        width={size}
        height={size}
        priority
        className="block h-full w-full object-contain"
      />
    </span>
  );
}
