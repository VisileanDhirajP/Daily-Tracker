"use client";

import { Pencil, Trash2, CopyPlus, GripVertical } from "lucide-react";
import type { Entry, EntryStatus } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatDuration } from "@/lib/format/time";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { CategoryChip } from "./CategoryChip";
import { StatusControl } from "./StatusControl";
import { TicketPill } from "./TicketPill";

interface EntryRowProps {
  entry: Entry;
  editing: boolean;
  selected: boolean;
  onToggleSelect: (entry: Entry) => void;
  onStatusChange: (entry: Entry, status: EntryStatus) => void;
  onEdit: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

/** Dense, single-line entry row for the Compact view. */
export function EntryRow({
  entry,
  editing,
  selected,
  onToggleSelect,
  onStatusChange,
  onEdit,
  onDuplicate,
  onDelete,
}: EntryRowProps) {
  const meta = CATEGORY_MAP[entry.category];

  return (
    <div
      data-test-id="entry-card"
      data-flip-id={entry.id}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border py-2 pl-4 pr-3 transition-colors ${
        selected
          ? "border-blue-brand bg-blue-brand/5 ring-1 ring-blue-brand/40"
          : editing
            ? "border-blue-brand ring-1 ring-blue-brand/25"
            : "border-hairline bg-card hover:border-blue-light hover:bg-blue-brand/[0.04]"
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: meta.color }}
      />

      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", entry.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        data-test-id="entry-drag-handle"
        aria-label="Drag to move to another day"
        title="Drag to another day"
        className="-ml-1 hidden shrink-0 cursor-grab text-muted/40 transition-colors hover:text-blue-brand active:cursor-grabbing sm:block"
      >
        <GripVertical size={14} />
      </span>

      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelect(entry)}
        data-test-id="entry-select"
        aria-label={selected ? "Deselect entry" : "Select entry"}
      />

      <Tooltip label={entry.task} align="start">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {entry.task}
        </p>
      </Tooltip>

      <div className="hidden shrink-0 items-center sm:flex">
        <CategoryChip category={entry.category} />
      </div>

      <span className="hidden w-14 shrink-0 text-right text-xs text-muted md:block">
        {entry.minutes > 0 ? formatDuration(entry.minutes) : "—"}
      </span>

      <div className="hidden max-w-[10rem] shrink-0 lg:block">
        <TicketPill ticketNumber={entry.ticket_number} ticketUrl={entry.ticket_url} />
      </div>

      <div className="shrink-0">
        <StatusControl status={entry.status} onChange={(s) => onStatusChange(entry, s)} />
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Tooltip label="Edit entry">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            data-test-id="entry-edit-button"
            aria-label="Edit entry"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-brand/10 hover:text-blue-brand"
          >
            <Pencil size={14} />
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
            <CopyPlus size={14} />
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
            <Trash2 size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
