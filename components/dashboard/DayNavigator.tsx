"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { relativeLabel, shiftDay, todayISO } from "@/lib/format/date";

interface DayNavigatorProps {
  value: string;
  onChange: (iso: string) => void;
}

/**
 * Prev/next day arrows + Today button + native date picker. Left/Right arrow
 * keys shift the day (ignored while typing in an input/textarea/select).
 */
export function DayNavigator({ value, onChange }: DayNavigatorProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") onChange(shiftDay(value, -1));
      else if (e.key === "ArrowRight") onChange(shiftDay(value, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onChange]);

  const isToday = value === todayISO();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(shiftDay(value, -1))}
        aria-label="Previous day"
        data-test-id="day-prev"
        className="rounded-lg border border-hairline p-2 text-muted hover:bg-canvas hover:text-navy"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value}
          data-test-id="day-picker"
          aria-label="Selected day"
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink"
        />
        <span className="hidden whitespace-nowrap text-xs font-medium text-blue-brand sm:inline">
          {relativeLabel(value)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftDay(value, 1))}
        aria-label="Next day"
        data-test-id="day-next"
        className="rounded-lg border border-hairline p-2 text-muted hover:bg-canvas hover:text-navy"
      >
        <ChevronRight size={16} />
      </button>

      <button
        type="button"
        onClick={() => onChange(todayISO())}
        disabled={isToday}
        data-test-id="day-today"
        className="rounded-lg border border-hairline px-3 py-2 text-sm font-medium text-navy hover:bg-canvas disabled:opacity-50"
      >
        Today
      </button>
    </div>
  );
}
