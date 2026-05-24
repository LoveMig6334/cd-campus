"use client";

import { useTheme } from "./ThemeShell";

// Replaces the notification bell in StudentHeader. Shows a moon in light mode
// (tap → dark) and a sun in dark mode (tap → light).
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={
        dark
          ? "Switch to light theme · โหมดสว่าง"
          : "Switch to dark theme · โหมดมืด"
      }
      className="border-line bg-paper text-ink hover:bg-yellow dark:hover:text-cream grid h-9 w-9 place-items-center rounded-full border-[1.5px] transition-colors"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}
