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

const DISPLAY = { fontFamily: "var(--font-montserrat), var(--font-poppins), sans-serif" };

const STATUS_ORDER: EntryStatus[] = ["done", "progress", "hold"];
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

/** One at-a-glance metric inside the hero rail. */
function HeroStat({
  value,
  label,
  testId,
}: {
  value: React.ReactNode;
  label: string;
  testId?: string;
}) {
  return (
    <div data-test-id={testId}>
      <div className="text-lg font-semibold text-white" style={DISPLAY}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-blue-light">{label}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-brand">
          {eyebrow}
        </p>
      )}
      <h2 className="text-sm font-bold text-navy">{title}</h2>
    </div>
  );
}

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
    // Compare against the *aligned* prior calendar period (same weekday span for
    // week, same day-span for month) so the delta is like-for-like; custom
    // ranges fall back to the equal-length trailing window.
    const prev =
      rangeKey === "week"
        ? { from: shiftDay(range.from, -7), to: shiftDay(range.to, -7) }
        : rangeKey === "month"
          ? { from: shiftMonths(range.from, -1), to: shiftMonths(range.to, -1) }
          : previousPeriod(range.from, range.to);
    const prevScoped = inRange(entries, prev.from, prev.to);
    const status = countByStatus(scoped);
    const series = dailySeries(scoped, range.from, range.to);
    const byCategory = minutesByCategory(scoped);
    const byWeekday = minutesByWeekday(scoped);
    const thisMin = sumMinutes(scoped);
    const activeDays = series.filter((p) => p.minutes > 0).length;
    const best = series.reduce(
      (b, p) => (p.minutes > b.minutes ? p : b),
      { date: "", minutes: 0 },
    );
    const busiestIdx = byWeekday.some((m) => m > 0)
      ? byWeekday.indexOf(Math.max(...byWeekday))
      : -1;
    return {
      scoped,
      thisMin,
      prevMin: sumMinutes(prevScoped),
      delta: percentChange(thisMin, sumMinutes(prevScoped)),
      byCategory,
      byWeekday,
      series,
      tickets: minutesByTicket(scoped).slice(0, 6),
      status,
      done: status.done,
      total: scoped.length,
      rangeDays: series.length,
      activeDays,
      avgActive: activeDays ? thisMin / activeDays : 0,
      best,
      busiestIdx,
      focus: byCategory[0] ?? null,
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

  const rangeWord = rangeKey === "custom" ? "prev. period" : `last ${rangeKey}`;
  const eyebrow =
    rangeKey === "week" ? "This week" : rangeKey === "month" ? "This month" : "Custom range";

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="h-6 w-40 animate-pulse rounded bg-hairline" />
        <div className="mt-6 h-44 animate-pulse rounded-2xl bg-hairline" />
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="card h-56 animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.minutes));
  const maxDay = Math.max(1, ...data.byWeekday);
  const maxTicket = Math.max(1, ...data.tickets.map((t) => t.minutes));
  const donePct = data.total ? Math.round((data.done / data.total) * 100) : 0;
  const focusPct =
    data.focus && data.thisMin ? Math.round((data.focus.minutes / data.thisMin) * 100) : 0;
  const todayIdx = ((parseISODate(todayISO())?.getDay() ?? 1) + 6) % 7;
  const highlightToday = todayISO() >= range.from && todayISO() <= range.to;

  // Hero trend: area + line from the daily series (drawn on the navy panel).
  const maxSeries = Math.max(1, ...data.series.map((p) => p.minutes));
  const n = data.series.length;
  const linePts = data.series.map((p, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * 100;
    const y = 40 - (p.minutes / maxSeries) * 34;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  // Status donut segments (pathLength=100 → dasharray is percentage directly).
  let acc = 0;
  const donut = STATUS_ORDER.filter((s) => data.status[s] > 0).map((s) => {
    const pct = (data.status[s] / Math.max(1, data.total)) * 100;
    const seg = { s, pct, offset: acc };
    acc += pct;
    return seg;
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      {/* Header + range control */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Insights</h1>
          <p className="mt-1 text-sm text-muted">
            How your time added up · {formatShortDate(range.from)} – {formatShortDate(range.to)}
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-1 rounded-xl border border-hairline bg-card p-1"
          role="group"
          aria-label="Report range"
        >
          {RANGE_TABS.map((r) => (
            <button
              key={r.key}
              type="button"
              data-test-id={`insights-range-${r.key}`}
              aria-pressed={rangeKey === r.key}
              onClick={() => setRangeKey(r.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                rangeKey === r.key
                  ? "bg-blue-brand text-white shadow-sm"
                  : "text-muted hover:text-navy"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {rangeKey === "custom" && (
        <div className="mb-5 flex flex-wrap gap-2">
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
        {/* ── Hero: the period ribbon (headline hours + trend + metric rail) ── */}
        <section className="brand-header rounded-2xl p-6 text-white shadow-card sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
            <div data-test-id="kpi-logged">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-light">
                {eyebrow} · logged
              </p>
              <div className="mt-1 flex items-end gap-3">
                <span className="text-5xl font-bold leading-none text-white" style={DISPLAY}>
                  {toHours(data.thisMin)}
                  <span className="ml-1 text-2xl font-semibold text-blue-light">h</span>
                </span>
                {data.delta !== null && data.delta !== 0 && (
                  <span
                    className="mb-1 inline-flex items-center gap-0.5 rounded-full bg-white/12 px-2 py-0.5 text-xs font-semibold"
                    style={{ color: data.delta > 0 ? "#7fdca4" : "#f6b45a" }}
                  >
                    {data.delta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {Math.abs(data.delta)}%
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-blue-light">
                vs {toHours(data.prevMin)}h {rangeWord}
                {data.best.minutes > 0 && (
                  <>
                    {" · "}best day {formatShortDate(data.best.date)} ({toHours(data.best.minutes)}h)
                  </>
                )}
              </p>
            </div>

            {/* Trend */}
            <div className="min-w-0">
              {n >= 2 ? (
                <>
                  <svg
                    viewBox="0 0 100 42"
                    preserveAspectRatio="none"
                    className="h-28 w-full sm:h-32"
                    role="img"
                    aria-label="Daily hours trend"
                  >
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FCBC36" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#FCBC36" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <polyline
                      points={`0,42 ${linePts.join(" ")} 100,42`}
                      fill="url(#trendFill)"
                      stroke="none"
                    />
                    <polyline
                      points={linePts.join(" ")}
                      fill="none"
                      stroke="#FCBC36"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <div className="mt-1 flex justify-between text-[11px] text-blue-light">
                    <span>{formatShortDate(range.from)}</span>
                    <span>Daily hours</span>
                    <span>{formatShortDate(range.to)}</span>
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-blue-light">
                  A single day — pick a wider range to see the trend.
                </p>
              )}
            </div>
          </div>

          {/* Metric rail */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
            <HeroStat
              value={
                <>
                  {data.activeDays}
                  <span className="text-sm font-medium text-blue-light">/{data.rangeDays}</span>
                </>
              }
              label="Active days"
            />
            <HeroStat value={`${toHours(data.avgActive)}h`} label="Avg / active day" />
            <HeroStat value={data.total} label="Entries" testId="kpi-entries" />
            <HeroStat
              value={
                <span data-test-id="kpi-done">
                  {donePct}
                  <span className="text-sm font-medium text-blue-light">%</span>
                </span>
              }
              label="Completed"
            />
          </div>
        </section>

        {data.total === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <TrendingUp size={32} className="text-blue-light" />
            <p className="text-sm font-medium text-ink">Nothing logged in this range</p>
            <p className="max-w-xs text-sm text-muted">
              Pick a different range, or head back and log some work.
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
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Where the time went — category share */}
              <div className="card p-5">
                <SectionTitle
                  eyebrow={
                    data.focus
                      ? `${focusPct}% on ${CATEGORY_MAP[data.focus.category].label.toLowerCase()}`
                      : undefined
                  }
                  title="Where your time went"
                />
                <div className="flex flex-col gap-3.5">
                  {data.byCategory.map((c) => {
                    const meta = CATEGORY_MAP[c.category];
                    const pct = Math.round((c.minutes / data.thisMin) * 100);
                    return (
                      <div key={c.category}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-2 font-medium text-ink">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: meta.color }}
                            />
                            {meta.label}
                          </span>
                          <span className="tabular-nums text-muted">
                            {formatDuration(c.minutes)}
                            <span className="ml-1.5 text-hairline">·</span>
                            <span className="ml-1.5 font-semibold text-ink">{pct}%</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(c.minutes / maxCat) * 100}%`,
                              backgroundColor: meta.color,
                            }}
                            role="img"
                            aria-label={`${meta.label}: ${formatDuration(c.minutes)}, ${pct}%`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly rhythm */}
              <div className="card p-5">
                <SectionTitle
                  eyebrow={
                    data.busiestIdx >= 0 ? `busiest on ${WEEKDAY_LABELS[data.busiestIdx]}` : undefined
                  }
                  title="Weekly rhythm"
                />
                <div className="flex h-44 items-end justify-between gap-2">
                  {data.byWeekday.map((min, i) => {
                    const isToday = highlightToday && i === todayIdx;
                    const isPeak = i === data.busiestIdx;
                    return (
                      <div key={i} className="flex h-full flex-1 flex-col items-center gap-1.5">
                        <span className="text-[10px] tabular-nums text-muted">
                          {min > 0 ? toHours(min) : ""}
                        </span>
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className="w-full rounded-t-md transition-all duration-500"
                            style={{
                              height: `${Math.max(min > 0 ? 6 : 0, (min / maxDay) * 100)}%`,
                              backgroundColor: isToday
                                ? "#F37E31"
                                : isPeak
                                  ? "#2E7CC4"
                                  : "#96C0E0",
                            }}
                            role="img"
                            aria-label={`${WEEKDAY_LABELS[i]}: ${formatDuration(min)}`}
                          />
                        </div>
                        <span
                          className={`text-[11px] ${
                            isToday ? "font-bold text-orange-brand" : "text-muted"
                          }`}
                        >
                          {WEEKDAY_LABELS[i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Progress donut */}
              <div className="card p-5">
                <SectionTitle title="Progress at a glance" />
                <div className="flex items-center gap-6">
                  <div className="relative h-32 w-32 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgb(var(--canvas))"
                        strokeWidth="13"
                      />
                      {donut.map((seg) => (
                        <circle
                          key={seg.s}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={STATUS_COLOR[seg.s]}
                          strokeWidth="13"
                          pathLength={100}
                          strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                          strokeDashoffset={-seg.offset}
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-navy" style={DISPLAY}>
                        {donePct}%
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted">done</span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5">
                    {STATUS_ORDER.map((s) => (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-2 text-ink">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: STATUS_COLOR[s] }}
                          />
                          {STATUS_META[s].label}
                        </span>
                        <span className="tabular-nums font-semibold text-navy">
                          {data.status[s]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top tickets */}
              <div className="card p-5">
                <SectionTitle title="Top tickets" />
                {data.tickets.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">
                    No ticketed work in this range.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {data.tickets.map((t) => (
                      <div key={t.ticket}>
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                          <TicketPill ticketNumber={t.ticket} ticketUrl={t.url} />
                          <span className="tabular-nums text-muted">
                            {formatDuration(t.minutes)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                          <div
                            className="h-full rounded-full bg-blue-brand transition-all duration-500"
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

        {/* Activity heatmap (all history, last 26 weeks) */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="Activity" />
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
                        className="h-[12px] w-[12px] rounded-[3px] transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-blue-brand"
                        style={{
                          backgroundColor: cell.future ? "transparent" : heatColor(cell.minutes),
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
            <span
              className="h-[12px] w-[12px] rounded-[3px]"
              style={{ backgroundColor: "rgb(var(--hairline))" }}
            />
            {HEAT_LEVELS.map((c) => (
              <span
                key={c}
                className="h-[12px] w-[12px] rounded-[3px]"
                style={{ backgroundColor: c }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </main>
  );
}
