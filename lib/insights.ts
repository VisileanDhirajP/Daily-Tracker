import type { Category, Entry, EntryStatus } from "./types";
import { parseISODate } from "./format/date";

/** Total minutes grouped by category, sorted most-time first. */
export function minutesByCategory(
  entries: Entry[],
): { category: Category; minutes: number }[] {
  const map = new Map<Category, number>();
  for (const e of entries) {
    map.set(e.category, (map.get(e.category) ?? 0) + (e.minutes || 0));
  }
  return [...map.entries()]
    .map(([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

/**
 * Total minutes per weekday, index 0 = Monday … 6 = Sunday.
 * (JS getDay() is 0 = Sunday, so we rotate.)
 */
export function minutesByWeekday(entries: Entry[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) {
    const d = parseISODate(e.entry_date);
    if (!d) continue;
    const idx = (d.getDay() + 6) % 7;
    out[idx] += e.minutes || 0;
  }
  return out;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Count of entries per status. */
export function countByStatus(entries: Entry[]): Record<EntryStatus, number> {
  const out: Record<EntryStatus, number> = { progress: 0, hold: 0, done: 0 };
  for (const e of entries) out[e.status]++;
  return out;
}

/** Percentage change from `previous` to `current`; null when there's no base. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}
