import type { Category, EntryStatus } from "./types";

export interface ParsedQuick {
  task: string;
  category: Category;
  minutes: number;
  ticket_number: string | null;
  status: EntryStatus;
}

/** Word → category. First standalone match wins; the word is dropped from the task. */
const CATEGORY_KEYWORDS: Record<string, Category> = {
  dev: "dev",
  develop: "dev",
  development: "dev",
  code: "dev",
  coding: "dev",
  meeting: "meeting",
  meet: "meeting",
  mtg: "meeting",
  standup: "meeting",
  sync: "meeting",
  call: "meeting",
  review: "review",
  qa: "review",
  pr: "review",
  test: "review",
  testing: "review",
  docs: "docs",
  doc: "docs",
  documentation: "docs",
  support: "support",
  help: "support",
  planning: "planning",
  plan: "planning",
  grooming: "planning",
  backlog: "planning",
  other: "other",
};

const TICKET_RE = /^[A-Za-z]{1,6}-\d+$/;
// Duration token: 2h, 1.5h, 30m, 90m, 1h30m (must contain h or m).
const DURATION_RE = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?$/i;

/**
 * Parse a natural-language quick-entry string, e.g.
 *   "2h dev VS-8301 fixed the viewer leak"
 * → { minutes: 120, category: "dev", ticket_number: "VS-8301", task: "fixed the viewer leak" }
 *
 * Recognised tokens (duration, a category keyword, and a ticket like VS-1234)
 * are stripped; whatever remains is the task. Returns null if no task is left.
 */
export function parseQuickEntry(raw: string): ParsedQuick | null {
  const text = raw.trim();
  if (!text) return null;

  const tokens = text.split(/\s+/);
  const consumed = new Set<number>();
  let minutes = 0;
  let category: Category = "other";
  let categoryTokenIndex: number | null = null;
  let ticket: string | null = null;

  tokens.forEach((tok, i) => {
    // duration
    const dur = DURATION_RE.exec(tok);
    if (dur && (dur[1] || dur[2])) {
      minutes += Math.round((dur[1] ? parseFloat(dur[1]) : 0) * 60 + (dur[2] ? parseInt(dur[2], 10) : 0));
      consumed.add(i);
      return;
    }
    // ticket (first one)
    if (!ticket && TICKET_RE.test(tok)) {
      ticket = tok.toUpperCase();
      consumed.add(i);
      return;
    }
    // category keyword (first one)
    if (categoryTokenIndex === null) {
      const key = tok.toLowerCase().replace(/[^a-z]/g, "");
      const cat = CATEGORY_KEYWORDS[key];
      if (cat) {
        category = cat;
        categoryTokenIndex = i;
        consumed.add(i);
        return;
      }
    }
  });

  let task = tokens
    .filter((_, i) => !consumed.has(i))
    .join(" ")
    .trim();
  // If the category keyword was the only descriptive word (e.g. "standup"),
  // keep it as the task rather than logging nothing — the category still sticks.
  if (!task && categoryTokenIndex !== null) task = tokens[categoryTokenIndex];
  if (!task) return null;

  return { task, category, minutes, ticket_number: ticket, status: "progress" };
}
