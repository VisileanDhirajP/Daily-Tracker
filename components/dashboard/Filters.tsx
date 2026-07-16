"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { Category, Entry } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/constants";
import {
  EMPTY_FILTERS,
  isFilterActive,
  uniqueDates,
  usedCategories,
  type EntryFilters,
} from "@/lib/entries";
import { formatShortDate, relativeLabel } from "@/lib/format/date";
import { formatHours } from "@/lib/format/time";

interface FiltersProps {
  allEntries: Entry[];
  filtered: Entry[];
  filters: EntryFilters;
  onChange: (next: EntryFilters) => void;
}

export function Filters({ allEntries, filtered, filters, onChange }: FiltersProps) {
  const dates = useMemo(() => uniqueDates(allEntries), [allEntries]);
  const cats = useMemo(() => usedCategories(allEntries), [allEntries]);

  const active = isFilterActive(filters);
  const totalMinutes = filtered.reduce((a, e) => a + e.minutes, 0);
  const dayCount = new Set(filtered.map((e) => e.entry_date)).size;

  const selectClass =
    "rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          aria-label="Filter by date"
          data-test-id="filter-date"
          className={selectClass}
          value={filters.date}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
        >
          <option value="all">All dates</option>
          {dates.map((d) => (
            <option key={d} value={d}>
              {relativeLabel(d)} · {formatShortDate(d)}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by category"
          data-test-id="filter-category"
          className={selectClass}
          value={filters.category}
          onChange={(e) =>
            onChange({ ...filters, category: e.target.value as Category | "all" })
          }
        >
          <option value="all">All categories</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_MAP[c].label}
            </option>
          ))}
        </select>

        <input
          type="text"
          aria-label="Filter by ticket number"
          data-test-id="filter-ticket"
          className={selectClass}
          placeholder="Ticket #…"
          value={filters.ticket}
          onChange={(e) => onChange({ ...filters, ticket: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted" data-test-id="filter-count">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"} · {dayCount}{" "}
          {dayCount === 1 ? "day" : "days"} · {formatHours(totalMinutes)}
        </p>
        <button
          type="button"
          disabled={!active}
          onClick={() => onChange(EMPTY_FILTERS)}
          data-test-id="filter-clear"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-blue-brand hover:bg-blue-brand/10 disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent"
        >
          <X size={13} />
          Clear
        </button>
      </div>
    </div>
  );
}
