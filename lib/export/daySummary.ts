import type { Entry } from "../types";
import { CATEGORY_MAP } from "../constants";
import { formatDuration } from "../format/time";
import { formatLongDate } from "../format/date";
import { sanitizeUrl } from "../security/url";
import { sortEntries } from "../entries";

/**
 * End-of-day summary for pasting into Slack. Uses Slack-flavored Markdown that
 * Slack's composer converts on paste:
 *
 *   *Thursday, 16 Jul 2026*
 *
 *   • Daily stand-up + sprint sync - Meeting · 30m
 *   • Wired up the dashboard [#8301](https://…) - Development · 3h 15m
 *
 * Rendered result in Slack: a **bold** date (`*…*`), round bullet points (the
 * literal `•` glyph — Slack doesn't convert `- ` to a list on paste), and the
 * ticket as a clickable `#<number>` link (`[label](url)`; the letter prefix
 * like "VS-" is stripped). Plain `#<number>` when no URL is present.
 */

/** Display a ticket number as `#<number>`, stripping any leading letter prefix. */
function ticketLabel(ticketNumber: string): string {
  const digits = ticketNumber.replace(/^[^0-9]+/, "");
  return digits ? `#${digits}` : ticketNumber;
}
export function buildDaySummary(date: string, entries: Entry[]): string {
  const sorted = sortEntries(entries);
  // Bold date header (Slack `*…*`), then a blank line before the list.
  const lines: string[] = [`*${formatLongDate(date)}*`, ""];

  for (const e of sorted) {
    let ticket = "";
    if (e.ticket_number) {
      const label = ticketLabel(e.ticket_number);
      const safe = sanitizeUrl(e.ticket_url);
      ticket = safe ? ` [${label}](${safe})` : ` ${label}`;
    }

    const meta = [CATEGORY_MAP[e.category].label];
    if (e.minutes > 0) meta.push(formatDuration(e.minutes));

    // Literal "•" bullet glyph — Slack doesn't reliably convert "- " to a list
    // on paste, but the bullet character always renders as a round bullet.
    lines.push(`• ${e.task}${ticket} - ${meta.join(" · ")}`);
  }

  return lines.join("\n");
}
