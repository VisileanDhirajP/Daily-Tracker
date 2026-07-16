import { startOfMonth, startOfWeek, todayISO } from "../format/date";

export type RangeKey = "today" | "week" | "month" | "custom";

export interface DateRange {
  from: string;
  to: string;
  label: string;
}

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

/** Resolve a range key into concrete from/to ISO dates. */
export function resolveRange(
  key: RangeKey,
  custom?: { from: string; to: string },
): DateRange {
  const today = todayISO();
  switch (key) {
    case "today":
      return { from: today, to: today, label: "Today" };
    case "week":
      return { from: startOfWeek(today), to: today, label: "This week" };
    case "month":
      return { from: startOfMonth(today), to: today, label: "This month" };
    case "custom": {
      const from = custom?.from || today;
      const to = custom?.to || today;
      // Guard against reversed ranges.
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      return { from: lo, to: hi, label: "Custom range" };
    }
  }
}
