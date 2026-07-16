import { buildDaySummary } from "../daySummary";
import type { Entry } from "../../types";

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: "u1",
    entry_date: "2026-07-16",
    task: "Did a thing",
    category: "dev",
    ticket_number: null,
    ticket_url: null,
    minutes: 60,
    status: "progress",
    created_at: "2026-07-16T09:00:00.000Z",
    updated_at: "2026-07-16T09:00:00.000Z",
    ...overrides,
  };
}

describe("buildDaySummary (Slack EOD)", () => {
  it("starts with a bold dated header (no emoji / no EOD label)", () => {
    const out = buildDaySummary("2026-07-16", [entry({})]);
    expect(out.split("\n")[0]).toBe("*Thursday, 16 Jul 2026*");
  });

  it("formats a bullet as: task - Category · time", () => {
    const out = buildDaySummary("2026-07-16", [
      entry({ task: "Daily stand-up", category: "meeting", minutes: 30 }),
    ]);
    expect(out).toContain("• Daily stand-up - Meeting · 30m");
  });

  it("bakes the URL into the ticket number as a markdown link", () => {
    const out = buildDaySummary("2026-07-16", [
      entry({ task: "Wired dashboard", ticket_number: "VS-8301", ticket_url: "https://x.com/1", minutes: 195 }),
    ]);
    expect(out).toContain("• Wired dashboard [VS-8301](https://x.com/1) - Development · 3h 15m");
  });

  it("shows a plain ticket number when there is no URL", () => {
    const out = buildDaySummary("2026-07-16", [
      entry({ task: "Task", ticket_number: "VS-2", ticket_url: null }),
    ]);
    expect(out).toContain("Task VS-2 -");
    expect(out).not.toContain("[VS-2]");
  });

  it("omits time when zero", () => {
    const out = buildDaySummary("2026-07-16", [
      entry({ task: "Standup", minutes: 0, category: "meeting" }),
    ]);
    expect(out).toContain("• Standup - Meeting");
    expect(out).not.toContain("Meeting ·");
  });

  it("does not include a status marker or total line", () => {
    const out = buildDaySummary("2026-07-16", [entry({ status: "hold" })]);
    expect(out).not.toContain("Total");
    expect(out).not.toMatch(/[✅🔄⏸️]/u);
  });
});
