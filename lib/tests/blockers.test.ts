import type { Blocker, Entry } from "../types";
import {
  toBlockerInput,
  blockerAgeDays,
  ageLabel,
  ageTone,
  openBlockers,
  sortBlockers,
  blockedTicketMap,
  entryBlockReason,
  seedFromEntry,
} from "../blockers";

function blocker(over: Partial<Blocker> = {}): Blocker {
  return {
    id: "b1",
    user_id: "u1",
    reason: "Waiting on review",
    waiting_on: null,
    ticket_number: null,
    ticket_url: null,
    status: "open",
    created_at: "2026-07-20T09:00:00.000Z",
    resolved_at: null,
    updated_at: "2026-07-20T09:00:00.000Z",
    ...over,
  };
}

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    user_id: "u1",
    entry_date: "2026-07-24",
    task: "Ship the thing",
    category: "dev",
    ticket_number: "VS-1234",
    ticket_url: null,
    minutes: 60,
    status: "progress",
    created_at: "2026-07-24T09:00:00.000Z",
    updated_at: "2026-07-24T09:00:00.000Z",
    ...over,
  };
}

const NOW = new Date("2026-07-24T09:00:00.000Z");

describe("blockers helpers", () => {
  it("computes whole-day age from created_at, floored, never negative", () => {
    expect(blockerAgeDays(blocker({ created_at: "2026-07-24T08:00:00.000Z" }), NOW)).toBe(0);
    expect(blockerAgeDays(blocker({ created_at: "2026-07-20T09:00:00.000Z" }), NOW)).toBe(4);
    expect(blockerAgeDays(blocker({ created_at: "2026-07-30T09:00:00.000Z" }), NOW)).toBe(0);
  });

  it("labels and tones age by threshold", () => {
    expect(ageLabel(0)).toBe("today");
    expect(ageLabel(4)).toBe("4d");
    expect(ageTone(1)).toBe("muted");
    expect(ageTone(2)).toBe("warn");
    expect(ageTone(5)).toBe("urgent");
  });

  it("filters open blockers", () => {
    const list = [blocker({ id: "a" }), blocker({ id: "b", status: "resolved" })];
    expect(openBlockers(list).map((b) => b.id)).toEqual(["a"]);
  });

  it("sorts open-first then oldest-first; resolved by most-recent resolve", () => {
    const list = [
      blocker({ id: "new-open", created_at: "2026-07-23T09:00:00.000Z" }),
      blocker({ id: "old-open", created_at: "2026-07-19T09:00:00.000Z" }),
      blocker({ id: "res-old", status: "resolved", resolved_at: "2026-07-21T09:00:00.000Z" }),
      blocker({ id: "res-new", status: "resolved", resolved_at: "2026-07-23T09:00:00.000Z" }),
    ];
    expect(sortBlockers(list).map((b) => b.id)).toEqual([
      "old-open",
      "new-open",
      "res-new",
      "res-old",
    ]);
  });

  it("maps only OPEN, ticketed blockers by normalized ticket, aggregating dupes", () => {
    const map = blockedTicketMap([
      blocker({ id: "1", ticket_number: " vs-1234 ", reason: "First", created_at: "2026-07-19T00:00:00.000Z" }),
      blocker({ id: "2", ticket_number: "VS-1234", reason: "Second", created_at: "2026-07-20T00:00:00.000Z" }),
      blocker({ id: "3", ticket_number: "VS-9", reason: "Solo", status: "resolved" }),
      blocker({ id: "4", ticket_number: null, reason: "No ticket" }),
    ]);
    expect(map.get("vs-1234")).toBe("First (+1 more)");
    expect(map.has("vs-9")).toBe(false); // resolved excluded
    expect(map.size).toBe(1);
  });

  it("resolves an entry's block reason case-insensitively", () => {
    const map = blockedTicketMap([blocker({ ticket_number: "VS-1234", reason: "Waiting" })]);
    expect(entryBlockReason(entry({ ticket_number: "vs-1234" }), map)).toBe("Waiting");
    expect(entryBlockReason(entry({ ticket_number: "VS-0000" }), map)).toBeNull();
    expect(entryBlockReason(entry({ ticket_number: null }), map)).toBeNull();
  });

  it("seeds a blocker input from an entry", () => {
    expect(seedFromEntry(entry({ task: "Fix login", ticket_number: "VS-5", ticket_url: "https://x" }))).toEqual({
      reason: "Blocked: Fix login",
      waiting_on: null,
      ticket_number: "VS-5",
      ticket_url: "https://x",
    });
  });

  it("extracts a blocker input", () => {
    expect(toBlockerInput(blocker({ reason: "R", waiting_on: "Alex", ticket_number: "VS-1", ticket_url: null }))).toEqual({
      reason: "R",
      waiting_on: "Alex",
      ticket_number: "VS-1",
      ticket_url: null,
    });
  });
});
