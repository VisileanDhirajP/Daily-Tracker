"use client";

import { Clock, Pencil, Trash2, CopyPlus, GripVertical } from "lucide-react";
import type { Entry, EntryStatus } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatDuration } from "@/lib/format/time";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { CategoryChip } from "./CategoryChip";
import { StatusControl } from "./StatusControl";
import { TicketPill } from "./TicketPill";

interface EntryCardProps {
  entry: Entry;
  editing: boolean;
  selected: boolean;
  onToggleSelect: (entry: Entry) => void;
  onStatusChange: (entry: Entry, status: EntryStatus) => void;
  onEdit: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

export function EntryCard({
  entry,
  editing,
  selected,
  onToggleSelect,
  onStatusChange,
  onEdit,
  onDuplicate,
  onDelete,
}: EntryCardProps) {
  const meta = CATEGORY_MAP[entry.category];

  return (
    <div
      data-test-id="entry-card"
      data-flip-id={entry.id}
      className={`group relative overflow-hidden rounded-2xl border bg-card p-4 pl-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-cardHover ${
        selected
          ? "border-blue-brand ring-2 ring-blue-brand/40"
          : editing
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

      <div className="flex items-start gap-2.5">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", entry.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          data-test-id="entry-drag-handle"
          aria-label="Drag to move to another day"
          title="Drag to another day"
          className="mt-0.5 hidden shrink-0 cursor-grab text-muted/40 transition-colors hover:text-blue-brand active:cursor-grabbing sm:block"
        >
          <GripVertical size={15} />
        </span>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(entry)}
          data-test-id="entry-select"
          aria-label={selected ? "Deselect entry" : "Select entry"}
          className="mt-0.5"
        />

        <p className="flex-1 text-sm font-medium leading-relaxed text-ink">
          {entry.task}
        </p>

        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <Tooltip label="Edit entry">
            <button
              type="button"
              onClick={() => onEdit(entry)}
              data-test-id="entry-edit-button"
              aria-label="Edit entry"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-brand/10 hover:text-blue-brand"
            >
              <Pencil size={15} />
            </button>
          </Tooltip>
          <Tooltip label="Duplicate to another day">
            <button
              type="button"
              onClick={() => onDuplicate(entry)}
              data-test-id="entry-duplicate-button"
              aria-label="Duplicate entry"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-brand/10 hover:text-blue-brand"
            >
              <CopyPlus size={15} />
            </button>
          </Tooltip>
          <Tooltip label="Delete entry">
            <button
              type="button"
              onClick={() => onDelete(entry)}
              data-test-id="entry-delete-button"
              aria-label="Delete entry"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-orange-brand/10 hover:text-orange-brand"
            >
              <Trash2 size={15} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 pl-[30px]">
        <CategoryChip category={entry.category} />
        {entry.minutes > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
            <Clock size={12} />
            {formatDuration(entry.minutes)}
          </span>
        )}
        <TicketPill ticketNumber={entry.ticket_number} ticketUrl={entry.ticket_url} />
        <StatusControl
          status={entry.status}
          onChange={(s) => onStatusChange(entry, s)}
        />
      </div>
    </div>
  );
}
