import type { Entry } from "../types";
import { CATEGORY_MAP } from "../constants";
import { formatDuration } from "../format/time";
import { formatLongDate } from "../format/date";
import { sanitizeUrl } from "../security/url";
import { sortEntries } from "../entries";

/**
 * Simple end-of-day summary for pasting into Slack:
 *
 *   *Thursday, 16 Jul 2026*
 *   • Daily stand-up + sprint sync - Meeting · 30m
 *   • Wired up the dashboard [VS-8301](https://…) - Development · 3h 15m
 *
 * The ticket number is a markdown link when a URL is present (Slack renders it
 * as a clickable label on paste), otherwise plain text.
 */
export function buildDaySummary(date: string, entries: Entry[]): string {
  const sorted = sortEntries(entries);
  const lines: string[] = [`*${formatLongDate(date)}*`];

  for (const e of sorted) {
    let ticket = "";
    if (e.ticket_number) {
      const safe = sanitizeUrl(e.ticket_url);
      ticket = safe ? ` [${e.ticket_number}](${safe})` : ` ${e.ticket_number}`;
    }

    const meta = [CATEGORY_MAP[e.category].label];
    if (e.minutes > 0) meta.push(formatDuration(e.minutes));

    lines.push(`• ${e.task}${ticket} - ${meta.join(" · ")}`);
  }

  return lines.join("\n");
}
