import { describe, expect, it } from "vitest";
import { spokenWhen } from "./words";

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
