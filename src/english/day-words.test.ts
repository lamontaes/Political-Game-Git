import { describe, expect, it } from "vitest";
import { dateSaid, dayOpening, ordinalDay } from "./day-words";

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
});
