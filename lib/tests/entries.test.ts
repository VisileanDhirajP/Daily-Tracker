import {
  groupByDay,
  sortEntries,
  filterEntries,
  isFilterActive,
  inRange,
  uniqueDates,
  usedCategories,
  entriesOn,
  lastLoggedDayBefore,
  EMPTY_FILTERS,
} from "../entries";
import type { Entry } from "../types";

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: "u1",
    entry_date: "2026-07-16",
    task: "Task",
    category: "dev",
    ticket_number: null,
    ticket_url: null,
    minutes: 30,
    status: "done",
    created_at: "2026-07-16T09:00:00.000Z",
    updated_at: "2026-07-16T09:00:00.000Z",
    ...overrides,
  };
}

describe("entries derivation", () => {
  const data: Entry[] = [
    entry({ id: "a", entry_date: "2026-07-14", created_at: "...09:00", minutes: 60 }),
    entry({ id: "b", entry_date: "2026-07-16", created_at: "2026-07-16T08:00:00Z", minutes: 30 }),
    entry({ id: "c", entry_date: "2026-07-16", created_at: "2026-07-16T10:00:00Z", minutes: 90, category: "meeting" }),
  ];

  it("sorts newest day first, newest-within-day first", () => {
    const sorted = sortEntries(data);
    expect(sorted.map((e) => e.id)).toEqual(["c", "b", "a"]);
  });

  it("groups by day with per-day totals", () => {
    const groups = groupByDay(data);
    expect(groups.map((g) => g.date)).toEqual(["2026-07-16", "2026-07-14"]);
    expect(groups[0].totalMinutes).toBe(120);
    expect(groups[1].totalMinutes).toBe(60);
  });

  it("lists unique dates and used categories", () => {
    expect(uniqueDates(data)).toEqual(["2026-07-16", "2026-07-14"]);
    expect(usedCategories(data).sort()).toEqual(["dev", "meeting"]);
  });

  it("filters by date, category and ticket substring", () => {
    const withTicket = entry({ id: "t", ticket_number: "VS-8238" });
    const all = [...data, withTicket];
    expect(filterEntries(all, { ...EMPTY_FILTERS, date: "2026-07-14" }).map((e) => e.id)).toEqual(["a"]);
    expect(filterEntries(all, { ...EMPTY_FILTERS, category: "meeting" }).map((e) => e.id)).toEqual(["c"]);
    expect(filterEntries(all, { ...EMPTY_FILTERS, ticket: "8238" }).map((e) => e.id)).toEqual(["t"]);
  });

  it("filters by status", () => {
    const all = [
      entry({ id: "p", status: "progress" }),
      entry({ id: "h", status: "hold" }),
      entry({ id: "d", status: "done" }),
    ];
    expect(filterEntries(all, { ...EMPTY_FILTERS, status: "hold" }).map((e) => e.id)).toEqual(["h"]);
    expect(filterEntries(all, { ...EMPTY_FILTERS, status: "all" })).toHaveLength(3);
  });

  it("searches task text (case-insensitive)", () => {
    const all = [
      entry({ id: "x", task: "Refactored the AXIOS interceptor" }),
      entry({ id: "y", task: "Standup" }),
    ];
    expect(filterEntries(all, { ...EMPTY_FILTERS, search: "axios" }).map((e) => e.id)).toEqual(["x"]);
  });

  it("detects active filters", () => {
    expect(isFilterActive(EMPTY_FILTERS)).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTERS, ticket: "x" })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTERS, status: "done" })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTERS, search: "hi" })).toBe(true);
  });

  it("scopes entries to an inclusive date range", () => {
    const scoped = inRange(data, "2026-07-15", "2026-07-16");
    expect(scoped.map((e) => e.id).sort()).toEqual(["b", "c"]);
  });

  it("returns entries logged on a given day", () => {
    expect(entriesOn(data, "2026-07-16").map((e) => e.id).sort()).toEqual(["b", "c"]);
    expect(entriesOn(data, "2026-07-15")).toEqual([]);
  });

  describe("lastLoggedDayBefore", () => {
    it("finds the most recent earlier day that has entries", () => {
      expect(lastLoggedDayBefore(data, "2026-07-17")).toBe("2026-07-16");
      expect(lastLoggedDayBefore(data, "2026-07-16")).toBe("2026-07-14"); // strictly before
      expect(lastLoggedDayBefore(data, "2026-07-15")).toBe("2026-07-14");
    });

    it("returns null when nothing is earlier", () => {
      expect(lastLoggedDayBefore(data, "2026-07-14")).toBeNull();
      expect(lastLoggedDayBefore([], "2026-07-20")).toBeNull();
    });
  });
});
