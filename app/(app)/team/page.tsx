"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";
import type { Category, EntryStatus, TeamFeedRow as TeamFeedRowData } from "@/lib/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { repository } from "@/lib/data";
import { canViewTeam } from "@/lib/roles";
import {
  filterTeamFeed,
  groupTeamFeedByDay,
  teamEmployees,
  teamTotalMinutes,
} from "@/lib/team";
import { CATEGORIES, CATEGORY_MAP, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { RANGE_OPTIONS, resolveRange, type RangeKey } from "@/lib/export/range";
import { formatLongDate, relativeLabel } from "@/lib/format/date";
import { formatDuration, formatHours } from "@/lib/format/time";
import { useToast } from "@/components/ui/ToastProvider";
import { RequireRole } from "@/components/RequireRole";
import { TeamFeedRow } from "@/components/team/TeamFeedRow";
import { TeamExportMenu } from "@/components/team/TeamExportMenu";
import { TeamSummary } from "@/components/team/TeamSummary";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function TeamFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<TeamFeedRowData[]>([]);
  const [loading, setLoading] = useState(true);

  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [employeeId, setEmployeeId] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [status, setStatus] = useState<EntryStatus | "all">("all");
  const [mode, setMode] = useState<"feed" | "summary">("feed");

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    repository
      .listTeamEntries(user)
      .then((r) => {
        if (active) setRows(r);
      })
      .catch(() => {
        if (active) {
          setRows([]);
          toast("Couldn't load the team feed. Please retry.", "error");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, toast]);

  const range = useMemo(
    () => resolveRange(rangeKey, { from: customFrom, to: customTo }),
    [rangeKey, customFrom, customTo],
  );

  const employees = useMemo(() => teamEmployees(rows), [rows]);

  const filtered = useMemo(
    () =>
      filterTeamFeed(rows, {
        employeeId,
        from: range.from,
        to: range.to,
        search,
        category,
        status,
      }),
    [rows, employeeId, range, search, category, status],
  );

  const groups = useMemo(() => groupTeamFeedByDay(filtered), [filtered]);
  const peopleCount = useMemo(
    () => new Set(filtered.map((r) => r.employee.id)).size,
    [filtered],
  );

  const exportMeta = useMemo(
    () => ({
      managerName: user?.full_name || user?.email || "Manager",
      rangeLabel: range.label,
      from: range.from,
      to: range.to,
    }),
    [user, range],
  );

  const rangeBtn = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-blue-brand bg-blue-brand/10 text-blue-brand"
        : "border-hairline text-ink hover:bg-canvas"
    }`;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users size={20} className="text-blue-brand" />
            <h1 className="text-xl font-bold text-navy">Team</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            A read-only feed of what your team logged. You can filter but not edit
            — entries belong to their owners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex rounded-xl border border-hairline bg-card p-1"
            role="group"
            aria-label="View mode"
          >
            {(["feed", "summary"] as const).map((m) => (
              <button
                key={m}
                type="button"
                data-test-id={`team-mode-${m}`}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  mode === m ? "bg-blue-brand text-white shadow-sm" : "text-muted hover:text-navy"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <TeamExportMenu rows={filtered} meta={exportMeta} />
        </div>
      </div>

      {/* Filters */}
      <div className="card mt-6 flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              data-test-id={`team-range-${r.key}`}
              className={rangeBtn(rangeKey === r.key)}
              onClick={() => setRangeKey(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {rangeKey === "custom" && (
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            <DatePicker
              value={customFrom}
              onChange={setCustomFrom}
              testId="team-range-from"
              ariaLabel="From date"
              placeholder="From"
            />
            <DatePicker
              value={customTo}
              onChange={setCustomTo}
              testId="team-range-to"
              ariaLabel="To date"
              placeholder="To"
            />
          </div>
        )}

        <Input
          aria-label="Search team entries"
          data-test-id="team-search"
          placeholder="Search task, person or ticket…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select value={employeeId} onValueChange={(v) => setEmployeeId(v)}>
            <SelectTrigger data-test-id="team-employee" aria-label="Filter by person">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={(v) => setCategory(v as Category | "all")}>
            <SelectTrigger data-test-id="team-category" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {CATEGORY_MAP[c.value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v as EntryStatus | "all")}>
            <SelectTrigger data-test-id="team-status" aria-label="Filter by status">
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
        </div>

        <p className="text-xs text-muted" data-test-id="team-count">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"} · {peopleCount}{" "}
          {peopleCount === 1 ? "person" : "people"} · {formatHours(teamTotalMinutes(filtered))}
        </p>
      </div>

      {/* Feed */}
      <div className="mt-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 size={18} className="animate-spin" /> Loading team activity…
          </div>
        ) : mode === "summary" ? (
          <TeamSummary rows={filtered} />
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-14 text-center">
            <Users size={28} className="text-muted" />
            <p className="text-sm font-medium text-ink">Nothing to show</p>
            <p className="max-w-sm text-sm text-muted">
              {rows.length === 0
                ? "No one reports to you yet. Ask an admin to assign team members to you on the Admin page."
                : "No entries match these filters. Try widening the date range."}
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.date} className="mb-6" data-test-id="team-day-group">
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-hairline pb-2">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h3 className="text-sm font-bold text-navy">{formatLongDate(g.date)}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      relativeLabel(g.date) === "Today"
                        ? "bg-gold/25 text-[#8f6606]"
                        : "bg-blue-brand/10 text-blue-brand"
                    }`}
                  >
                    {relativeLabel(g.date)}
                  </span>
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-muted">
                  {g.rows.length} {g.rows.length === 1 ? "entry" : "entries"}
                  <span className="px-1 text-hairline">·</span>
                  {formatDuration(g.totalMinutes)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {g.rows.map((r) => (
                  <TeamFeedRow key={r.id} row={r} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

export default function TeamPage() {
  return (
    <RequireRole allow={canViewTeam}>
      <TeamFeed />
    </RequireRole>
  );
}
