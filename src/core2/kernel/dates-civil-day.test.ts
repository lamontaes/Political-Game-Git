/**
 * The day count read straight from the characters of a date agrees with the
 * calendar for every day, and refuses what the calendar lacks (pool item
 * core-speed-date-parse).
 */
import { expect, it } from "vitest";
import { addDays, daysBetween, makeIsoDate } from "./dates";

it("counts every day from 0000 to 9999 the way the calendar does", () => {
  const base = new Date(0);
  base.setUTCFullYear(0, 0, 1);
  let day = Math.round(base.getTime() / 86_400_000);
  let date = new Date(day * 86_400_000);
  const epoch = makeIsoDate("1970-01-01");
  // Walk the whole span in steps; each step is checked against Date.
  for (; date.getUTCFullYear() < 9999 || date.getUTCMonth() < 11;) {
    const text = `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    if (daysBetween(epoch, makeIsoDate(text)) !== day)
      throw new Error(
        `${text}: ${daysBetween(epoch, makeIsoDate(text))} != ${day}`,
      );
    day += 1;
    date = new Date(day * 86_400_000);
  }
  expect(day).toBeGreaterThan(2_900_000);
});

it("adds days across leap and century years", () => {
  expect(addDays(makeIsoDate("2024-02-28"), 1)).toBe("2024-02-29");
  expect(addDays(makeIsoDate("1900-02-28"), 1)).toBe("1900-03-01");
  expect(addDays(makeIsoDate("2000-02-28"), 2)).toBe("2000-03-01");
});

it("refuses text the calendar lacks", () => {
  for (const bad of [
    "2023-02-29",
    "1900-02-29",
    "2024-13-01",
    "2024-00-10",
    "2024-04-31",
    "2024-1-01",
    "20240101",
    "2024-01-0x",
    "",
  ])
    expect(() => makeIsoDate(bad), bad).toThrow();
  expect(makeIsoDate("2024-02-29")).toBe("2024-02-29");
  expect(makeIsoDate("2000-02-29")).toBe("2000-02-29");
});
