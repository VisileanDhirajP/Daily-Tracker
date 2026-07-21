import type { Category, EntryStatus, Profile, TeamFeedRow } from "./types";

/**
 * Is `managerEmail` one of this employee's managers? Case-insensitive, so a
 * manager matches regardless of how the employee typed their email.
 */
export function isOnTeam(
  employee: Pick<Profile, "manager_emails">,
  managerEmail: string,
): boolean {
  const m = managerEmail.trim().toLowerCase();
  if (!m) return false;
  return employee.manager_emails.some((e) => e.trim().toLowerCase() === m);
}

/** Distinct employees present in a feed, sorted by name — for the filter list. */
export function teamEmployees(
  rows: TeamFeedRow[],
): Array<{ id: string; full_name: string }> {
  const byId = new Map<string, string>();
  for (const r of rows) byId.set(r.employee.id, r.employee.full_name);
  return [...byId.entries()]
    .map(([id, full_name]) => ({ id, full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export interface TeamFeedFilters {
  employeeId: string | "all";
  from: string; // ISO; inclusive
  to: string; // ISO; inclusive
  search: string;
  category: Category | "all";
  status: EntryStatus | "all";
}

/** Filter a manager's team feed by employee, date range, search, category, status. */
export function filterTeamFeed(
  rows: TeamFeedRow[],
  f: TeamFeedFilters,
): TeamFeedRow[] {
  const search = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.employeeId !== "all" && r.employee.id !== f.employeeId) return false;
    if (r.entry_date < f.from || r.entry_date > f.to) return false;
    if (f.category !== "all" && r.category !== f.category) return false;
    if (f.status !== "all" && r.status !== f.status) return false;
    if (search) {
      const hay = `${r.task} ${r.employee.full_name} ${r.ticket_number ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

/** Total minutes across a set of feed rows. */
export function teamTotalMinutes(rows: TeamFeedRow[]): number {
  return rows.reduce((acc, r) => acc + (r.minutes || 0), 0);
}

export interface TeamPersonSummary {
  id: string;
  full_name: string;
  email: string;
  minutes: number;
  entries: number;
  done: number;
  donePct: number;
}

/** Aggregate a feed into per-person totals, ranked by time logged. */
export function teamByPerson(rows: TeamFeedRow[]): TeamPersonSummary[] {
  const map = new Map<string, TeamPersonSummary>();
  for (const r of rows) {
    let p = map.get(r.employee.id);
    if (!p) {
      p = {
        id: r.employee.id,
        full_name: r.employee.full_name,
        email: r.employee.email,
        minutes: 0,
        entries: 0,
        done: 0,
        donePct: 0,
      };
      map.set(r.employee.id, p);
    }
    p.minutes += r.minutes || 0;
    p.entries += 1;
    if (r.status === "done") p.done += 1;
  }
  const list = [...map.values()];
  for (const p of list) p.donePct = p.entries ? Math.round((p.done / p.entries) * 100) : 0;
  return list.sort((a, b) => b.minutes - a.minutes);
}

export interface TeamDayGroup {
  date: string;
  rows: TeamFeedRow[];
  totalMinutes: number;
}

/** Group feed rows by day (newest day first) for the combined manager feed. */
export function groupTeamFeedByDay(rows: TeamFeedRow[]): TeamDayGroup[] {
  const map = new Map<string, TeamFeedRow[]>();
  for (const r of rows) {
    const list = map.get(r.entry_date);
    if (list) list.push(r);
    else map.set(r.entry_date, [r]);
  }
  return [...map.entries()]
    .map(([date, list]) => ({ date, rows: list, totalMinutes: teamTotalMinutes(list) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
