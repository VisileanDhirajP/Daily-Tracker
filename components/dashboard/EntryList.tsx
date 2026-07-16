"use client";

import { useMemo } from "react";
import { ClipboardList, SearchX } from "lucide-react";
import type { Entry } from "@/lib/types";
import { groupByDay, type EntryFilters, isFilterActive } from "@/lib/entries";
import { DayGroup } from "./DayGroup";

interface EntryListProps {
  entries: Entry[]; // already filtered
  loading: boolean;
  error: string | null;
  filters: EntryFilters;
  editingId: string | null;
  onEdit: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-hairline bg-card p-4">
          <div className="h-3 w-2/3 rounded bg-canvas" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-24 rounded-full bg-canvas" />
            <div className="h-6 w-16 rounded-full bg-canvas" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EntryList({
  entries,
  loading,
  error,
  filters,
  editingId,
  onEdit,
  onDuplicate,
  onDelete,
}: EntryListProps) {
  const groups = useMemo(() => groupByDay(entries), [entries]);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="rounded-2xl border border-orange-brand/30 bg-orange-brand/5 p-6 text-center">
        <p className="text-sm font-medium text-orange-brand">Something went wrong</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (groups.length === 0) {
    const filtering = isFilterActive(filters);
    const Icon = filtering ? SearchX : ClipboardList;
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline p-10 text-center"
        data-test-id="entries-empty"
      >
        <Icon size={32} className="text-blue-light" />
        <p className="text-sm font-medium text-ink">
          {filtering ? "No entries match these filters" : "Nothing logged yet"}
        </p>
        <p className="max-w-xs text-sm text-muted">
          {filtering
            ? "Try clearing a filter to see more of your history."
            : "Hit the Add entry button to log your first task and start your streak."}
        </p>
      </div>
    );
  }

  return (
    <div data-test-id="entry-list">
      {groups.map((g) => (
        <DayGroup
          key={g.date}
          group={g}
          editingId={editingId}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
