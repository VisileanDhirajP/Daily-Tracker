"use client";

import type { ReportModel } from "./report";
import { toHours } from "../format/time";
import { formatShortDate } from "../format/date";
import { APP_NAME } from "../constants";

/** Short plain-text body summarising a report, for email/mailto. */
export function buildReportSummary(model: ReportModel): string {
  const { meta } = model;
  const lines = [
    `${APP_NAME} report for ${meta.userName}`,
    `${meta.rangeLabel}: ${formatShortDate(meta.from)} – ${formatShortDate(meta.to)}`,
    "",
    `Total: ${toHours(model.totalMinutes)}h across ${model.entryCount} ${
      model.entryCount === 1 ? "entry" : "entries"
    } over ${model.dayCount} ${model.dayCount === 1 ? "day" : "days"}.`,
    "",
  ];
  for (const g of model.groups) {
    lines.push(`${formatShortDate(g.date)} — ${toHours(g.totalMinutes)}h`);
    for (const e of g.entries) {
      const ticket = e.ticket_number ? `[${e.ticket_number}] ` : "";
      const wip = e.status === "progress" ? " (in progress)" : "";
      lines.push(`  • ${ticket}${e.task}${wip}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Build a `mailto:` URL with prefilled recipient, subject and body. */
export function buildMailto(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}

export interface SendResult {
  sent: boolean;
  reason?: "not-configured" | "error";
  message?: string;
}

/**
 * Ask the server to email the report. The server relays via Resend only if it's
 * configured; otherwise it reports `not-configured` and the caller falls back to
 * a download + mailto draft.
 */
export async function sendReportEmail(params: {
  to: string;
  subject: string;
  summary: string;
  pdfBase64: string;
  filename: string;
}): Promise<SendResult> {
  try {
    const res = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (res.status === 501) return { sent: false, reason: "not-configured" };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { sent: false, reason: "error", message: text || `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    return {
      sent: false,
      reason: "error",
      message: e instanceof Error ? e.message : "Network error",
    };
  }
}
