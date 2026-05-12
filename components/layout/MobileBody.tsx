import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function MobileBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-[18px] pt-[14px] pb-6", className)}>{children}</div>
  );
}
