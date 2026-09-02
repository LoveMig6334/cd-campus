"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/signout/actions";
import { cn } from "@/lib/cn";

const MIN_W = 200;
const MAX_W = 420;
const DEFAULT_W = 264;
const COLLAPSED_W = 72;
const STORAGE_KEY = "console-sidebar";

const NAV = [
  {
    href: "/console/match",
    en: "Match",
    th: "สร้าง / จัดการการแข่งขัน",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18" />
      </>
    ),
  },
  {
    href: "/console/history",
    en: "History",
    th: "ประวัติการแข่งขัน",
    icon: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5M12 7v5l3 2" />
      </>
    ),
  },
  {
    href: "/console/display",
    en: "Display",
    th: "จอสกอร์บอร์ด",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
  },
];

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/**
 * Marine sidebar: collapsible to an icon rail and drag-resizable on its right
 * edge. Width/collapsed state is a per-browser convenience kept in
 * localStorage; the server renders the default so there is no hydration
 * mismatch, and the stored value is applied after mount.
 */
export function ConsoleSidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT_W);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const widthRef = useRef(width);

  useEffect(() => {
    // Restore the per-browser preference after hydration (server renders the
    // default width). Deferred a frame so it's an external-state sync, not a
    // synchronous setState in the effect body.
    const id = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const v = JSON.parse(raw) as { width?: number; collapsed?: boolean };
        if (typeof v.width === "number") {
          setWidth(Math.min(MAX_W, Math.max(MIN_W, v.width)));
        }
        if (typeof v.collapsed === "boolean") setCollapsed(v.collapsed);
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    widthRef.current = width;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ width, collapsed }));
    } catch {
      /* ignore */
    }
  }, [width, collapsed]);

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (collapsed) return;
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startW = widthRef.current;
    const onMove = (ev: PointerEvent) => {
      const next = Math.min(
        MAX_W,
        Math.max(MIN_W, startW + ev.clientX - startX),
      );
      setWidth(next);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const w = collapsed ? COLLAPSED_W : width;

  const linkBase =
    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors";
  const footBase =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-white/75 transition-colors hover:bg-white/10 hover:text-white";

  return (
    <aside
      className={cn(
        "bg-marine relative flex h-screen shrink-0 flex-col text-white select-none",
        !dragging && "transition-[width] duration-200",
      )}
      style={{ width: w }}
    >
      {/* Brand + collapse toggle */}
      <div
        className={cn(
          "flex items-start gap-2 px-4 pt-5 pb-6",
          collapsed && "flex-col items-center px-0",
        )}
      >
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="bg-gold inline-block size-2.5 shrink-0 rounded-full" />
              <span className="truncate text-[11px] font-medium tracking-[0.18em] text-white/70 uppercase">
                CD Smart Campus
              </span>
            </div>
            <div className="mt-1 truncate text-[19px] leading-tight font-semibold">
              Scoreboard Console
            </div>
            <div className="truncate text-[13px] text-white/60">
              สกอร์บอร์ดกีฬาสี
            </div>
          </div>
        )}
        {collapsed && (
          <span className="bg-gold mb-2 inline-block size-3 rounded-full" />
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Icon>
            {collapsed ? (
              <path d="M9 6l6 6-6 6" />
            ) : (
              <path d="M15 6l-6 6 6 6" />
            )}
          </Icon>
        </button>
      </div>

      <nav className={cn("flex flex-col gap-1", collapsed ? "px-3" : "px-4")}>
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? `${item.en} · ${item.th}` : undefined}
              className={cn(
                linkBase,
                active
                  ? "bg-sky font-medium text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <span className="bg-gold absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full" />
              )}
              <Icon>{item.icon}</Icon>
              {!collapsed && (
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate">{item.en}</span>
                  <span className="truncate text-[11.5px] opacity-70">
                    {item.th}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto flex flex-col gap-1 border-t border-white/15 pt-3 pb-4",
          collapsed ? "px-3" : "px-4",
        )}
      >
        <Link
          href="/scoreboard"
          target="_blank"
          title="Open display board"
          className={cn(footBase, collapsed && "justify-center px-0")}
        >
          <Icon>
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </Icon>
          {!collapsed && <span className="truncate">Open display board</span>}
        </Link>
        <Link
          href="/admin/scoreboard"
          title="Classic UI"
          className={cn(footBase, collapsed && "justify-center px-0")}
        >
          <Icon>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </Icon>
          {!collapsed && <span className="truncate">Classic UI</span>}
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className={cn(
              footBase,
              "w-full cursor-pointer text-left text-white/60",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon>
              <path d="M10 17l5-5-5-5M15 12H3M21 4v16" />
            </Icon>
            {!collapsed && (
              <span className="truncate">Sign out · ออกจากระบบ</span>
            )}
          </button>
        </form>
      </div>

      {/* Resize handle */}
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onPointerDown={startDrag}
          className={cn(
            "absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize transition-colors",
            dragging ? "bg-sky" : "hover:bg-sky/60",
          )}
        />
      )}
    </aside>
  );
}
