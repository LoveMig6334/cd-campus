"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  en: string;
  th: string;
  icon: ReactNode;
};

const NAV: NavItem[] = [
  {
    href: "/admin",
    en: "Overview",
    th: "ภาพรวม",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </>
    ),
  },
  {
    href: "/admin/calendar",
    en: "Calendar",
    th: "ปฏิทิน",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/admin/sport",
    en: "Sport Day",
    th: "กีฬาสี",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18" />
      </>
    ),
  },
  {
    href: "/admin/bookings",
    en: "Bookings",
    th: "จองห้อง",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <path d="M3 12h18M9 3v18M15 3v18" />
      </>
    ),
  },
  {
    href: "/admin/portfolio",
    en: "Portfolios",
    th: "รุ่นพี่",
    icon: (
      <>
        <path d="M4 7h16v13H4z" />
        <path d="M9 7V4h6v3" />
      </>
    ),
  },
  {
    href: "/admin/pshare",
    en: "P'share Studio",
    th: "พี่แชร์",
    icon: (
      <>
        <path d="M3 5l9 -2 9 2v14l-9 -2 -9 2z" />
        <path d="M12 3v18" />
      </>
    ),
  },
  {
    href: "/admin/carelin",
    en: "Carelin Desk",
    th: "แคร์ลิน",
    icon: (
      <path d="M21 11c0 4 -4 7 -9 7l-3 3v-3c-3 -1 -6 -3 -6 -7s4 -7 9 -7s9 3 9 7z" />
    ),
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="sticky top-6 w-[240px] shrink-0 self-start border-[1.5px] border-line bg-paper p-[20px_18px_18px]"
      style={{ boxShadow: "5px 5px 0 var(--color-ink)" }}
    >
      <div className="mb-4 border-b-[1.5px] border-line pb-4 text-center">
        <span
          className="inline-block bg-blue px-[14px] pt-1 pb-2 font-display italic text-[22px] text-white"
          style={{
            boxShadow: "2px 2px 0 var(--color-yellow)",
            transform: "rotate(-1.5deg)",
          }}
        >
          CD Smart
        </span>
        <div
          className="-mt-1 font-display italic text-[32px] leading-[0.9] text-yellow"
          style={{ WebkitTextStroke: "1.5px var(--color-ink)" }}
        >
          2026
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-mute-500">
          ★ Chitralada ★
        </div>
      </div>
      <div className="px-1.5 pt-3 pb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-mute-500">
        Workspace
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 border-l-[3px] px-3 py-2.5 text-left text-[13.5px] font-sans transition-colors",
                active
                  ? "border-blue bg-ink font-medium text-yellow"
                  : "border-transparent text-ink hover:bg-cream",
              )}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "shrink-0",
                  active ? "text-yellow" : "text-mute-700",
                )}
              >
                {item.icon}
              </svg>
              <span>
                {item.en}{" "}
                <span
                  className={cn(
                    "ml-1 font-display italic text-[13px]",
                    active ? "text-yellow" : "text-mute-500",
                  )}
                >
                  {item.th}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
