"use client";

import { useEffect, useMemo } from "react";
import { X, Search } from "lucide-react";
import type { Category, Entry, EntryStatus } from "@/lib/types";
import { CATEGORY_MAP, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import {
  EMPTY_FILTERS,
  isFilterActive,
  uniqueDates,
  usedCategories,
  type EntryFilters,
} from "@/lib/entries";
import { formatShortDate, relativeLabel } from "@/lib/format/date";
import { formatHours } from "@/lib/format/time";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FiltersProps {
  allEntries: Entry[];
  filtered: Entry[];
  filters: EntryFilters;
  onChange: (next: EntryFilters) => void;
  /** Stack the controls for a narrow container (e.g. the dashboard side rail). */
  dense?: boolean;
}

export function Filters({ allEntries, filtered, filters, onChange, dense = false }: FiltersProps) {
  const dates = useMemo(() => uniqueDates(allEntries), [allEntries]);
  const cats = useMemo(() => usedCategories(allEntries), [allEntries]);

  // If the selected day/category no longer exists (its last entry was deleted,
  // moved, or re-dated), drop back to "all" so the filter can't get stuck on a
  // value with a blank trigger and an empty list.
  useEffect(() => {
    if (filters.date !== "all" && !dates.includes(filters.date)) {
      onChange({ ...filters, date: "all" });
    } else if (filters.category !== "all" && !cats.includes(filters.category)) {
      onChange({ ...filters, category: "all" });
    }
  }, [dates, cats, filters, onChange]);

  const active = isFilterActive(filters);
  const totalMinutes = filtered.reduce((a, e) => a + e.minutes, 0);
  const dayCount = new Set(filtered.map((e) => e.entry_date)).size;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input
          id="entry-search"
          aria-label="Search tasks"
          data-test-id="filter-search"
          className="pl-9"
          placeholder="Search tasks…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div
        className={`grid gap-2 ${
          dense
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        <Select
          value={filters.date}
          onValueChange={(v) => onChange({ ...filters, date: v })}
        >
          <SelectTrigger data-test-id="filter-date" aria-label="Filter by date">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            {dates.map((d) => (
              <SelectItem key={d} value={d}>
                {relativeLabel(d)} · {formatShortDate(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(v) =>
            onChange({ ...filters, category: v as Category | "all" })
          }
        >
          <SelectTrigger data-test-id="filter-category" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {cats.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_MAP[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) =>
            onChange({ ...filters, status: v as EntryStatus | "all" })
          }
        >
          <SelectTrigger data-test-id="filter-status" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          aria-label="Filter by ticket number"
          data-test-id="filter-ticket"
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
        <Button
          type="button"
          variant="link"
          size="sm"
          disabled={!active}
          onClick={() => onChange(EMPTY_FILTERS)}
          data-test-id="filter-clear"
          className="gap-1 px-2"
        >
          <X size={13} />
          Clear
        </Button>
      </div>
    </div>
  );
}
