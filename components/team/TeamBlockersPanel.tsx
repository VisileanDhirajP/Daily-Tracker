"use client";

import { AlertTriangle, User } from "lucide-react";
import type { TeamBlockerRow } from "@/lib/types";
import { ageLabel, ageTone, blockerAgeDays, type AgeTone } from "@/lib/blockers";
import { TicketPill } from "@/components/dashboard/TicketPill";

const TONE: Record<AgeTone, { bg: string; fg: string }> = {
  muted: { bg: "#eef1f5", fg: "#4a5666" },
  warn: { bg: "#fbf1d5", fg: "#8f6606" },
  urgent: { bg: "#fdefe4", fg: "#bd5a19" },
};

/** Read-only summary of the team's open blockers (oldest-first). */
export function TeamBlockersPanel({ rows }: { rows: TeamBlockerRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="card mt-6 p-4" data-test-id="team-blockers-panel">
      <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <AlertTriangle size={13} className="text-orange-brand" />
        Team blockers · {rows.length} open
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const days = blockerAgeDays(r);
          const tone = TONE[ageTone(days)];
          return (
            <li
              key={r.id}
              data-test-id="team-blocker-item"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline p-2.5"
            >
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy">
                <User size={11} /> {r.employee.full_name || r.employee.email || "Unknown"}
              </span>
              <span className="min-w-0 flex-1 text-sm text-ink">{r.reason}</span>
              {r.waiting_on && (
                <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas px-2 py-0.5 text-[11px] text-muted">
                  waiting on {r.waiting_on}
                </span>
              )}
              <TicketPill ticketNumber={r.ticket_number} ticketUrl={r.ticket_url} />
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: tone.bg, color: tone.fg }}
                title={`Blocked ${ageLabel(days)}`}
              >
                {ageLabel(days)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
