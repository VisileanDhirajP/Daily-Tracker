import { weekdayIndex, currentWeek, reviewDue, goalProgress } from "../weekly";

describe("weekly helpers", () => {
  it("computes a Monday-based weekday index", () => {
    expect(weekdayIndex("2026-07-20")).toBe(0); // Monday
    expect(weekdayIndex("2026-07-24")).toBe(4); // Friday
    expect(weekdayIndex("2026-07-26")).toBe(6); // Sunday
  });

  it("returns the Mon–Sun week for a date", () => {
    expect(currentWeek("2026-07-22")).toEqual({ start: "2026-07-20", end: "2026-07-26" });
  });

  it("marks a review due Fri–Sun only", () => {
    expect(reviewDue("2026-07-23")).toBe(false); // Thu
    expect(reviewDue("2026-07-24")).toBe(true); // Fri
    expect(reviewDue("2026-07-25")).toBe(true); // Sat
    expect(reviewDue("2026-07-26")).toBe(true); // Sun
  });

  it("computes goal progress and caps at 100%", () => {
    expect(goalProgress(600, 20)).toMatchObject({ pct: 50, remainingMinutes: 600, met: false });
    expect(goalProgress(1300, 20)).toMatchObject({ pct: 100, remainingMinutes: 0, met: true });
    expect(goalProgress(300, 0)).toMatchObject({ goalMinutes: 0, pct: 0, met: false });
  });
});
