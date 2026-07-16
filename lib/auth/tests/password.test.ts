import { scorePassword } from "../password";

describe("scorePassword", () => {
  it("flags short passwords as unacceptable", () => {
    const r = scorePassword("abc");
    expect(r.acceptable).toBe(false);
  });

  it("accepts a reasonable password", () => {
    const r = scorePassword("Demo1234");
    expect(r.acceptable).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(2);
  });

  it("scores stronger passwords higher", () => {
    const weak = scorePassword("aaaaaaaa");
    const strong = scorePassword("Aa1!aa9Xz#kk");
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.label).toBe("Strong");
  });

  it("handles empty input", () => {
    const r = scorePassword("");
    expect(r.score).toBe(0);
    expect(r.acceptable).toBe(false);
  });
});
