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
  view: "cards" | "compact";
  editingId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (entry: Entry) => void;
  onStatusChange: (entry: Entry, status: import("@/lib/types").EntryStatus) => void;
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
  view,
  editingId,
  selectedIds,
  onToggleSelect,
  onStatusChange,
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
    if (filtering) {
      return (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline p-10 text-center"
          data-test-id="entries-empty"
        >
          <SearchX size={32} className="text-blue-light" />
          <p className="text-sm font-medium text-ink">No entries match these filters</p>
          <p className="max-w-xs text-sm text-muted">
            Try clearing a filter to see more of your history.
          </p>
        </div>
      );
    }
    // First-run: teach the quick-add syntax and the palette shortcut.
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline p-10 text-center"
        data-test-id="entries-empty"
      >
        <ClipboardList size={32} className="text-blue-light" />
        <p className="text-sm font-medium text-ink">Nothing logged yet</p>
        <p className="max-w-sm text-sm text-muted">
          Log your first task from the quick bar above — try{" "}
          <code className="rounded bg-canvas px-1.5 py-0.5 text-xs text-ink">
            1h dev VS-1234 fixed the leak
          </code>{" "}
          and press Enter.
        </p>
        <p className="text-xs text-muted">
          Tip: press{" "}
          <kbd className="rounded border border-hairline px-1 py-0.5 text-[10px]">⌘K</kbd> anywhere
          to search or log.
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
          view={view}
          editingId={editingId}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
