import {
  toISODate,
  parseISODate,
  isValidISODate,
  shiftDay,
  dayDiff,
  relativeLabel,
  startOfWeek,
  startOfMonth,
} from "../date";

describe("date helpers", () => {
  it("round-trips a Date to ISO and back", () => {
    const d = new Date(2026, 6, 16); // 16 Jul 2026 local
    expect(toISODate(d)).toBe("2026-07-16");
    expect(parseISODate("2026-07-16")?.getDate()).toBe(16);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isValidISODate("2026-07-16")).toBe(true);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("2026-02-31")).toBe(false);
    expect(isValidISODate("nope")).toBe(false);
  });

  it("shifts days across month boundaries", () => {
    expect(shiftDay("2026-07-31", 1)).toBe("2026-08-01");
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("computes whole-day differences", () => {
    expect(dayDiff("2026-07-16", "2026-07-16")).toBe(0);
    expect(dayDiff("2026-07-16", "2026-07-14")).toBe(2);
    expect(dayDiff("2026-07-14", "2026-07-16")).toBe(-2);
  });

  it("labels relative dates", () => {
    const today = "2026-07-16";
    expect(relativeLabel("2026-07-16", today)).toBe("Today");
    expect(relativeLabel("2026-07-15", today)).toBe("Yesterday");
    expect(relativeLabel("2026-07-17", today)).toBe("Tomorrow");
    expect(relativeLabel("2026-07-13", today)).toBe("3 days ago");
  });

  it("finds Monday-based week start and month start", () => {
    // 2026-07-16 is a Thursday
    expect(startOfWeek("2026-07-16")).toBe("2026-07-13");
    // Sunday should map back to the previous Monday
    expect(startOfWeek("2026-07-19")).toBe("2026-07-13");
    expect(startOfMonth("2026-07-16")).toBe("2026-07-01");
  });
});
