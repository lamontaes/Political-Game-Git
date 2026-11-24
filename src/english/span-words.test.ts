import { describe, expect, it } from "vitest";
import { spanSaid } from "./span-words";

describe("a span of days as people say it", () => {
  it("tells a year or less in months", () => {
    expect(spanSaid(0)).toBe("less than a month");
    expect(spanSaid(95)).toBe("three months");
    expect(spanSaid(330)).toBe("eleven months");
  });
  it("tells a longer span in years, never the same words for all of them", () => {
    expect(spanSaid(400)).toBe("a year");
    expect(spanSaid(550)).toBe("a year and a half");
    expect(spanSaid(730)).toBe("two years");
    expect(spanSaid(365 * 9)).toBe("nine years");
    expect(spanSaid(365 * 26)).toBe("about twenty-five years");
    expect(spanSaid(365 * 41)).toBe("about forty years");
    expect(spanSaid(365 * 90)).toBe("more than eighty years");
    const said = new Set(
      [400, 550, 730, 1500, 3000, 6000, 12000, 20000, 40000].map(spanSaid),
    );
    expect(said.size).toBe(9);
  });
  it("never says a number or a day count", () => {
    for (let days = 0; days < 40000; days += 97)
      expect(spanSaid(days)).not.toMatch(/\d/);
  });
});
