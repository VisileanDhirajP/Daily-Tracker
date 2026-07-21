import {
  isOnTeam,
  teamEmployees,
  filterTeamFeed,
  teamTotalMinutes,
  groupTeamFeedByDay,
  teamByPerson,
} from "../team";
import type { TeamFeedRow } from "../types";

function row(over: Partial<TeamFeedRow> & { empId: string; empName: string }): TeamFeedRow {
  const { empId, empName, ...rest } = over;
  return {
    id: `${empId}-${rest.entry_date ?? "x"}-${Math.random()}`,
    user_id: empId,
    entry_date: "2026-07-16",
    task: "Task",
    category: "dev",
    ticket_number: null,
    ticket_url: null,
    minutes: 60,
    status: "done",
    created_at: "2026-07-16T09:00:00.000Z",
    updated_at: "2026-07-16T09:00:00.000Z",
    employee: { id: empId, full_name: empName, email: `${empId}@x.com` },
    ...rest,
  };
}

describe("isOnTeam", () => {
  it("matches case-insensitively and ignores surrounding space", () => {
    const emp = { manager_emails: ["Manager@Visilean.com", "  other@x.com "] };
    expect(isOnTeam(emp, "manager@visilean.com")).toBe(true);
    expect(isOnTeam(emp, "OTHER@X.COM")).toBe(true);
    expect(isOnTeam(emp, "nobody@x.com")).toBe(false);
  });

  it("is false for an empty manager email or no managers", () => {
    expect(isOnTeam({ manager_emails: ["a@x.com"] }, "")).toBe(false);
    expect(isOnTeam({ manager_emails: [] }, "a@x.com")).toBe(false);
  });
});

describe("teamEmployees", () => {
  it("returns distinct employees sorted by name", () => {
    const rows = [
      row({ empId: "u2", empName: "Zed" }),
      row({ empId: "u1", empName: "Alice" }),
      row({ empId: "u2", empName: "Zed" }),
    ];
    expect(teamEmployees(rows)).toEqual([
      { id: "u1", full_name: "Alice" },
      { id: "u2", full_name: "Zed" },
    ]);
  });
});

describe("filterTeamFeed", () => {
  const base = {
    employeeId: "all" as const,
    from: "2026-07-01",
    to: "2026-07-31",
    search: "",
    category: "all" as const,
    status: "all" as const,
  };
  const rows = [
    row({ empId: "u1", empName: "Alice", entry_date: "2026-07-10", category: "dev", status: "done", task: "Fix bug", ticket_number: "VS-1" }),
    row({ empId: "u2", empName: "Bob", entry_date: "2026-07-20", category: "meeting", status: "progress", task: "Standup" }),
    row({ empId: "u1", empName: "Alice", entry_date: "2026-06-30", category: "dev", status: "done", task: "Old work" }),
  ];

  it("scopes by employee", () => {
    expect(filterTeamFeed(rows, { ...base, employeeId: "u2" })).toHaveLength(1);
  });

  it("scopes by date range (inclusive)", () => {
    const r = filterTeamFeed(rows, { ...base, from: "2026-07-01", to: "2026-07-31" });
    expect(r.map((x) => x.entry_date)).toEqual(["2026-07-10", "2026-07-20"]); // June row excluded
  });

  it("filters by category and status", () => {
    expect(filterTeamFeed(rows, { ...base, category: "meeting" })).toHaveLength(1);
    expect(filterTeamFeed(rows, { ...base, status: "progress" })).toHaveLength(1);
  });

  it("search matches task, employee name, and ticket", () => {
    expect(filterTeamFeed(rows, { ...base, search: "bob" })).toHaveLength(1);
    expect(filterTeamFeed(rows, { ...base, search: "vs-1" })).toHaveLength(1);
    expect(filterTeamFeed(rows, { ...base, search: "standup" })).toHaveLength(1);
  });
});

describe("teamTotalMinutes", () => {
  it("sums minutes", () => {
    expect(
      teamTotalMinutes([
        row({ empId: "u1", empName: "A", minutes: 60 }),
        row({ empId: "u2", empName: "B", minutes: 30 }),
      ]),
    ).toBe(90);
  });
});

describe("teamByPerson", () => {
  it("aggregates per person (minutes, entries, done%) ranked by time", () => {
    const rows = [
      row({ empId: "u1", empName: "Alice", minutes: 60, status: "done" }),
      row({ empId: "u1", empName: "Alice", minutes: 30, status: "progress" }),
      row({ empId: "u2", empName: "Bob", minutes: 120, status: "done" }),
    ];
    const summary = teamByPerson(rows);
    expect(summary.map((p) => p.full_name)).toEqual(["Bob", "Alice"]); // 120 > 90
    const alice = summary.find((p) => p.id === "u1")!;
    expect(alice).toMatchObject({ minutes: 90, entries: 2, done: 1, donePct: 50 });
    const bob = summary.find((p) => p.id === "u2")!;
    expect(bob).toMatchObject({ minutes: 120, entries: 1, done: 1, donePct: 100 });
  });

  it("returns [] for an empty feed", () => {
    expect(teamByPerson([])).toEqual([]);
  });
});

describe("groupTeamFeedByDay", () => {
  it("groups by date newest-first with per-day totals", () => {
    const groups = groupTeamFeedByDay([
      row({ empId: "u1", empName: "A", entry_date: "2026-07-10", minutes: 60 }),
      row({ empId: "u2", empName: "B", entry_date: "2026-07-20", minutes: 30 }),
      row({ empId: "u3", empName: "C", entry_date: "2026-07-20", minutes: 45 }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-07-20", "2026-07-10"]);
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[0].totalMinutes).toBe(75);
  });
});
