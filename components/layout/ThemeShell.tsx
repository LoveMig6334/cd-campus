"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// Wraps the student phone shell. Applies the `.dark` class (which globals.css
// uses to override the color tokens) and persists the choice in a cookie that
// PhoneShell reads server-side, so there's no flash on reload. Student-only —
// the admin layout never renders this.
export function ThemeShell({
  initialTheme,
  className,
  children,
}: {
  initialTheme: Theme;
  className?: string;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.cookie = `student-theme=${next}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div className={cn(className, theme === "dark" && "dark")}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
