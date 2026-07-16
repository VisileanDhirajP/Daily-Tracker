import type { Entry } from "../types";
import { CATEGORY_MAP } from "../constants";
import { formatDuration } from "../format/time";
import { formatLongDate } from "../format/date";
import { sanitizeUrl } from "../security/url";
import { sortEntries } from "../entries";

/**
 * Simple end-of-day summary for pasting into Slack:
 *
 *   Thursday, 16 Jul 2026
 *
 *   • Daily stand-up + sprint sync - Meeting · 30m
 *   • Wired up the dashboard [#8301](https://…) - Development · 3h 15m
 *
 * The ticket is shown as `#<number>` (the letter prefix like "VS-" is stripped)
 * and is a markdown link when a URL is present (Slack renders it as a clickable
 * label on paste), otherwise plain text.
 */

/** Display a ticket number as `#<number>`, stripping any leading letter prefix. */
function ticketLabel(ticketNumber: string): string {
  const digits = ticketNumber.replace(/^[^0-9]+/, "");
  return digits ? `#${digits}` : ticketNumber;
}
export function buildDaySummary(date: string, entries: Entry[]): string {
  const sorted = sortEntries(entries);
  // Plain date header, then a blank line before the entries.
  const lines: string[] = [formatLongDate(date), ""];

  for (const e of sorted) {
    let ticket = "";
    if (e.ticket_number) {
      const label = ticketLabel(e.ticket_number);
      const safe = sanitizeUrl(e.ticket_url);
      ticket = safe ? ` [${label}](${safe})` : ` ${label}`;
    }

    const meta = [CATEGORY_MAP[e.category].label];
    if (e.minutes > 0) meta.push(formatDuration(e.minutes));

    lines.push(`• ${e.task}${ticket} - ${meta.join(" · ")}`);
  }

  return lines.join("\n");
}
