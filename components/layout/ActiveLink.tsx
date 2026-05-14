"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  href: string;
  exact?: boolean;
  activeClass: string;
  inactiveClass: string;
  children: ReactNode;
};

export function ActiveLink({
  href,
  exact = false,
  activeClass,
  inactiveClass,
  children,
}: Props) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : undefined}
      className={cn(active ? activeClass : inactiveClass)}
    >
      {children}
    </Link>
  );
}
