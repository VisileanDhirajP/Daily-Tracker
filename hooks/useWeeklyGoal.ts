"use client";

import { useEffect, useState } from "react";

const KEY = "vldt:weekly-goal-hours";

/** Sensible starting target — a standard full work week. Users can change it. */
export const DEFAULT_GOAL_HOURS = 40;

/**
 * A per-browser weekly hours goal (0 = off). Defaults to 40h until the user
 * picks their own. Stored in localStorage — it's a personal preference, so it
 * deliberately doesn't round-trip the backend. A stored 0 means the user
 * explicitly turned it off, so we honour that rather than re-applying the
 * default on the next load.
 */
export function useWeeklyGoal() {
  const [goalHours, setGoal] = useState(DEFAULT_GOAL_HOURS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) return; // no preference yet → keep the 40h default
      const v = Number(raw);
      if (Number.isFinite(v) && v >= 0) setGoal(Math.min(168, Math.round(v)));
    } catch {
      /* ignore */
    }
  }, []);

  const setGoalHours = (h: number) => {
    const next = Number.isFinite(h) && h > 0 ? Math.min(168, Math.round(h)) : 0;
    setGoal(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      /* ignore */
    }
  };

  return { goalHours, setGoalHours };
}
