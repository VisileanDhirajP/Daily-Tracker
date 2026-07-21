import type { ReactNode } from "react";
import type { EntryStatus, TeamFeedRow } from "@/lib/types";
import { CATEGORY_MAP, STATUS_META } from "@/lib/constants";
import { countByStatus, minutesByCategory } from "@/lib/insights";
import { teamByPerson, teamTotalMinutes } from "@/lib/team";
import { formatDuration, toHours } from "@/lib/format/time";

const STATUS_COLOR: Record<EntryStatus, string> = {
  progress: "#2E7CC4",
  hold: "#FCBC36",
  done: "#1f8a4c",
};
const STATUS_ORDER: EntryStatus[] = ["done", "progress", "hold"];

function Kpi({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold text-navy">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

/** Manager dashboard: aggregate view of the (already-filtered) team feed. */
export function TeamSummary({ rows }: { rows: TeamFeedRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card py-14 text-center text-sm text-muted">
        No activity in this range to summarise.
      </div>
    );
  }

  const people = teamByPerson(rows);
  const totalMin = teamTotalMinutes(rows);
  const done = rows.filter((r) => r.status === "done").length;
  const donePct = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const byCat = minutesByCategory(rows);
  const status = countByStatus(rows);

  const maxPerson = Math.max(1, ...people.map((p) => p.minutes));
  const maxCat = Math.max(1, ...byCat.map((c) => c.minutes));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi value={`${toHours(totalMin)}h`} label="Team hours" />
        <Kpi value={people.length} label={people.length === 1 ? "Person" : "People"} />
        <Kpi value={rows.length} label="Entries" />
        <Kpi value={`${donePct}%`} label="Completed" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Hours by person */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-navy">Hours by person</h2>
          <div className="flex flex-col gap-3.5" data-test-id="team-by-person">
            {people.map((p) => (
              <div key={p.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-ink">{p.full_name}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatDuration(p.minutes)}
                    <span className="ml-1.5 text-hairline">·</span>
                    <span className="ml-1.5">{p.entries} {p.entries === 1 ? "entry" : "entries"}</span>
                    <span className="ml-1.5 text-hairline">·</span>
                    <span className="ml-1.5 font-semibold text-ink">{p.donePct}% done</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-blue-brand transition-all duration-500"
                    style={{ width: `${(p.minutes / maxPerson) * 100}%` }}
                    role="img"
                    aria-label={`${p.full_name}: ${formatDuration(p.minutes)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category mix + status */}
        <div className="card flex flex-col gap-5 p-5">
          <div>
            <h2 className="mb-4 text-sm font-bold text-navy">Category mix</h2>
            <div className="flex flex-col gap-3">
              {byCat.map((c) => {
                const meta = CATEGORY_MAP[c.category];
                const pct = totalMin ? Math.round((c.minutes / totalMin) * 100) : 0;
                return (
                  <div key={c.category}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2 text-ink">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                        {meta.label}
                      </span>
                      <span className="tabular-nums text-muted">
                        {formatDuration(c.minutes)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(c.minutes / maxCat) * 100}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-hairline pt-4">
            <h2 className="mb-3 text-sm font-bold text-navy">Status</h2>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-canvas">
              {STATUS_ORDER.map((s) =>
                status[s] > 0 ? (
                  <div
                    key={s}
                    style={{ width: `${(status[s] / rows.length) * 100}%`, backgroundColor: STATUS_COLOR[s] }}
                    role="img"
                    aria-label={`${STATUS_META[s].label}: ${status[s]}`}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {STATUS_ORDER.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
                  {STATUS_META[s].label} · {status[s]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
