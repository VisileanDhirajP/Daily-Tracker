import { buildCsv } from "../csv";
import type { Entry } from "../../types";

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

  it("renders null ticket fields as empty", () => {
    const csv = buildCsv([entry({ ticket_number: null, ticket_url: null })]);
    const row = csv.trim().split("\r\n")[1];
    expect(row).toContain("dev,,,");
  });
});
