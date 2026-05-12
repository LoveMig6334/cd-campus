"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
};

const TABS: Tab[] = [
  {
    href: "/student",
    label: "Home",
    icon: (
      <path d="M3 12 L12 4 L21 12 L21 20 L14 20 L14 14 L10 14 L10 20 L3 20 Z" />
    ),
  },
  {
    href: "/student/calendar",
    label: "Calendar",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/student/booking",
    label: "Booking",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <path d="M9 8v8M15 8v8M3 12h18" />
      </>
    ),
  },
  {
    href: "/student/pshare",
    label: "P'share",
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
  },
  {
    href: "/student/carelin",
    label: "Carelin",
    icon: <path d="M4 5h16v11h-7l-4 3v-3H4z" />,
  },
];

export function StudentBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="border-line bg-cream grid shrink-0 grid-cols-5 border-t-[1.5px] pt-2 pb-3.5">
      {TABS.map((tab) => {
        const active =
          tab.href === "/student"
            ? pathname === "/student"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center gap-[3px] py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase transition-colors",
              active ? "text-blue font-semibold" : "text-mute-500",
            )}
          >
            {active && (
              <span
                aria-hidden
                className="bg-blue absolute -top-2 left-1/2 h-[3px] w-6 -translate-x-1/2"
              />
            )}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {tab.icon}
            </svg>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
