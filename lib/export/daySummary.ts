import type { Entry } from "../types";
import { CATEGORY_MAP, STATUS_META } from "../constants";
import { formatDuration } from "../format/time";
import { formatLongDate } from "../format/date";
import { sanitizeUrl } from "../security/url";
import { sortEntries, sumMinutes } from "../entries";

/**
 * Slack-ready end-of-day summary for pasting into a channel. Uses Slack mrkdwn:
 * `*bold*`, `_italic_`, `<url|label>` links, and bullet points. Status shows as
 * an emoji (✅ done · 🔄 in progress · ⏸️ on hold) for quick scanning.
 */
export function buildDaySummary(date: string, entries: Entry[]): string {
  const sorted = sortEntries(entries);
  const lines: string[] = [`*🗓️ EOD — ${formatLongDate(date)}*`, ""];

  for (const e of sorted) {
    const emoji = STATUS_META[e.status].emoji;

    let ticket = "";
    if (e.ticket_number) {
      const safe = sanitizeUrl(e.ticket_url);
      ticket = safe ? ` (<${safe}|${e.ticket_number}>)` : ` (${e.ticket_number})`;
    }

    const meta = [CATEGORY_MAP[e.category].label];
    if (e.minutes > 0) meta.push(formatDuration(e.minutes));

    lines.push(`• ${emoji} ${e.task}${ticket} — _${meta.join(" · ")}_`);
  }

  lines.push("");
  lines.push(
    `*Total:* ${formatDuration(sumMinutes(sorted))} · ${sorted.length} ${
      sorted.length === 1 ? "entry" : "entries"
    }`,
  );
  return lines.join("\n");
}
