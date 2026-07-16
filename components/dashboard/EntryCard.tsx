"use client";

import { Clock, Pencil, Trash2 } from "lucide-react";
import type { Entry } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatDuration } from "@/lib/format/time";
import { CategoryChip } from "./CategoryChip";
import { StatusChip } from "./StatusChip";
import { TicketPill } from "./TicketPill";

interface EntryCardProps {
  entry: Entry;
  editing: boolean;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

export function EntryCard({ entry, editing, onEdit, onDelete }: EntryCardProps) {
  const meta = CATEGORY_MAP[entry.category];

  return (
    <div
      data-test-id="entry-card"
      className={`group relative overflow-hidden rounded-2xl border bg-card p-4 pl-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-cardHover ${
        editing
          ? "border-blue-brand ring-2 ring-blue-brand/25"
          : "border-hairline hover:border-blue-light"
      }`}
    >
      {/* Category colour rail — the card's category encoded as a visual anchor. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: meta.color }}
      />

      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-relaxed text-ink">{entry.task}</p>
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            data-test-id="entry-edit-button"
            aria-label="Edit entry"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-brand/10 hover:text-blue-brand"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry)}
            data-test-id="entry-delete-button"
            aria-label="Delete entry"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-orange-brand/10 hover:text-orange-brand"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CategoryChip category={entry.category} />
        {entry.minutes > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
            <Clock size={12} />
            {formatDuration(entry.minutes)}
          </span>
        )}
        <TicketPill ticketNumber={entry.ticket_number} ticketUrl={entry.ticket_url} />
        <StatusChip status={entry.status} />
      </div>
    </div>
  );
}
