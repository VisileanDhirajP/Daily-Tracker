import type { Category, Entry, EntryInput, EntryStatus } from "./types";
import { dayDiff } from "./format/date";

/** Extract the editable payload from an entry (drops server fields). */
export function toEntryInput(e: Entry): EntryInput {
  return {
    entry_date: e.entry_date,
    task: e.task,
    category: e.category,
    ticket_number: e.ticket_number,
    ticket_url: e.ticket_url,
    minutes: e.minutes,
    status: e.status,
  };
}

export interface DayGroup {
  date: string; // YYYY-MM-DD
  entries: Entry[];
  totalMinutes: number;
}

/**
 * Sort entries newest-first by date, then by created_at within a day, then by
 * id. The id tiebreak makes this a strict total order so rows never swap
 * position on re-render when date + created_at happen to be equal.
 */
export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.entry_date !== b.entry_date) return b.entry_date.localeCompare(a.entry_date);
    if (a.created_at !== b.created_at) return b.created_at.localeCompare(a.created_at);
    return b.id.localeCompare(a.id);
  });
}

/** Group entries by day, newest day first, each day's entries newest-first. */
export function groupByDay(entries: Entry[]): DayGroup[] {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = map.get(e.entry_date);
    if (list) list.push(e);
    else map.set(e.entry_date, [e]);
  }
  const groups: DayGroup[] = [];
  for (const [date, list] of map) {
    const sorted = sortEntries(list);
    groups.push({
      date,
      entries: sorted,
      totalMinutes: sumMinutes(sorted),
    });
  }
  groups.sort((a, b) => dayDiff(b.date, a.date));
  return groups;
}

export function sumMinutes(entries: Entry[]): number {
  return entries.reduce((acc, e) => acc + (e.minutes || 0), 0);
}

export function uniqueDates(entries: Entry[]): string[] {
  const set = new Set(entries.map((e) => e.entry_date));
  return [...set].sort((a, b) => dayDiff(b, a));
}

export function usedCategories(entries: Entry[]): Category[] {
  const set = new Set(entries.map((e) => e.category));
  return [...set];
}

export interface EntryFilters {
  search: string;
  date: string | "all";
  category: Category | "all";
  status: EntryStatus | "all";
  ticket: string;
}

export const EMPTY_FILTERS: EntryFilters = {
  search: "",
  date: "all",
  category: "all",
  status: "all",
  ticket: "",
};

export function isFilterActive(f: EntryFilters): boolean {
  return (
    f.search.trim() !== "" ||
    f.date !== "all" ||
    f.category !== "all" ||
    f.status !== "all" ||
    f.ticket.trim() !== ""
  );
}

export function filterEntries(entries: Entry[], f: EntryFilters): Entry[] {
  const search = f.search.trim().toLowerCase();
  const ticket = f.ticket.trim().toLowerCase();
  return entries.filter((e) => {
    if (search && !e.task.toLowerCase().includes(search)) return false;
    if (f.date !== "all" && e.entry_date !== f.date) return false;
    if (f.category !== "all" && e.category !== f.category) return false;
    if (f.status !== "all" && e.status !== f.status) return false;
    if (ticket && !(e.ticket_number ?? "").toLowerCase().includes(ticket)) {
      return false;
    }
    return true;
  });
}

/** Entries whose date falls within [from, to] inclusive (ISO date compare). */
export function inRange(entries: Entry[], from: string, to: string): Entry[] {
  return entries.filter((e) => e.entry_date >= from && e.entry_date <= to);
}

/** Entries logged on a specific day. */
export function entriesOn(entries: Entry[], date: string): Entry[] {
  return entries.filter((e) => e.entry_date === date);
}

/**
 * The most recent day strictly before `date` that has at least one entry, or
 * null if there's nothing earlier. Powers "copy from the last day you logged".
 */
export function lastLoggedDayBefore(entries: Entry[], date: string): string | null {
  let best: string | null = null;
  for (const e of entries) {
    if (e.entry_date < date && (best === null || e.entry_date > best)) {
      best = e.entry_date;
    }
  }
  return best;
}
