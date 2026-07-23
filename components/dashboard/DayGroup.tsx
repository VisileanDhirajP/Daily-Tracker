"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import type { Entry } from "@/lib/types";
import type { DayGroup as DayGroupModel } from "@/lib/entries";
import { formatDuration } from "@/lib/format/time";
import { formatLongDate, relativeLabel } from "@/lib/format/date";
import { buildDaySummary } from "@/lib/export/daySummary";
import { copyToClipboard } from "@/lib/export/download";
import { useToast } from "@/components/ui/ToastProvider";
import { Tooltip } from "@/components/ui/tooltip";
import { EntryCard } from "./EntryCard";
import { EntryRow } from "./EntryRow";

interface DayGroupProps {
  group: DayGroupModel;
  view: "cards" | "compact";
  editingId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (entry: Entry) => void;
  onStatusChange: (entry: Entry, status: import("@/lib/types").EntryStatus) => void;
  onEdit: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  /** Drop an entry (by id) onto this day to re-date it. */
  onMoveToDate?: (id: string, date: string) => void;
}

export function DayGroup({
  group,
  view,
  editingId,
  selectedIds,
  onToggleSelect,
  onStatusChange,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveToDate,
}: DayGroupProps) {
  const { toast } = useToast();
  const rel = relativeLabel(group.date);
  const [dropActive, setDropActive] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    const id = e.dataTransfer.getData("text/plain");
    if (id) onMoveToDate?.(id, group.date);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(buildDaySummary(group.date, group.entries));
    toast(
      ok ? "EOD summary copied — paste it into Slack." : "Couldn't copy to clipboard.",
      ok ? "success" : "error",
    );
  };

  return (
    <section
      className={`group/day mb-6 rounded-2xl transition-colors ${
        dropActive ? "bg-blue-brand/5 ring-2 ring-blue-brand/40 ring-offset-4 ring-offset-canvas" : ""
      }`}
      data-test-id="day-group"
      onDragOver={
        onMoveToDate
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (!dropActive) setDropActive(true);
            }
          : undefined
      }
      onDragLeave={
        onMoveToDate
          ? (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
            }
          : undefined
      }
      onDrop={onMoveToDate ? handleDrop : undefined}
    >
      {/* flip-id lets the header glide with its rows on view-mode morphs. */}
      <div
        data-flip-id={`day-${group.date}`}
        className="mb-3 flex items-center justify-between gap-2 border-b border-hairline pb-2"
      >
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h3 className="text-sm font-bold text-navy">{formatLongDate(group.date)}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              rel === "Today"
                ? "bg-gold/25 text-[#8f6606]"
                : "bg-blue-brand/10 text-blue-brand"
            }`}
          >
            {rel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-xs font-medium text-muted">
            {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
            <span className="px-1 text-hairline">·</span>
            {formatDuration(group.totalMinutes)}
          </span>
          <Tooltip label="Copy day summary">
            <button
              type="button"
              onClick={handleCopy}
              data-test-id="copy-day-button"
              aria-label={`Copy ${formatLongDate(group.date)} summary`}
              className="rounded-lg p-1.5 text-muted transition-opacity hover:bg-canvas hover:text-blue-brand sm:opacity-0 sm:group-hover/day:opacity-100"
            >
              <Copy size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={`flex flex-col ${view === "compact" ? "gap-1.5" : "gap-2.5"}`}>
        {group.entries.map((entry) => {
          const shared = {
            entry,
            editing: editingId === entry.id,
            selected: selectedIds.has(entry.id),
            onToggleSelect,
            onStatusChange,
            onEdit,
            onDuplicate,
            onDelete,
          };
          return view === "compact" ? (
            <EntryRow key={entry.id} {...shared} />
          ) : (
            <EntryCard key={entry.id} {...shared} />
          );
        })}
      </div>
    </section>
  );
}
