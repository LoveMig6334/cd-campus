import type { ReactNode } from "react";
import { signOut } from "@/app/auth/signout/actions";
import { ActiveLink } from "./ActiveLink";

export type NavItem = {
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

const BASE_LINK =
  "flex items-center gap-3 border-l-[3px] px-3 py-2.5 text-left font-sans text-[13.5px] transition-colors";
const ACTIVE_LINK = `${BASE_LINK} border-blue bg-ink text-yellow font-medium group`;
const INACTIVE_LINK = `${BASE_LINK} text-ink hover:bg-cream border-transparent group`;

export function AdminSidebar({ extraItems = [] }: { extraItems?: NavItem[] }) {
  const items = [...NAV, ...extraItems];
  return (
    <aside
      className="border-line bg-paper sticky top-6 w-[240px] shrink-0 self-start border-[1.5px] p-[20px_18px_18px]"
      style={{ boxShadow: "5px 5px 0 var(--color-ink)" }}
    >
      <div className="border-line mb-4 border-b-[1.5px] pb-4 text-center">
        <span
          className="bg-blue font-display inline-block px-[14px] pt-1 pb-2 text-[22px] text-white italic"
          style={{
            boxShadow: "2px 2px 0 var(--color-yellow)",
            transform: "rotate(-1.5deg)",
          }}
        >
          CD Smart
        </span>
        <div
          className="font-display text-yellow -mt-1 text-[32px] leading-[0.9] italic"
          style={{ WebkitTextStroke: "1.5px var(--color-ink)" }}
        >
          2026
        </div>
        <div className="text-mute-500 mt-1 font-mono text-[9px] tracking-[0.22em] uppercase">
          ★ Chitralada ★
        </div>
      </div>
      <div className="text-mute-500 px-1.5 pt-3 pb-1.5 font-mono text-[9px] tracking-[0.2em] uppercase">
        Workspace
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <ActiveLink
            key={item.href}
            href={item.href}
            exact={item.href === "/admin"}
            activeClass={ACTIVE_LINK}
            inactiveClass={INACTIVE_LINK}
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
              className="text-mute-700 group-data-[active=true]:text-yellow shrink-0"
            >
              {item.icon}
            </svg>
            <span>
              {item.en}{" "}
              <span className="font-display text-mute-500 group-data-[active=true]:text-yellow ml-1 text-[13px] italic">
                {item.th}
              </span>
            </span>
          </ActiveLink>
        ))}
      </nav>
      <form action={signOut} className="border-line mt-3 border-t-[1.5px] pt-3">
        <button
          type="submit"
          className="text-mute-500 hover:text-house-pink w-full px-3 py-2 text-left font-mono text-[10px] tracking-[0.14em] uppercase transition-colors"
        >
          Sign out · ออกจากระบบ →
        </button>
      </form>
    </aside>
  );
}
