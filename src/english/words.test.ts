import { describe, expect, it } from "vitest";
import { properName, spokenDate, spokenWhen } from "./words";

describe("how long ago is said", () => {
  it("never says a calendar date, whatever the gap", () => {
    const today = "2027-03-15";
    const said = new Set<string>();
    for (let days = 0; days < 3000; days += 1) {
      const then = new Date(Date.parse(`${today}T00:00:00Z`) - days * 864e5)
        .toISOString()
        .slice(0, 10);
      const text = spokenWhen(then, today);
      said.add(text);
      expect(text).not.toMatch(/\d/);
      expect(text).not.toMatch(/^on\b/);
    }
    // The gap slides through several phrasings, not one.
    expect(said.size).toBeGreaterThan(5);
    expect(spokenWhen(today, today)).toBe("today");
  });
});

describe("properName", () => {
  it("keeps a broadcast call sign in capitals", () => {
    expect(properName("KTKY-TV")).toBe("KTKY-TV");
    expect(properName("WNIA-TV")).toBe("WNIA-TV");
    expect(properName("KQED-FM")).toBe("KQED-FM");
  });
  it("still writes other all-capital record names word by word", () => {
    expect(properName("CENTRAL HIGH")).toBe("Central High");
    expect(properName("WEST")).toBe("West");
    expect(properName("COUNTY OF WASHINGTON treasury")).toBe(
      "County of Washington treasury",
    );
    // A whole name in capitals keeps its small words small too.
    expect(properName("COUNTY OF CARBON")).toBe("County of Carbon");
    expect(properName("TOWN OF SINCLAIR")).toBe("Town of Sinclair");
  });
});

it("says a spoken date as day-words does: ordinal day, the year only in another year", () => {
  expect(spokenDate("2026-06-07", "2026-01-20")).toBe("June 7th");
  expect(spokenDate("2027-06-01", "2026-01-20")).toBe("June 1st, 2027");
});
