"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { useEntries } from "@/hooks/useEntries";
import { CATEGORY_MAP, STATUS_META } from "@/lib/constants";
import { inRange, sumMinutes } from "@/lib/entries";
import { formatDuration, formatHours, toHours } from "@/lib/format/time";
import {
  shiftDay,
  startOfWeek,
  todayISO,
  formatShortDate,
  parseISODate,
} from "@/lib/format/date";
import {
  countByStatus,
  minutesByCategory,
  minutesByWeekday,
  percentChange,
  WEEKDAY_LABELS,
} from "@/lib/insights";
import type { EntryStatus } from "@/lib/types";

const STATUS_COLOR: Record<EntryStatus, string> = {
  progress: "#2E7CC4",
  hold: "#FCBC36",
  done: "#1f8a4c",
};

export default function InsightsPage() {
  const { entries, loading } = useEntries();

  const data = useMemo(() => {
    const today = todayISO();
    const wkStart = startOfWeek(today);
    const lastStart = shiftDay(wkStart, -7);
    const lastEnd = shiftDay(wkStart, -1);

    const thisWeek = inRange(entries, wkStart, today);
    const lastWeek = inRange(entries, lastStart, lastEnd);

    const thisMin = sumMinutes(thisWeek);
    const lastMin = sumMinutes(lastWeek);
    const status = countByStatus(thisWeek);
    const open = status.progress + status.hold;

    return {
      wkStart,
      today,
      thisWeek,
      byCategory: minutesByCategory(thisWeek),
      byWeekday: minutesByWeekday(thisWeek),
      thisMin,
      lastMin,
      delta: percentChange(thisMin, lastMin),
      status,
      open,
      done: status.done,
      total: thisWeek.length,
      todayIdx: ((parseISODate(today)?.getDay() ?? 1) + 6) % 7,
    };
  }, [entries]);

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
  const donePct = data.total ? Math.round((data.done / data.total) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-navy">Insights</h1>
        <p className="mt-1 text-sm text-muted">
          This week · {formatShortDate(data.wkStart)} – {formatShortDate(data.today)}
        </p>
      </div>

      {data.total === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <TrendingUp size={32} className="text-blue-light" />
          <p className="text-sm font-medium text-ink">Nothing logged this week yet</p>
          <p className="max-w-xs text-sm text-muted">
            Log a few entries and your weekly breakdown will show up here.
          </p>
          <Link
            href="/dashboard"
            className="btn-cta mt-1 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm"
          >
            Go to dashboard <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-4" data-test-id="kpi-this-week">
              <p className="text-xs font-medium text-muted">Logged this week</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-navy">
                  {toHours(data.thisMin)}h
                </span>
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
                vs {toHours(data.lastMin)}h last week
              </p>
            </div>

            <div className="card p-4" data-test-id="kpi-entries">
              <p className="text-xs font-medium text-muted">Entries</p>
              <span className="mt-1 block text-2xl font-bold text-navy">
                {data.total}
              </span>
              <p className="mt-1 text-xs text-muted">this week</p>
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
                          backgroundColor: i === data.todayIdx ? "#F37E31" : "#2E7CC4",
                        }}
                        role="img"
                        aria-label={`${WEEKDAY_LABELS[i]}: ${formatDuration(min)}`}
                      />
                    </div>
                    <span
                      className={`text-[11px] ${
                        i === data.todayIdx ? "font-bold text-orange-brand" : "text-muted"
                      }`}
                    >
                      {WEEKDAY_LABELS[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
                <span key={s} className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[s] }}
                  />
                  {STATUS_META[s].label} · {data.status[s]}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
