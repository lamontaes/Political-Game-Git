import { describe, expect, it } from "vitest";
import { meetsOn, type MeetingRule } from "./office-day-calendar";

const rule = (intervalDays: number, weeksOfMonth: number[]): MeetingRule => ({
  officeId: "office:test:council",
  intervalDays,
  weekday: 2,
  weeksOfMonth,
  startMinute: 1080,
  minutes: 150,
  source: { tag: "ESTIMATED", asOf: "2026-10-01", citation: "test" },
});

describe("a local body's regular meetings", () => {
  it("a twice-monthly body meets on the first and third Tuesday", () => {
    const days = Array.from(
      { length: 31 },
      (_, i) => `2026-12-${String(i + 1).padStart(2, "0")}`,
    ).filter((d) => meetsOn(rule(14, [1, 3]), d));
    expect(days).toEqual(["2026-12-01", "2026-12-15"]);
  });
  it("a monthly body meets on the first Tuesday, a weekly body every Tuesday", () => {
    const month = Array.from(
      { length: 30 },
      (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`,
    );
    expect(month.filter((d) => meetsOn(rule(30, [1]), d))).toEqual([
      "2026-11-03",
    ]);
    expect(month.filter((d) => meetsOn(rule(7, []), d))).toHaveLength(4);
  });
});
