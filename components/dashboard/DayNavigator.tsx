"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { relativeLabel, shiftDay, todayISO } from "@/lib/format/date";
import { DatePicker } from "@/components/ui/DatePicker";

interface DayNavigatorProps {
  value: string;
  onChange: (iso: string) => void;
  /** Disable the global ←/→ shortcut (e.g. while a modal/dialog is open). */
  shortcutsEnabled?: boolean;
  /** Tighten spacing + let the date picker flex to fit a narrow container. */
  compact?: boolean;
}

/**
 * Prev/next day arrows + Today button + date picker. Left/Right arrow keys
 * shift the day (ignored while typing in a field or when shortcuts are off).
 */
export function DayNavigator({
  value,
  onChange,
  shortcutsEnabled = true,
  compact = false,
}: DayNavigatorProps) {
  useEffect(() => {
    if (!shortcutsEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el?.isContentEditable
      ) {
        return;
      }
      // Ignore while any dialog/menu/listbox is open (Radix portals these).
      if (document.querySelector('[role="dialog"],[role="menu"],[role="listbox"]')) {
        return;
      }
      if (e.key === "ArrowLeft") onChange(shiftDay(value, -1));
      else if (e.key === "ArrowRight") onChange(shiftDay(value, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onChange, shortcutsEnabled]);

  const isToday = value === todayISO();

  return (
    <div className={`flex items-center ${compact ? "w-full gap-1.5" : "gap-2"}`}>
      <button
        type="button"
        onClick={() => onChange(shiftDay(value, -1))}
        aria-label="Previous day"
        data-test-id="day-prev"
        className="shrink-0 rounded-lg border border-hairline p-2 text-muted hover:bg-canvas hover:text-navy"
      >
        <ChevronLeft size={16} />
      </button>

      <div className={`flex items-center gap-2 ${compact ? "min-w-0 flex-1" : ""}`}>
        <DatePicker
          value={value}
          onChange={(iso) => iso && onChange(iso)}
          testId="day-picker"
          ariaLabel="Selected day"
          className={compact ? "w-full" : "w-40"}
        />
        {!compact && (
          <span className="hidden whitespace-nowrap text-xs font-medium text-blue-brand sm:inline">
            {relativeLabel(value)}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftDay(value, 1))}
        aria-label="Next day"
        data-test-id="day-next"
        className="shrink-0 rounded-lg border border-hairline p-2 text-muted hover:bg-canvas hover:text-navy"
      >
        <ChevronRight size={16} />
      </button>

      <button
        type="button"
        onClick={() => onChange(todayISO())}
        disabled={isToday}
        data-test-id="day-today"
        className="shrink-0 rounded-lg border border-hairline px-3 py-2 text-sm font-medium text-navy hover:bg-canvas disabled:opacity-50"
      >
        Today
      </button>
    </div>
  );
}
