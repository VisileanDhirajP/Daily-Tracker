import type { Entry } from "../types";
import { CATEGORY_MAP } from "../constants";
import { formatDuration } from "../format/time";
import { formatLongDate } from "../format/date";
import { sortEntries, sumMinutes } from "../entries";

/**
 * Plain-text bullet list of a day's entries — handy for pasting into standups.
 * No HTML; consumed by clipboard / mailto, so kept human-readable.
 */
export function buildDaySummary(date: string, entries: Entry[]): string {
  const sorted = sortEntries(entries);
  const lines: string[] = [formatLongDate(date), ""];
  for (const e of sorted) {
    const bits: string[] = [];
    if (e.ticket_number) bits.push(`[${e.ticket_number}]`);
    bits.push(e.task);
    const meta: string[] = [CATEGORY_MAP[e.category].label];
    if (e.minutes > 0) meta.push(formatDuration(e.minutes));
    if (e.status === "progress") meta.push("in progress");
    lines.push(`• ${bits.join(" ")} (${meta.join(", ")})`);
  }
  lines.push("");
  lines.push(`Total: ${formatDuration(sumMinutes(sorted))} across ${sorted.length} ${
    sorted.length === 1 ? "entry" : "entries"
  }`);
  return lines.join("\n");
}
