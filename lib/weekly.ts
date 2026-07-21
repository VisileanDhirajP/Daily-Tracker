import { parseISODate, shiftDay, startOfWeek } from "./format/date";

/** Monday-based weekday index (0 = Mon … 6 = Sun). */
export function weekdayIndex(iso: string): number {
  const d = parseISODate(iso);
  if (!d) return 0;
  return (d.getDay() + 6) % 7;
}

/** The Monday–Sunday week containing `iso`. */
export function currentWeek(iso: string): { start: string; end: string } {
  const start = startOfWeek(iso);
  return { start, end: shiftDay(start, 6) };
}

/** A weekly review is "due" from Friday through the weekend. */
export function reviewDue(iso: string): boolean {
  return weekdayIndex(iso) >= 4; // Fri, Sat, Sun
}

export interface GoalProgress {
  goalMinutes: number;
  loggedMinutes: number;
  /** 0–100, capped. 0 when no goal is set. */
  pct: number;
  remainingMinutes: number;
  met: boolean;
}

/** Progress of `loggedMinutes` toward a weekly goal expressed in hours. */
export function goalProgress(loggedMinutes: number, goalHours: number): GoalProgress {
  const goalMinutes = Math.max(0, Math.round((goalHours || 0) * 60));
  if (goalMinutes === 0) {
    return { goalMinutes: 0, loggedMinutes, pct: 0, remainingMinutes: 0, met: false };
  }
  return {
    goalMinutes,
    loggedMinutes,
    pct: Math.min(100, Math.round((loggedMinutes / goalMinutes) * 100)),
    remainingMinutes: Math.max(0, goalMinutes - loggedMinutes),
    met: loggedMinutes >= goalMinutes,
  };
}
