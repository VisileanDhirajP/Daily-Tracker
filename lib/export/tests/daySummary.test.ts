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
  it("starts with a bold dated header", () => {
    const out = buildDaySummary("2026-07-16", [entry({})]);
    expect(out.startsWith("*🗓️ EOD — Thursday, 16 Jul 2026*")).toBe(true);
  });

  it("uses a status emoji per entry", () => {
    const out = buildDaySummary("2026-07-16", [
      entry({ task: "A", status: "done" }),
      entry({ task: "B", status: "progress" }),
      entry({ task: "C", status: "hold" }),
    ]);
    expect(out).toContain("✅ A");
    expect(out).toContain("🔄 B");
    expect(out).toContain("⏸️ C");
  });

  it("renders a valid ticket URL as a Slack link and a bare number as plain", () => {
    const linked = buildDaySummary("2026-07-16", [
      entry({ ticket_number: "VS-1", ticket_url: "https://x.com/1" }),
    ]);
    expect(linked).toContain("(<https://x.com/1|VS-1>)");

    const plain = buildDaySummary("2026-07-16", [
      entry({ ticket_number: "VS-2", ticket_url: null }),
    ]);
    expect(plain).toContain("(VS-2)");
    expect(plain).not.toContain("<");
  });

  it("ends with a bold total line", () => {
    const out = buildDaySummary("2026-07-16", [
      entry({ minutes: 60 }),
      entry({ minutes: 30 }),
    ]);
    expect(out).toContain("*Total:* 1h 30m · 2 entries");
  });

  it("omits per-entry duration when zero (category only)", () => {
    const out = buildDaySummary("2026-07-16", [
      entry({ task: "Standup", minutes: 0, category: "meeting", status: "progress" }),
    ]);
    expect(out).toContain("• 🔄 Standup — _Meeting_");
  });
});
