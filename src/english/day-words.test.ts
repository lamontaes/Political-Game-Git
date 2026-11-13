import { describe, expect, it } from "vitest";
import { dateSaid, dayOpening, daySince, ordinalDay } from "./day-words";

describe("a day named as people say it", () => {
  it("gives every day of the month its ordinal", () => {
    const said = Array.from({ length: 31 }, (_, at) => ordinalDay(at + 1));
    expect(said.slice(0, 4)).toEqual(["1st", "2nd", "3rd", "4th"]);
    expect(said[10]).toBe("11th");
    expect(said[11]).toBe("12th");
    expect(said[12]).toBe("13th");
    expect(said[20]).toBe("21st");
    expect(said[21]).toBe("22nd");
    expect(said[22]).toBe("23rd");
    expect(said[30]).toBe("31st");
  });
  it("names the date without a year", () => {
    expect(dateSaid("2026-06-07")).toBe("June 7th");
    expect(dateSaid("2025-01-20")).toBe("January 20th");
  });
  it("opens a scene on the part of the day", () => {
    expect(dayOpening("2026-06-07", 8 * 60 + 30)).toBe(
      "First thing on June 7th",
    );
    expect(dayOpening("2026-06-07", 12 * 60)).toBe("Around noon on June 7th");
    expect(dayOpening("2026-06-07", 15 * 60)).toBe(
      "On the afternoon of June 7th",
    );
    expect(dayOpening("2026-06-07", 23 * 60)).toBe("Late on June 7th");
  });
  it("tells a day in another year with its year, never as a bare date (Fable A, Nov 13, rule 3)", () => {
    // Playtester P2, Hewitt NJ: on January 31st, "about what happened on
    // February 20th" meant a February a year gone.
    expect(daySince("2025-02-20", "2026-01-31")).toBe("last February");
    expect(daySince("2025-12-30", "2026-01-12")).toBe("last December");
    expect(daySince("2023-02-20", "2026-01-31")).toBe("in February 2023");
    // This year's date stays a bare month and day; a recent day stays recent
    // across the new year.
    expect(daySince("2026-01-03", "2026-01-31")).toBe("on January 3rd");
    expect(daySince("2025-12-31", "2026-01-01")).toBe("yesterday");
    expect(daySince("2025-12-29", "2026-01-02")).toBe("the other day");
  });
});
