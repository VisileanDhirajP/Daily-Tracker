import {
  minutesByCategory,
  minutesByWeekday,
  countByStatus,
  percentChange,
} from "../insights";
import type { Entry } from "../types";

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: "u1",
    entry_date: "2026-07-16", // a Thursday
    task: "Task",
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

describe("insights", () => {
  it("sums minutes by category, most-time first", () => {
    const res = minutesByCategory([
      entry({ category: "dev", minutes: 60 }),
      entry({ category: "meeting", minutes: 120 }),
      entry({ category: "dev", minutes: 30 }),
    ]);
    expect(res).toEqual([
      { category: "meeting", minutes: 120 },
      { category: "dev", minutes: 90 },
    ]);
  });

  it("buckets minutes by weekday with Monday first", () => {
    const res = minutesByWeekday([
      entry({ entry_date: "2026-07-13", minutes: 60 }), // Monday
      entry({ entry_date: "2026-07-16", minutes: 30 }), // Thursday
      entry({ entry_date: "2026-07-19", minutes: 45 }), // Sunday
    ]);
    expect(res[0]).toBe(60); // Mon
    expect(res[3]).toBe(30); // Thu
    expect(res[6]).toBe(45); // Sun
  });

  it("counts entries by status", () => {
    const res = countByStatus([
      entry({ status: "done" }),
      entry({ status: "done" }),
      entry({ status: "progress" }),
      entry({ status: "hold" }),
    ]);
    expect(res).toEqual({ done: 2, progress: 1, hold: 1 });
  });

  it("computes percent change with base-zero handling", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(10, 0)).toBeNull();
  });
});
