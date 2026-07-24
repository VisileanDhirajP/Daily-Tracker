import type { Blocker, BlockerInput, Entry } from "./types";

/** Extract the editable payload from a blocker (drops server fields). */
export function toBlockerInput(b: Blocker): BlockerInput {
  return {
    reason: b.reason,
    waiting_on: b.waiting_on,
    ticket_number: b.ticket_number,
    ticket_url: b.ticket_url,
  };
}

/** Whole days since the blocker was created, floored, never negative. */
export function blockerAgeDays(b: Blocker, now: Date = new Date()): number {
  const created = new Date(b.created_at).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((now.getTime() - created) / 86_400_000));
}

export function ageLabel(days: number): string {
  return days <= 0 ? "today" : `${days}d`;
}

export type AgeTone = "muted" | "warn" | "urgent";

/** <2d calm, 2–4d warn, ≥5d urgent. */
export function ageTone(days: number): AgeTone {
  if (days >= 5) return "urgent";
  if (days >= 2) return "warn";
  return "muted";
}

export function openBlockers(list: Blocker[]): Blocker[] {
  return list.filter((b) => b.status === "open");
}

/** Open first (oldest-first); then resolved (most-recently-resolved first). */
export function sortBlockers(list: Blocker[]): Blocker[] {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    if (a.status === "open") return a.created_at.localeCompare(b.created_at);
    return (b.resolved_at ?? "").localeCompare(a.resolved_at ?? "");
  });
}

function normalizeTicket(t: string): string {
  return t.trim().toLowerCase();
}

/** Normalized ticket → tooltip label, from OPEN blockers that carry a ticket. */
export function blockedTicketMap(list: Blocker[]): Map<string, string> {
  const open = openBlockers(list)
    .filter((b) => b.ticket_number && b.ticket_number.trim() !== "")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const byTicket = new Map<string, string[]>();
  for (const b of open) {
    const key = normalizeTicket(b.ticket_number as string);
    const arr = byTicket.get(key);
    if (arr) arr.push(b.reason);
    else byTicket.set(key, [b.reason]);
  }
  const out = new Map<string, string>();
  for (const [key, reasons] of byTicket) {
    const extra = reasons.length - 1;
    out.set(key, extra > 0 ? `${reasons[0]} (+${extra} more)` : reasons[0]);
  }
  return out;
}

/** The tooltip for an entry whose ticket is blocked, or null. */
export function entryBlockReason(entry: Entry, map: Map<string, string>): string | null {
  if (!entry.ticket_number || entry.ticket_number.trim() === "") return null;
  return map.get(normalizeTicket(entry.ticket_number)) ?? null;
}

/** Seed a blocker form from a task entry (raise-from-task). */
export function seedFromEntry(entry: Entry): BlockerInput {
  return {
    reason: `Blocked: ${entry.task}`,
    waiting_on: null,
    ticket_number: entry.ticket_number,
    ticket_url: entry.ticket_url,
  };
}
