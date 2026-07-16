import { calcStreak } from "../streak";

describe("calcStreak", () => {
  const today = "2026-07-16";

  it("is zero with no entries", () => {
    expect(calcStreak([], today)).toBe(0);
  });

  it("is zero when today has no entry", () => {
    expect(calcStreak(["2026-07-15", "2026-07-14"], today)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(calcStreak(["2026-07-16", "2026-07-15", "2026-07-14"], today)).toBe(3);
  });

  it("stops at the first gap", () => {
    expect(
      calcStreak(["2026-07-16", "2026-07-15", "2026-07-13"], today),
    ).toBe(2);
  });

  it("ignores duplicate dates", () => {
    expect(
      calcStreak(["2026-07-16", "2026-07-16", "2026-07-15"], today),
    ).toBe(2);
  });
});
