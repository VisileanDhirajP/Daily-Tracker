"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { useEntries } from "@/hooks/useEntries";
import { CATEGORY_MAP, STATUS_META } from "@/lib/constants";
import { inRange, sumMinutes } from "@/lib/entries";
import { formatDuration, toHours } from "@/lib/format/time";
import {
  shiftDay,
  shiftMonths,
  startOfWeek,
  todayISO,
  formatShortDate,
  parseISODate,
} from "@/lib/format/date";
import { resolveRange, type RangeKey } from "@/lib/export/range";
import {
  countByStatus,
  dailyMinutes,
  dailySeries,
  minutesByCategory,
  minutesByTicket,
  minutesByWeekday,
  percentChange,
  previousPeriod,
  WEEKDAY_LABELS,
} from "@/lib/insights";
import type { EntryStatus } from "@/lib/types";
import { TicketPill } from "@/components/dashboard/TicketPill";
import { DatePicker } from "@/components/ui/DatePicker";

const STATUS_COLOR: Record<EntryStatus, string> = {
  progress: "#2E7CC4",
  hold: "#FCBC36",
  done: "#1f8a4c",
};

const HEAT_WEEKS = 26;
const HEAT_LEVELS = ["#cfe0f0", "#96C0E0", "#2E7CC4", "#123E66"];

function heatColor(minutes: number): string {
  if (minutes <= 0) return "rgb(var(--hairline))";
  if (minutes < 60) return HEAT_LEVELS[0];
  if (minutes < 120) return HEAT_LEVELS[1];
  if (minutes < 240) return HEAT_LEVELS[2];
  return HEAT_LEVELS[3];
}

const RANGE_TABS: { key: RangeKey; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

export default function InsightsPage() {
  const { entries, loading } = useEntries();
  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [tip, setTip] = useState<{ x: number; y: number; label: string } | null>(null);

  const range = useMemo(
    () => resolveRange(rangeKey, { from: customFrom, to: customTo }),
    [rangeKey, customFrom, customTo],
  );

  const data = useMemo(() => {
    const scoped = inRange(entries, range.from, range.to);
    // Compare against the *aligned* prior calendar period (same weekday span
    // for week, same day-span for month) so the delta is like-for-like; custom
    // ranges fall back to the equal-length trailing window.
    const prev =
      rangeKey === "week"
        ? { from: shiftDay(range.from, -7), to: shiftDay(range.to, -7) }
        : rangeKey === "month"
          ? { from: shiftMonths(range.from, -1), to: shiftMonths(range.to, -1) }
          : previousPeriod(range.from, range.to);
    const prevScoped = inRange(entries, prev.from, prev.to);
    const status = countByStatus(scoped);
    return {
      scoped,
      thisMin: sumMinutes(scoped),
      prevMin: sumMinutes(prevScoped),
      delta: percentChange(sumMinutes(scoped), sumMinutes(prevScoped)),
      byCategory: minutesByCategory(scoped),
      byWeekday: minutesByWeekday(scoped),
      series: dailySeries(scoped, range.from, range.to),
      tickets: minutesByTicket(scoped).slice(0, 6),
      status,
      done: status.done,
      total: scoped.length,
    };
  }, [entries, range, rangeKey]);

  // Contribution heatmap over the last N weeks (independent of the range tab).
  const heat = useMemo(() => {
    const minutesMap = dailyMinutes(entries);
    const today = todayISO();
    const firstMon = shiftDay(startOfWeek(today), -(HEAT_WEEKS - 1) * 7);
    const cols: { date: string; minutes: number; future: boolean }[][] = [];
    for (let w = 0; w < HEAT_WEEKS; w++) {
      const col: { date: string; minutes: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = shiftDay(firstMon, w * 7 + d);
        col.push({ date, minutes: minutesMap.get(date) ?? 0, future: date > today });
      }
      cols.push(col);
    }
    return cols;
  }, [entries]);

  const rangeLabel = rangeKey === "custom" ? "previous period" : `last ${rangeKey}`;

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="h-6 w-40 animate-pulse rounded bg-hairline" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.minutes));
  const maxDay = Math.max(1, ...data.byWeekday);
  const maxTicket = Math.max(1, ...data.tickets.map((t) => t.minutes));
  const donePct = data.total ? Math.round((data.done / data.total) * 100) : 0;
  const todayIdx = ((parseISODate(todayISO())?.getDay() ?? 1) + 6) % 7;
  // Only mark "today" on the weekday chart when today is actually in range.
  const highlightToday = todayISO() >= range.from && todayISO() <= range.to;

  // Build the trend polyline / area from the daily series.
  const maxSeries = Math.max(1, ...data.series.map((p) => p.minutes));
  const n = data.series.length;
  const linePts = data.series.map((p, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * 100;
    const y = 38 - (p.minutes / maxSeries) * 34;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Insights</h1>
          <p className="mt-1 text-sm text-muted">
            {range.label} · {formatShortDate(range.from)} – {formatShortDate(range.to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Report range">
          {RANGE_TABS.map((r) => (
            <button
              key={r.key}
              type="button"
              data-test-id={`insights-range-${r.key}`}
              aria-pressed={rangeKey === r.key}
              onClick={() => setRangeKey(r.key)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                rangeKey === r.key
                  ? "border-blue-brand bg-blue-brand/10 text-blue-brand"
                  : "border-hairline text-ink hover:bg-canvas"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {rangeKey === "custom" && (
        <div className="mb-4 flex flex-wrap gap-2">
          <DatePicker
            value={customFrom}
            onChange={setCustomFrom}
            testId="insights-from"
            ariaLabel="From date"
            placeholder="From"
            className="w-40"
          />
          <DatePicker
            value={customTo}
            onChange={setCustomTo}
            testId="insights-to"
            ariaLabel="To date"
            placeholder="To"
            className="w-40"
          />
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-4" data-test-id="kpi-logged">
            <p className="text-xs font-medium text-muted">Logged</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-navy">{toHours(data.thisMin)}h</span>
              {data.delta !== null && data.delta !== 0 && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                    data.delta > 0 ? "text-[#1f8a4c]" : "text-orange-brand"
                  }`}
                >
                  {data.delta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {Math.abs(data.delta)}%
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              vs {toHours(data.prevMin)}h {rangeLabel}
            </p>
          </div>
          <div className="card p-4" data-test-id="kpi-entries">
            <p className="text-xs font-medium text-muted">Entries</p>
            <span className="mt-1 block text-2xl font-bold text-navy">{data.total}</span>
            <p className="mt-1 text-xs text-muted">in range</p>
          </div>
          <div className="card p-4" data-test-id="kpi-done">
            <p className="text-xs font-medium text-muted">Completed</p>
            <span className="mt-1 block text-2xl font-bold text-navy">
              {data.done}
              <span className="text-base font-medium text-muted">/{data.total}</span>
            </span>
            <p className="mt-1 text-xs text-muted">{donePct}% marked done</p>
          </div>
        </div>

        {data.total === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <TrendingUp size={32} className="text-blue-light" />
            <p className="text-sm font-medium text-ink">Nothing logged in this range</p>
            <p className="max-w-xs text-sm text-muted">
              Pick a different range or log some entries.
            </p>
            <Link
              href="/dashboard"
              className="btn-cta mt-1 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm"
            >
              Go to dashboard <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            {/* Daily hours trend */}
            <div className="card p-5">
              <h2 className="mb-4 text-sm font-bold text-navy">Daily hours</h2>
              {n >= 2 ? (
                <svg
                  viewBox="0 0 100 40"
                  preserveAspectRatio="none"
                  className="h-32 w-full"
                  role="img"
                  aria-label="Daily hours trend"
                >
                  <polyline
                    points={`0,40 ${linePts.join(" ")} 100,40`}
                    fill="#2E7CC4"
                    fillOpacity={0.12}
                    stroke="none"
                  />
                  <polyline
                    points={linePts.join(" ")}
                    fill="none"
                    stroke="#2E7CC4"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              ) : (
                <p className="py-6 text-center text-sm text-muted">
                  Not enough days in this range for a trend yet.
                </p>
              )}
              <div className="mt-1 flex justify-between text-[11px] text-muted">
                <span>{formatShortDate(range.from)}</span>
                <span>{formatShortDate(range.to)}</span>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Hours per category */}
              <div className="card p-5">
                <h2 className="mb-4 text-sm font-bold text-navy">Hours by category</h2>
                <div className="flex flex-col gap-3">
                  {data.byCategory.map((c) => {
                    const meta = CATEGORY_MAP[c.category];
                    return (
                      <div key={c.category}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-ink">{meta.label}</span>
                          <span className="text-muted">{formatDuration(c.minutes)}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(c.minutes / maxCat) * 100}%`,
                              backgroundColor: meta.color,
                            }}
                            role="img"
                            aria-label={`${meta.label}: ${formatDuration(c.minutes)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Busiest days */}
              <div className="card p-5">
                <h2 className="mb-4 text-sm font-bold text-navy">Busiest days</h2>
                <div className="flex h-40 items-end justify-between gap-2">
                  {data.byWeekday.map((min, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-[10px] text-muted">
                        {min > 0 ? toHours(min) : ""}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${Math.max(min > 0 ? 6 : 0, (min / maxDay) * 100)}%`,
                            backgroundColor:
                              highlightToday && i === todayIdx ? "#F37E31" : "#2E7CC4",
                          }}
                          role="img"
                          aria-label={`${WEEKDAY_LABELS[i]}: ${formatDuration(min)}`}
                        />
                      </div>
                      <span
                        className={`text-[11px] ${
                          highlightToday && i === todayIdx
                            ? "font-bold text-orange-brand"
                            : "text-muted"
                        }`}
                      >
                        {WEEKDAY_LABELS[i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Status breakdown */}
              <div className="card p-5">
                <h2 className="mb-4 text-sm font-bold text-navy">Status breakdown</h2>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-canvas">
                  {(["progress", "hold", "done"] as EntryStatus[]).map((s) =>
                    data.status[s] > 0 ? (
                      <div
                        key={s}
                        style={{
                          width: `${(data.status[s] / data.total) * 100}%`,
                          backgroundColor: STATUS_COLOR[s],
                        }}
                        role="img"
                        aria-label={`${STATUS_META[s].label}: ${data.status[s]}`}
                      />
                    ) : null,
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-4">
                  {(["progress", "hold", "done"] as EntryStatus[]).map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 text-xs text-muted"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[s] }}
                      />
                      {STATUS_META[s].label} · {data.status[s]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Top tickets by time */}
              <div className="card p-5">
                <h2 className="mb-4 text-sm font-bold text-navy">Top tickets by time</h2>
                {data.tickets.length === 0 ? (
                  <p className="py-4 text-sm text-muted">No ticketed work in this range.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.tickets.map((t) => (
                      <div key={t.ticket}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <TicketPill ticketNumber={t.ticket} ticketUrl={t.url} />
                          <span className="text-muted">{formatDuration(t.minutes)}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas">
                          <div
                            className="h-full rounded-full bg-blue-brand transition-all"
                            style={{ width: `${(t.minutes / maxTicket) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Contribution heatmap (all history, last 26 weeks) */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy">Activity</h2>
            <span className="text-xs text-muted">last {HEAT_WEEKS} weeks</span>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-[3px]" data-test-id="heatmap">
              {heat.map((col, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {col.map((cell) => {
                    const label = `${formatShortDate(cell.date)} · ${formatDuration(cell.minutes)}`;
                    const show = (e: { currentTarget: HTMLElement }) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      setTip({ x: r.left + r.width / 2, y: r.top, label });
                    };
                    return (
                      <div
                        key={cell.date}
                        role="img"
                        aria-label={cell.future ? undefined : label}
                        tabIndex={cell.future ? -1 : 0}
                        onMouseEnter={(e) => !cell.future && show(e)}
                        onMouseLeave={() => setTip(null)}
                        onFocus={(e) => !cell.future && show(e)}
                        onBlur={() => setTip(null)}
                        className="h-[11px] w-[11px] rounded-[2px] focus-visible:ring-2 focus-visible:ring-blue-brand"
                        style={{
                          backgroundColor: cell.future
                            ? "transparent"
                            : heatColor(cell.minutes),
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {tip && (
            <div
              className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-navy px-2.5 py-1 text-xs font-medium text-white shadow-card"
              style={{ left: tip.x, top: tip.y - 8 }}
              role="status"
            >
              {tip.label}
            </div>
          )}
          <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
            <span>Less</span>
            <span className="h-[11px] w-[11px] rounded-[2px]" style={{ backgroundColor: "rgb(var(--hairline))" }} />
            {HEAT_LEVELS.map((c) => (
              <span key={c} className="h-[11px] w-[11px] rounded-[2px]" style={{ backgroundColor: c }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </main>
  );
}
