"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * Light/dark toggle. Persists to localStorage ("vldt:theme") and flips the
 * `dark` class on <html>; the no-flash script in the layout applies it on load.
 */
export function ThemeToggle({
  testId = "theme-toggle",
  className = "flex h-8 w-8 items-center justify-center rounded-lg text-blue-light transition-colors hover:bg-white/10 hover:text-white",
}: {
  testId?: string;
  className?: string;
}) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("vldt:theme", next ? "dark" : "light");
    } catch {
      /* ignore storage errors */
    }
  };

  const label = isDark ? "Light mode" : "Dark mode";

  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={toggle}
        data-test-id={testId}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={className}
      >
        {mounted && isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </Tooltip>
  );
}
