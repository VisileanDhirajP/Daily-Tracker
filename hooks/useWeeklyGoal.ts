"use client";

import { useEffect, useState } from "react";

const KEY = "vldt:weekly-goal-hours";

/**
 * A per-browser weekly hours goal (0 = off). Stored in localStorage — it's a
 * personal preference, so it deliberately doesn't round-trip the backend.
 */
export function useWeeklyGoal() {
  const [goalHours, setGoal] = useState(0);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(KEY));
      if (Number.isFinite(v) && v > 0) setGoal(v);
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
