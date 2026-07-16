import {
  splitMinutes,
  toMinutes,
  formatDuration,
  toHours,
  formatHours,
} from "../time";

describe("time formatting", () => {
  it("splits total minutes into hours + minutes", () => {
    expect(splitMinutes(0)).toEqual({ hours: 0, minutes: 0 });
    expect(splitMinutes(59)).toEqual({ hours: 0, minutes: 59 });
    expect(splitMinutes(60)).toEqual({ hours: 1, minutes: 0 });
    expect(splitMinutes(135)).toEqual({ hours: 2, minutes: 15 });
  });

  it("clamps negatives and floors floats", () => {
    expect(splitMinutes(-30)).toEqual({ hours: 0, minutes: 0 });
    expect(splitMinutes(90.9)).toEqual({ hours: 1, minutes: 30 });
  });

  it("combines hours + minutes", () => {
    expect(toMinutes(2, 15)).toBe(135);
    expect(toMinutes(0, 0)).toBe(0);
    expect(toMinutes(-1, -5)).toBe(0);
  });

  it("formats compact durations", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(135)).toBe("2h 15m");
  });

  it("converts to decimal hours", () => {
    expect(toHours(135)).toBe(2.25);
    expect(toHours(90)).toBe(1.5);
    expect(formatHours(90)).toBe("1.5h");
  });
});
