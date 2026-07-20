import { buildCsv, buildTeamCsv } from "../csv";
import type { Entry, TeamFeedRow } from "../../types";

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: "1",
    user_id: "u1",
    entry_date: "2026-07-16",
    task: "Did a thing",
    category: "dev",
    ticket_number: "VS-1",
    ticket_url: "https://x.com/1",
    minutes: 135,
    status: "done",
    created_at: "2026-07-16T09:00:00.000Z",
    updated_at: "2026-07-16T09:00:00.000Z",
    ...overrides,
  };
}

describe("buildCsv", () => {
  it("emits a BOM + header row", () => {
    const csv = buildCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain(
      "date,task,category,ticket_number,ticket_url,minutes,hours,status",
    );
  });

  it("writes minutes and decimal hours", () => {
    const csv = buildCsv([entry({ minutes: 135 })]);
    const row = csv.trim().split("\r\n")[1];
    expect(row).toContain(",135,2.25,done");
  });

  it("escapes commas, quotes and newlines per RFC 4180", () => {
    const csv = buildCsv([
      entry({ task: 'Fixed "bug", urgently\nsecond line' }),
    ]);
    expect(csv).toContain('"Fixed ""bug"", urgently\nsecond line"');
  });

  it("neutralises formula-injection by prefixing risky leading chars", () => {
    // A task starting with = / + / - / @ must not be evaluated as a formula
    // when the CSV is opened in a spreadsheet — prefix it with an apostrophe.
    const csv = buildCsv([entry({ task: "=SUM(A1:A9)" })]);
    expect(csv).toContain('"\'=SUM(A1:A9)"');

    const plus = buildCsv([entry({ task: "+1 more" })]);
    expect(plus).toContain('"\'+1 more"');

    // A benign value is left untouched (no spurious quoting/prefix).
    const safe = buildCsv([entry({ task: "Wrote docs" })]);
    expect(safe).toContain(",Wrote docs,");
  });

  it("renders null ticket fields as empty", () => {
    const csv = buildCsv([entry({ ticket_number: null, ticket_url: null })]);
    const row = csv.trim().split("\r\n")[1];
    expect(row).toContain("dev,,,");
  });
});

describe("buildTeamCsv", () => {
  const teamRow = (over: Partial<TeamFeedRow> = {}): TeamFeedRow => ({
    ...entry({}),
    employee: { id: "u1", full_name: "Alex Kim", email: "alex@x.com" },
    ...over,
  });

  it("prefixes employee name + email columns", () => {
    const csv = buildTeamCsv([teamRow()]);
    expect(csv).toContain(
      "employee,employee_email,date,task,category,ticket_number,ticket_url,minutes,hours,status",
    );
    const row = csv.trim().split("\r\n")[1];
    expect(row.startsWith("Alex Kim,alex@x.com,2026-07-16,")).toBe(true);
  });

  it("still escapes the employee name (formula guard applies)", () => {
    const csv = buildTeamCsv([
      teamRow({ employee: { id: "u2", full_name: "=cmd()", email: "e@x.com" } }),
    ]);
    expect(csv).toContain('"\'=cmd()"');
  });
});
