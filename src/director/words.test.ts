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

describe("a date is said without its year (the owner's rule, no-year-in-speech)", () => {
  it("says a day plainly, in this year or another", () => {
    expect(spokenDate("2025-11-04", "2025-06-01")).toBe("November 4");
    expect(spokenDate("2026-06-02", "2025-11-10")).toBe("June 2");
  });
  it("never carries a year, in any gap", () => {
    for (const iso of ["2024-02-03", "2026-02-03", "2028-02-03", "2031-12-31"])
      expect(spokenDate(iso, "2025-11-10")).not.toMatch(/\d{4}/);
  });
});
