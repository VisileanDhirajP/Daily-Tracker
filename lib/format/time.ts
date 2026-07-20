/** Split total minutes into whole hours + remaining minutes. */
export function splitMinutes(total: number): { hours: number; minutes: number } {
  const safe = Math.max(0, Math.floor(total || 0));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

/** Combine hours + minutes inputs into total minutes. */
export function toMinutes(hours: number, minutes: number): number {
  const h = Math.max(0, Math.floor(hours || 0));
  const m = Math.max(0, Math.floor(minutes || 0));
  return h * 60 + m;
}

/** Compact label, e.g. "2h 15m", "45m", "3h", "0m". */
export function formatDuration(total: number): string {
  const { hours, minutes } = splitMinutes(total);
  if (hours === 0 && minutes === 0) return "0m";
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}

/** Decimal hours rounded to 2dp, e.g. 135 -> 2.25. */
export function toHours(total: number): number {
  const safe = Math.max(0, Math.floor(total || 0));
  return Math.round((safe / 60) * 100) / 100;
}

/** Human hours label for stats, e.g. "2.25h" (2-decimal, via toHours). */
export function formatHours(total: number): string {
  return `${toHours(total)}h`;
}
