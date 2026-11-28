import { describe, expect, it } from "vitest";
import {
  isoDateFromParts,
  lastDayOfMonth,
  nthWeekdayOfMonth,
  weekdayOf,
} from "../../../../src/core2/kernel/dates";

/** The calendar facts the helpers replace, written the way the copies wrote them (through Date, which these tests may use). */
const dateWeekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
const dateLastDay = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();
function dateNthWeekday(
  year: number,
  month: number,
  weekday: number,
  nth: number,
): string {
  if (nth > 0) {
    const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const day = 1 + ((weekday - first + 7) % 7) + 7 * (nth - 1);
    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  }
  const last = new Date(Date.UTC(year, month, 0));
  const back = (last.getUTCDay() - weekday + 7) % 7;
  const day = last.getUTCDate() - back + 7 * (nth + 1);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

describe("weekday, last day and nth weekday of a month", () => {
  it("name the weekday of known days", () => {
    expect(weekdayOf("1970-01-01")).toBe(4);
    expect(weekdayOf("2026-11-27")).toBe(5);
    expect(weekdayOf("1925-01-01")).toBe(4);
    expect(weekdayOf("2000-02-29")).toBe(2);
  });

  it("agree with the calendar for every day of 1900 to 2200", () => {
    for (let year = 1900; year <= 2200; year += 1)
      for (let month = 1; month <= 12; month += 1) {
        const last = lastDayOfMonth(year, month);
        expect(last).toBe(dateLastDay(year, month));
        for (let day = 1; day <= last; day += 1)
          expect(weekdayOf(isoDateFromParts(year, month, day))).toBe(
            dateWeekday(isoDateFromParts(year, month, day)),
          );
      }
  });

  it("count a month outside 1 to 12 on into the next or the previous year", () => {
    expect(lastDayOfMonth(2026, 13)).toBe(31);
    expect(lastDayOfMonth(2026, 14)).toBe(28);
    expect(lastDayOfMonth(2027, 0)).toBe(31);
    expect(lastDayOfMonth(2028, 2)).toBe(29);
    expect(lastDayOfMonth(2100, 2)).toBe(28);
    expect(lastDayOfMonth(2000, 2)).toBe(29);
  });

  it("find the nth and the last weekday of a month as the Date arithmetic did", () => {
    for (let year = 1925; year <= 2100; year += 1)
      for (let month = 1; month <= 12; month += 1)
        for (let weekday = 0; weekday <= 6; weekday += 1)
          for (const nth of [1, 2, 3, 4, 5, -1, -2])
            expect(nthWeekdayOfMonth(year, month, weekday, nth)).toBe(
              dateNthWeekday(year, month, weekday, nth),
            );
  });

  it("names the holidays and election days that use them", () => {
    // Thanksgiving, Election Day (the Tuesday after the first Monday), Memorial Day.
    expect(nthWeekdayOfMonth(2026, 11, 4, 4)).toBe("2026-11-26");
    expect(nthWeekdayOfMonth(2026, 5, 1, -1)).toBe("2026-05-25");
    expect(nthWeekdayOfMonth(2024, 2, 4, -1)).toBe("2024-02-29");
  });
});
