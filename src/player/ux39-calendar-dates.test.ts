import { describe, expect, it } from "vitest";
import {
  calendarDisplayDate,
  calendarPeriodDates,
  calendarShiftDate,
  calendarShiftPeriod,
} from "./ux39-calendar-dates";
describe("UX39 calendar presentation dates", () => {
  it("renders every leap-February day and adjacent week cells in seven columns", () => {
    const dates = calendarPeriodDates("2024-02-29", "month");
    expect(dates).toHaveLength(35);
    expect(dates[0]).toBe("2024-01-28");
    expect(dates.at(-1)).toBe("2024-03-02");
    expect(dates.filter((date) => date.startsWith("2024-02"))).toHaveLength(29);
    expect(new Set(dates).size).toBe(dates.length);
  });
  it("covers six-week months and crosses years without skipping a week", () => {
    expect(calendarPeriodDates("2026-08-31", "month")).toHaveLength(42);
    expect(calendarPeriodDates("2026-01-01", "week")).toEqual([
      "2025-12-28",
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
    expect(calendarShiftPeriod("2026-01-31", "month", 1)).toBe("2026-02-01");
    expect(calendarShiftPeriod("2026-12-31", "month", 1)).toBe("2027-01-01");
    expect(calendarShiftDate("2024-03-01", -1)).toBe("2024-02-29");
  });
  it("changes only displayed order, with explicit UTC across local DST dates", () => {
    expect(calendarDisplayDate("2026-03-08", "month-day")).toBe(
      "March 8, 2026",
    );
    // british-spelling-ok: the optional day-first setting a player can choose.
    expect(calendarDisplayDate("2026-03-08", "day-month")).toBe("8 March 2026");
    expect(calendarShiftPeriod("2026-03-08", "week", 1)).toBe("2026-03-15");
  });
});
