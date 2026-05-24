import type { ReactNode } from "react";
import { ActiveLink } from "./ActiveLink";

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

const BASE_TAB =
  "relative flex flex-col items-center gap-[3px] py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase transition-colors group";
const ACTIVE_TAB = `${BASE_TAB} text-yellow font-semibold`;
const INACTIVE_TAB = `${BASE_TAB} text-white/70`;

export function StudentBottomNav() {
  return (
    <nav className="border-navy bg-navy grid shrink-0 grid-cols-5 border-t-[1.5px] pt-2 pb-3.5">
      {TABS.map((tab) => (
        <ActiveLink
          key={tab.href}
          href={tab.href}
          exact={tab.href === "/student"}
          activeClass={ACTIVE_TAB}
          inactiveClass={INACTIVE_TAB}
        >
          <span
            aria-hidden
            className="bg-yellow absolute -top-2 left-1/2 hidden h-[3px] w-6 -translate-x-1/2 group-data-[active=true]:block"
          />
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
        </ActiveLink>
      ))}
    </nav>
  );
}
