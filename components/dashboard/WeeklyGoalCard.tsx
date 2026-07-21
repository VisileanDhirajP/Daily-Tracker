"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";
import type { Entry } from "@/lib/types";
import { inRange, sumMinutes } from "@/lib/entries";
import { startOfWeek, todayISO } from "@/lib/format/date";
import { toHours } from "@/lib/format/time";
import { goalProgress } from "@/lib/weekly";
import { useWeeklyGoal } from "@/hooks/useWeeklyGoal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const GOAL_PRESETS = [10, 20, 30, 40];

/**
 * Compact weekly-goal tracker for the dashboard rail: this week's logged hours
 * against a per-week target, with a popover to set/clear the goal. The goal is
 * stored per browser via useWeeklyGoal.
 */
export function WeeklyGoalCard({ entries }: { entries: Entry[] }) {
  const thisMin = useMemo(() => {
    const today = todayISO();
    return sumMinutes(inRange(entries, startOfWeek(today), today));
  }, [entries]);

  const { goalHours, setGoalHours } = useWeeklyGoal();
  const gp = goalProgress(thisMin, goalHours);

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Target size={13} className="text-blue-brand" /> Weekly goal
        </span>
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
                  onClick={() => setGoalHours(h)}
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
                onClick={() => setGoalHours(0)}
                className="mt-2 w-full rounded-lg py-1 text-xs text-muted hover:text-orange-brand"
              >
                Turn off
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {goalHours > 0 ? (
        <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${gp.pct}%`, backgroundColor: gp.met ? "#1f8a4c" : "#2E7CC4" }}
              role="img"
              aria-label={`Weekly goal ${gp.pct}% complete`}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {gp.met
              ? `Goal met — ${toHours(thisMin)}h logged 🎉`
              : `${toHours(thisMin)}h of ${goalHours}h · ${toHours(gp.remainingMinutes)}h to go`}
          </p>
        </>
      ) : (
        <p className="text-xs text-muted">Set a weekly target to track your progress.</p>
      )}
    </div>
  );
}
