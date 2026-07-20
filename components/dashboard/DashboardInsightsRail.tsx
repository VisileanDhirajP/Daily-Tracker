"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Flame, ArrowRight } from "lucide-react";
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
import { TicketPill } from "./TicketPill";

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
