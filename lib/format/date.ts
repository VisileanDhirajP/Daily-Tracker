/**
 * Date helpers working in the *local* timezone with `YYYY-MM-DD` strings.
 * Using local-date construction (not `new Date(iso)`) avoids the UTC-parsing
 * off-by-one that shifts dates across timezones.
 */

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Format a Date as local `YYYY-MM-DD`. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse `YYYY-MM-DD` into a local Date at midnight. Returns null if malformed. */
export function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, da] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(da));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(mo) - 1 ||
    date.getDate() !== Number(da)
  ) {
    return null; // rejects impossible dates like 2026-02-31
  }
  return date;
}

export function isValidISODate(iso: string): boolean {
  return parseISODate(iso) !== null;
}

/** Today's local date as `YYYY-MM-DD`. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Shift an ISO date by whole days (positive or negative). */
export function shiftDay(iso: string, delta: number): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

/** Shift an ISO date by whole months, clamping the day to the target month. */
export function shiftMonths(iso: string, delta: number): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  const first = new Date(d.getFullYear(), d.getMonth() + delta, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const day = Math.min(d.getDate(), lastDay);
  return toISODate(new Date(first.getFullYear(), first.getMonth(), day));
}

/** Whole-day difference `a - b` (a and b are ISO dates). */
export function dayDiff(a: string, b: string): number {
  const da = parseISODate(a);
  const db = parseISODate(b);
  if (!da || !db) return 0;
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((da.getTime() - db.getTime()) / MS);
}

/** Relative label vs today: "Today", "Yesterday", "Tomorrow", "N days ago", "In N days". */
export function relativeLabel(iso: string, today: string = todayISO()): string {
  const diff = dayDiff(iso, today);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `In ${diff} days`;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** e.g. "Thursday, 16 Jul 2026". */
export function formatLongDate(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. "16 Jul 2026". */
export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Monday-based start of the ISO week containing `iso`. */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  const day = d.getDay(); // 0 = Sun
  const delta = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

/** First day of the month containing `iso`. */
export function startOfMonth(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
