import { dayDiff, todayISO } from "./date";

/**
 * Count consecutive days (ending today) that have at least one entry.
 *
 * A streak requires an entry *today*; if today has none, the streak is 0.
 * `dates` is any list of entry dates (`YYYY-MM-DD`), possibly with duplicates.
 */
export function calcStreak(dates: string[], today: string = todayISO()): number {
  if (dates.length === 0) return 0;
  const present = new Set(dates);
  if (!present.has(today)) return 0;

  let streak = 0;
  // Walk backwards from today until a gap.
  // Cap the walk to avoid pathological loops.
  for (let offset = 0; offset < 3660; offset++) {
    const target = shift(today, -offset);
    if (present.has(target)) streak++;
    else break;
  }
  return streak;
}

// Local shim so this file has no dependency beyond date math.
function shift(iso: string, delta: number): string {
  // Reuse dayDiff's parsing by reconstructing via Date; keep local-tz safe.
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Re-export so consumers importing from here can also check adjacency if needed.
export { dayDiff };
