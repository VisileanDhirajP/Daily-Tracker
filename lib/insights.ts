import type { Category, Entry, EntryStatus } from "./types";
import { parseISODate, shiftDay, dayDiff } from "./format/date";

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

/** Total minutes keyed by ISO date. */
export function dailyMinutes(entries: Entry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    m.set(e.entry_date, (m.get(e.entry_date) ?? 0) + (e.minutes || 0));
  }
  return m;
}

/** Continuous per-day totals across [from, to] inclusive (gaps filled with 0). */
export function dailySeries(
  entries: Entry[],
  from: string,
  to: string,
): { date: string; minutes: number }[] {
  const m = dailyMinutes(entries);
  const out: { date: string; minutes: number }[] = [];
  let d = from;
  for (let i = 0; i < 3660 && d <= to; i++) {
    out.push({ date: d, minutes: m.get(d) ?? 0 });
    d = shiftDay(d, 1);
  }
  return out;
}

/** Total minutes per ticket number (entries without a ticket are ignored). */
export function minutesByTicket(
  entries: Entry[],
): { ticket: string; url: string | null; minutes: number }[] {
  const map = new Map<string, { minutes: number; url: string | null }>();
  for (const e of entries) {
    if (!e.ticket_number) continue;
    const cur = map.get(e.ticket_number) ?? { minutes: 0, url: null };
    cur.minutes += e.minutes || 0;
    if (!cur.url && e.ticket_url) cur.url = e.ticket_url;
    map.set(e.ticket_number, cur);
  }
  return [...map.entries()]
    .map(([ticket, v]) => ({ ticket, url: v.url, minutes: v.minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** The equal-length period immediately preceding [from, to]. */
export function previousPeriod(
  from: string,
  to: string,
): { from: string; to: string } {
  const len = Math.max(1, dayDiff(to, from) + 1);
  const prevTo = shiftDay(from, -1);
  const prevFrom = shiftDay(prevTo, -(len - 1));
  return { from: prevFrom, to: prevTo };
}
