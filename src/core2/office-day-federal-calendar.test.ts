/**
 * Congress's working calendar: the House and Senate sit on their published
 * days, a week is a Washington week or a district week from those days, the
 * holidays follow 5 U.S.C. 6103, and a year past the table keeps the same
 * weekdays and is marked ESTIMATED.
 */
import { describe, expect, it } from "vitest";
import {
  federalHoliday,
  houseSits,
  jointAddress,
  senateSits,
  sittingsInWeek,
  washingtonWeek,
} from "./office-day-federal-calendar";

const weekday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();

describe("federal calendar", () => {
  it("reads the House's published days, sourced", () => {
    // The January 2026 calendar: in session January 6 to 9, out the 16th, district work the week of the 26th.
    expect(houseSits("2026-01-06")).toMatchObject({
      sits: true,
      tag: "SOURCED",
    });
    expect(houseSits("2026-01-16").sits).toBe(false);
    expect(washingtonWeek("house", "2026-01-28")).toBe(false);
    expect(sittingsInWeek("house", "2026-01-07")).toEqual([
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
      "2026-01-09",
    ]);
    // March 31, 2025, the second number in a split cell on the printed calendar.
    expect(houseSits("2025-03-31").sits).toBe(true);
  });

  it("never sits on a weekend, and sits fewer days in an election year", () => {
    let days2025 = 0;
    let days2026 = 0;
    for (
      let ms = Date.UTC(2025, 0, 1);
      ms < Date.UTC(2027, 0, 1);
      ms += 86_400_000
    ) {
      const d = new Date(ms).toISOString().slice(0, 10);
      if (!houseSits(d).sits) continue;
      expect([0, 6]).not.toContain(weekday(d));
      if (d < "2026") days2025++;
      else days2026++;
    }
    expect(days2025).toBe(136);
    expect(days2026).toBe(105);
  });

  it("keeps the Senate out on its state work periods and holidays", () => {
    expect(senateSits("2025-08-12").sits).toBe(false);
    expect(senateSits("2025-09-09").sits).toBe(true);
    expect(senateSits("2025-09-01").sits).toBe(false);
    expect(federalHoliday("2025-09-01")).toBe("labor-day");
    expect(federalHoliday("2026-07-03")).toBe("independence-day"); // July 4, 2026 is a Saturday
    expect(federalHoliday("2025-05-26")).toBe("memorial-day");
    expect(federalHoliday("2025-11-27")).toBe("thanksgiving-day");
  });

  it("estimates a later year on the same weekdays", () => {
    const sat = houseSits("2027-01-12");
    expect(sat.tag).toBe("ESTIMATED");
    let days = 0;
    for (
      let ms = Date.UTC(2027, 0, 1);
      ms < Date.UTC(2028, 0, 1);
      ms += 86_400_000
    ) {
      const d = new Date(ms).toISOString().slice(0, 10);
      if (!houseSits(d).sits) continue;
      days++;
      expect([0, 6]).not.toContain(weekday(d));
    }
    // A first session repeats 2025's count, give or take a day lost at the year's edge.
    expect(days).toBeGreaterThan(130);
  });

  it("puts the joint address on its date, a Tuesday in later years", () => {
    expect(jointAddress(2026)).toMatchObject({
      date: "2026-02-24",
      kind: "state-of-the-union",
      tag: "SOURCED",
    });
    expect(jointAddress(2025).kind).toBe("joint-address");
    const later = jointAddress(2027);
    expect(later.tag).toBe("ESTIMATED");
    expect(weekday(later.date)).toBe(2);
    expect(jointAddress(2029).kind).toBe("joint-address");
  });
});
