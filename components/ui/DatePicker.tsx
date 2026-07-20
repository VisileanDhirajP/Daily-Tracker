"use client";

import { useEffect, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { parseISODate, toISODate, todayISO, formatShortDate } from "@/lib/format/date";

interface DatePickerProps {
  value: string; // "" or YYYY-MM-DD
  onChange: (iso: string) => void;
  testId?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Branded calendar popover — a drop-in replacement for `<input type="date">`.
 * Built on Radix Popover so the panel renders in a portal: it escapes any
 * scrolling/`overflow-hidden` ancestor (e.g. the entry modal) and flips to stay
 * on-screen near viewport edges. Radix also owns outside-click, Escape, and
 * focus return, so no manual document listeners are needed.
 */
export function DatePicker({
  value,
  onChange,
  testId,
  ariaLabel = "Select date",
  placeholder = "Select date",
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => parseISODate(value), [value]);
  const [view, setView] = useState(() => {
    const base = selected ?? parseISODate(todayISO()) ?? new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  // Re-sync the visible month to the value whenever the picker opens.
  useEffect(() => {
    if (!open) return;
    const base = parseISODate(value) ?? parseISODate(todayISO());
    if (base) setView({ y: base.getFullYear(), m: base.getMonth() });
  }, [open, value]);

  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(toISODate(new Date(view.y, view.m, d)));
    return cells;
  }, [view]);

  const shiftMonth = (delta: number) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const today = todayISO();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={className}>
        <Popover.Trigger asChild>
          <button
            type="button"
            data-test-id={testId}
            aria-label={ariaLabel}
            className="flex w-full items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink transition-colors hover:border-blue-light focus:border-blue-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-brand"
          >
            <CalendarDays size={15} className="shrink-0 text-muted" />
            <span className={value ? "text-ink" : "text-muted"}>
              {value ? formatShortDate(value) : placeholder}
            </span>
          </button>
        </Popover.Trigger>
      </div>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          aria-label="Choose a date"
          className="z-50 w-[16rem] rounded-2xl border border-hairline bg-card p-3 shadow-card data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-navy"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-navy">
              {MONTHS[view.m]} {view.y}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-navy"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1 text-center text-[11px] font-medium text-muted">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((iso, i) =>
              iso === null ? (
                <span key={`b-${i}`} />
              ) : (
                <button
                  key={iso}
                  type="button"
                  aria-label={formatShortDate(iso)}
                  aria-current={iso === value ? "date" : undefined}
                  onClick={() => pick(iso)}
                  className={`flex h-8 items-center justify-center rounded-lg text-sm transition-colors ${
                    iso === value
                      ? "bg-navy font-semibold text-white"
                      : iso === today
                        ? "text-blue-brand ring-1 ring-blue-brand/40 hover:bg-canvas"
                        : "text-ink hover:bg-canvas"
                  }`}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              ),
            )}
          </div>

          <div className="mt-2 border-t border-hairline pt-2 text-center">
            <button
              type="button"
              onClick={() => pick(today)}
              className="rounded-lg px-3 py-1 text-xs font-medium text-blue-brand hover:bg-blue-brand/10"
            >
              Today
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
