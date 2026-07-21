"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Flame, ArrowRight, Target } from "lucide-react";
import type { Entry } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/constants";
import { inRange, sumMinutes } from "@/lib/entries";
import { calcStreak } from "@/lib/format/streak";
import { startOfWeek, todayISO } from "@/lib/format/date";
import { toHours, formatDuration } from "@/lib/format/time";
import {
  minutesByCategory,
  minutesByTicket,
  percentChange,
  previousPeriod,
} from "@/lib/insights";
import { goalProgress } from "@/lib/weekly";
import { useWeeklyGoal } from "@/hooks/useWeeklyGoal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TicketPill } from "./TicketPill";

const GOAL_PRESETS = [10, 20, 30, 40];

function GoalControl({
  goalHours,
  onChange,
}: {
  goalHours: number;
  onChange: (h: number) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-test-id="weekly-goal-edit"
          className="text-xs font-semibold text-blue-brand hover:underline"
        >
          {goalHours > 0 ? `${goalHours}h ▾` : "Set a goal"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48">
        <p className="mb-2 text-xs font-medium text-muted">Weekly goal (hours)</p>
        <div className="grid grid-cols-4 gap-1">
          {GOAL_PRESETS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onChange(h)}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                goalHours === h
                  ? "bg-blue-brand text-white"
                  : "bg-canvas text-ink hover:bg-blue-brand/10"
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
        {goalHours > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="mt-2 w-full rounded-lg py-1 text-xs text-muted hover:text-orange-brand"
          >
            Turn off
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Desktop-only right rail: at-a-glance weekly stats (fills the side space). */
export function DashboardInsightsRail({ entries }: { entries: Entry[] }) {
  const d = useMemo(() => {
    const today = todayISO();
    const wk = startOfWeek(today);
    const prev = previousPeriod(wk, today);
    const scoped = inRange(entries, wk, today);
    const thisMin = sumMinutes(scoped);
    const prevMin = sumMinutes(inRange(entries, prev.from, prev.to));
    return {
      thisMin,
      prevMin,
      delta: percentChange(thisMin, prevMin),
      byCat: minutesByCategory(scoped).slice(0, 5),
      tickets: minutesByTicket(scoped).slice(0, 4),
      streak: calcStreak(entries.map((e) => e.entry_date)),
      count: scoped.length,
    };
  }, [entries]);

  const { goalHours, setGoalHours } = useWeeklyGoal();
  const gp = goalProgress(d.thisMin, goalHours);
  const maxCat = Math.max(1, ...d.byCat.map((c) => c.minutes));
  const maxTicket = Math.max(1, ...d.tickets.map((t) => t.minutes));

  return (
    <div className="sticky top-6 flex flex-col gap-4">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted">This week</p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-brand">
            <Flame size={13} />
            {d.streak}d
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-navy">{toHours(d.thisMin)}h</span>
          {d.delta !== null && d.delta !== 0 && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                d.delta > 0 ? "text-[#1f8a4c]" : "text-orange-brand"
              }`}
            >
              {d.delta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {Math.abs(d.delta)}%
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          {d.count} {d.count === 1 ? "entry" : "entries"} · vs {toHours(d.prevMin)}h last week
        </p>

        <div className="mt-3 border-t border-hairline pt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
              <Target size={12} className="text-blue-brand" /> Weekly goal
            </span>
            <GoalControl goalHours={goalHours} onChange={setGoalHours} />
          </div>
          {goalHours > 0 ? (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${gp.pct}%`,
                    backgroundColor: gp.met ? "#1f8a4c" : "#2E7CC4",
                  }}
                  role="img"
                  aria-label={`Weekly goal ${gp.pct}% complete`}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {gp.met
                  ? `Goal met — ${toHours(d.thisMin)}h logged 🎉`
                  : `${toHours(d.thisMin)}h of ${goalHours}h · ${toHours(gp.remainingMinutes)}h to go`}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted">Set a target to track your week.</p>
          )}
        </div>
      </div>

      {d.byCat.length > 0 && (
        <div className="card p-4">
          <p className="mb-3 text-xs font-medium text-muted">By category</p>
          <div className="flex flex-col gap-2.5">
            {d.byCat.map((c) => {
              const meta = CATEGORY_MAP[c.category];
              return (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink">{meta.label}</span>
                    <span className="text-muted">{formatDuration(c.minutes)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.minutes / maxCat) * 100}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {d.tickets.length > 0 && (
        <div className="card p-4">
          <p className="mb-3 text-xs font-medium text-muted">Top tickets</p>
          <div className="flex flex-col gap-2.5">
            {d.tickets.map((t) => (
              <div key={t.ticket}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <TicketPill ticketNumber={t.ticket} ticketUrl={t.url} />
                  <span className="shrink-0 text-muted">{formatDuration(t.minutes)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-blue-brand"
                    style={{ width: `${(t.minutes / maxTicket) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/insights"
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-hairline py-2 text-sm font-medium text-blue-brand hover:bg-blue-brand/10"
      >
        Full insights <ArrowRight size={15} />
      </Link>
    </div>
  );
}
