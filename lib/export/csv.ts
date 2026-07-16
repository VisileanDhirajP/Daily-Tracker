import type { Entry } from "../types";
import { escapeCsv } from "../security/escape";
import { toHours } from "../format/time";

const HEADERS = [
  "date",
  "task",
  "category",
  "ticket_number",
  "ticket_url",
  "minutes",
  "hours",
  "status",
] as const;

/** Build an RFC-4180 CSV string for the given entries (dependency-free). */
export function buildCsv(entries: Entry[]): string {
  const rows: string[] = [HEADERS.join(",")];
  for (const e of entries) {
    rows.push(
      [
        escapeCsv(e.entry_date),
        escapeCsv(e.task),
        escapeCsv(e.category),
        escapeCsv(e.ticket_number ?? ""),
        escapeCsv(e.ticket_url ?? ""),
        escapeCsv(e.minutes),
        escapeCsv(toHours(e.minutes)),
        escapeCsv(e.status),
      ].join(","),
    );
  }
  // Leading BOM so Excel opens UTF-8 correctly.
  return "﻿" + rows.join("\r\n");
}
