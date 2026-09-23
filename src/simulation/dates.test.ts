import { describe, expect, it } from "vitest";

import { addDays, completedMonthsBetween, makeIsoDate } from "./dates";
import type { IsoDate } from "./types";

describe("simulation dates", () => {
  const months = (from: string, to: string) =>
    completedMonthsBetween(makeIsoDate(from), makeIsoDate(to));

  it("counts only whole completed months, and never rounds one up", () => {
    // The plain case a residence requirement turns on.
    expect(months("2026-05-03", "2026-11-03")).toBe(6);
    expect(months("2026-05-04", "2026-11-03")).toBe(5);
    expect(months("2026-11-03", "2026-11-03")).toBe(0);

    // A year is twelve of them, so a requirement stated either way compares.
    expect(months("2025-01-05", "2026-01-05")).toBe(12);
    expect(months("2025-01-05", "2026-01-04")).toBe(11);
  });

  it("treats a short month's last day as the anniversary", () => {
    // January 31 has no February 31, so February 28 is a completed month
    // rather than nought. Counting days instead would get this wrong in the
    // direction that refuses somebody the law admits.
    expect(months("2026-01-31", "2026-02-28")).toBe(1);
    expect(months("2026-01-31", "2026-03-30")).toBe(1);
    expect(months("2026-01-31", "2026-03-31")).toBe(2);
    expect(months("2024-01-31", "2024-02-29")).toBe(1);
  });

  it("advances through month and leap-year boundaries in UTC-safe date space", () => {
    expect(addDays(makeIsoDate("2026-01-31"), 1)).toBe("2026-02-01");
    expect(addDays(makeIsoDate("2024-02-28"), 1)).toBe("2024-02-29");
    expect(addDays(makeIsoDate("2024-02-28"), 2)).toBe("2024-03-01");
    expect(addDays(makeIsoDate("2025-02-28"), 1)).toBe("2025-03-01");
  });

  it("rejects invalid dates and non-integer movement", () => {
    expect(() => makeIsoDate("2025-02-29")).toThrow();
    expect(() => makeIsoDate("2026-04-31")).toThrow();
    expect(() => addDays("2026-02-31" as IsoDate, 1)).toThrow();
    expect(() => addDays(makeIsoDate("2026-01-01"), 1.5)).toThrow();
  });
});
