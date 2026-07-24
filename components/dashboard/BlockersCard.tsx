"use client";

import { useState } from "react";
import { AlertTriangle, Plus, Check, Pencil, Trash2, RotateCcw, ChevronDown, User } from "lucide-react";
import type { Blocker } from "@/lib/types";
import { ageLabel, ageTone, blockerAgeDays, openBlockers, sortBlockers, type AgeTone } from "@/lib/blockers";
import { Tooltip } from "@/components/ui/tooltip";
import { TicketPill } from "./TicketPill";

interface BlockersCardProps {
  blockers: Blocker[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (b: Blocker) => void;
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (b: Blocker) => void;
}

const TONE: Record<AgeTone, { bg: string; fg: string }> = {
  muted: { bg: "#eef1f5", fg: "#4a5666" },
  warn: { bg: "#fbf1d5", fg: "#8f6606" },
  urgent: { bg: "#fdefe4", fg: "#bd5a19" },
};

function AgeBadge({ b }: { b: Blocker }) {
  const days = blockerAgeDays(b);
  const tone = TONE[ageTone(days)];
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
      title={`Blocked ${ageLabel(days)}`}
    >
      {ageLabel(days)}
    </span>
  );
}

export function BlockersCard({ blockers, loading, onAdd, onEdit, onResolve, onReopen, onDelete }: BlockersCardProps) {
  const [showResolved, setShowResolved] = useState(false);
  const open = sortBlockers(openBlockers(blockers));
  const resolvedAll = blockers.filter((b) => b.status === "resolved");
  const resolved = [...resolvedAll]
    .sort((a, b) => (b.resolved_at ?? "").localeCompare(a.resolved_at ?? ""))
    .slice(0, 5);

  return (
    <div className="card p-4" data-test-id="blockers-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <AlertTriangle size={13} className="text-orange-brand" />
          Blockers{open.length > 0 ? ` · ${open.length} open` : ""}
        </span>
        <button
          type="button"
          onClick={onAdd}
          data-test-id="blockers-add"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-brand hover:underline"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-canvas" />
          ))}
        </div>
      ) : open.length === 0 ? (
        <p className="rounded-xl bg-canvas px-3 py-4 text-center text-xs text-muted">
          Nothing blocking you 🎉
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {open.map((b) => (
            <li
              key={b.id}
              data-test-id={`blocker-item-${b.id}`}
              className="group rounded-xl border border-hairline p-2.5"
            >
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-ink">{b.reason}</p>
                <AgeBadge b={b} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {b.waiting_on && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas px-2 py-0.5 text-[11px] text-muted">
                    <User size={10} /> {b.waiting_on}
                  </span>
                )}
                <TicketPill ticketNumber={b.ticket_number} ticketUrl={b.ticket_url} />
                <div className="ml-auto flex items-center gap-0.5">
                  <Tooltip label="Mark resolved">
                    <button
                      type="button"
                      onClick={() => onResolve(b.id)}
                      data-test-id="blocker-resolve"
                      aria-label="Mark blocker resolved"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-brand/10 hover:text-[#1f8a4c]"
                    >
                      <Check size={14} />
                    </button>
                  </Tooltip>
                  <Tooltip label="Edit blocker">
                    <button
                      type="button"
                      onClick={() => onEdit(b)}
                      data-test-id="blocker-edit"
                      aria-label="Edit blocker"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-brand/10 hover:text-blue-brand"
                    >
                      <Pencil size={14} />
                    </button>
                  </Tooltip>
                  <Tooltip label="Delete blocker">
                    <button
                      type="button"
                      onClick={() => onDelete(b)}
                      data-test-id="blocker-delete"
                      aria-label="Delete blocker"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-orange-brand/10 hover:text-orange-brand"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-2">
          <button
            type="button"
            onClick={() => setShowResolved((v) => !v)}
            data-test-id="blockers-show-resolved"
            aria-expanded={showResolved}
            className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted hover:text-navy"
          >
            Resolved ({resolvedAll.length})
            <ChevronDown size={13} className={showResolved ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {showResolved && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {resolved.map((b) => (
                <li key={b.id} className="flex items-center gap-2 rounded-lg bg-canvas px-2.5 py-1.5" data-test-id={`blocker-item-${b.id}`}>
                  <Check size={12} className="shrink-0 text-[#1f8a4c]" />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted line-through">{b.reason}</span>
                  <Tooltip label="Reopen">
                    <button
                      type="button"
                      onClick={() => onReopen(b.id)}
                      data-test-id="blocker-reopen"
                      aria-label="Reopen blocker"
                      className="rounded-lg p-1 text-muted transition-colors hover:text-blue-brand"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </Tooltip>
                  <Tooltip label="Delete blocker">
                    <button
                      type="button"
                      onClick={() => onDelete(b)}
                      data-test-id="blocker-delete"
                      aria-label="Delete blocker"
                      className="rounded-lg p-1 text-muted transition-colors hover:text-blue-brand"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Tooltip>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
