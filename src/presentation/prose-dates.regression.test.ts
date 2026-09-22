import { describe, expect, it } from "vitest";
import {
  proseDate,
  proseMonthYear,
  proseWeekdayDate,
  proseYear,
} from "./prose-dates";

const formatters = { proseDate, proseMonthYear, proseWeekdayDate, proseYear };
const invalidInputs = [
  "2026-02-29",
  "1900-02-29",
  "2100-02-29",
  "2026-02-30",
  "2026-04-31",
  "2026-00-10",
  "2026-13-01",
  "2026-01-00",
  "2026-01-32",
  "0001-02-29",
  "No current record",
  "",
];

describe("prose date calendar integrity", () => {
  for (const [name, format] of Object.entries(formatters)) {
    it.each(invalidInputs)(
      `${name} preserves an invalid/unavailable %j`,
      (input) => {
        expect(format(input)).toBe(input);
      },
    );
  }

  it("preserves the American date, month, weekday and year forms", () => {
    expect(proseDate("2026-01-20")).toBe("January 20, 2026");
    expect(proseMonthYear("2026-01-20")).toBe("January 2026");
    expect(proseWeekdayDate("2026-01-20")).toBe("Tuesday, January 20, 2026");
    expect(proseYear("2026-01-20")).toBe("2026");
  });

  it.each([
    ["0001-01-01", "January 1, 1"],
    ["0099-12-31", "December 31, 99"],
    ["0004-02-29", "February 29, 4"],
    ["2000-02-29", "February 29, 2000"],
    ["2024-02-29", "February 29, 2024"],
  ])("preserves the actual calendar year in %s", (date, expected) => {
    expect(proseDate(date)).toBe(expected);
    expect(proseYear(date)).toBe(date.slice(0, 4));
  });

  it("retains the existing prefix behavior for legacy timestamp callers", () => {
    expect(proseDate("2026-01-20T00:30:00+14:00")).toBe("January 20, 2026");
    expect(proseDate("2026-01-20 legacy suffix")).toBe("January 20, 2026");
    for (const format of Object.values(formatters)) {
      expect(format("2026-02-30T00:00:00Z")).toBe("2026-02-30T00:00:00Z");
    }
  });

  it("matches existing valid contemporary dates without mutating input", () => {
    const input = Object.freeze({ date: "2024-01-01", note: "Original event" });
    const before = JSON.stringify(input);
    const date = new Date(`${input.date}T00:00:00Z`);
    for (let index = 0; index < 1100; index++) {
      const iso = date.toISOString().slice(0, 10);
      expect(proseDate(iso)).toBe(
        date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }),
      );
      expect(proseMonthYear(iso)).toBe(
        date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }),
      );
      expect(proseWeekdayDate(iso)).toBe(
        date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }),
      );
      expect(proseYear(iso)).toBe(iso.slice(0, 4));
      date.setUTCDate(date.getUTCDate() + 1);
    }
    expect(JSON.stringify(input)).toBe(before);
  });
});
