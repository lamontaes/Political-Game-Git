import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { STATES } from "../state-reference";
import {
  stateStatuteOperativeAt,
  statuteEffectiveRule,
} from "./statute-effective-date";

const at = (key: string, enacted: string) =>
  stateStatuteOperativeAt(key, makeIsoDate(enacted));

describe("when a state law takes effect by its state's own rule", () => {
  it("gives every place either a well-formed rule or none, never a guess", () => {
    const places = [
      ...Object.keys(STATES).map((usps) => `US-${usps}`),
      "US-DC",
      "US-PR",
      "US-GU",
      "US-VI",
      "US-AS",
      "US-MP",
    ];
    let researched = 0;
    for (const key of places) {
      const rule = statuteEffectiveRule(key);
      const operative = at(key, "2026-03-15");
      if (!rule) {
        expect(operative, key).toBeNull();
        continue;
      }
      researched += 1;
      // Never before the act, and within a year and a half of it.
      expect(operative! >= makeIsoDate("2026-03-15"), key).toBe(true);
      expect(operative! < makeIsoDate("2027-09-15"), key).toBe(true);
    }
    expect(researched).toBe(5);
    expect(statuteEffectiveRule("US-TX")).toBeNull();
    expect(statuteEffectiveRule("US")).toBeNull();
  });

  it("counts ninety days from the act in Alaska and Ohio", () => {
    expect(at("US-AK", "2026-03-01")).toBe("2026-05-30");
    expect(at("US-OH", "2026-07-15")).toBe("2026-10-13");
  });

  it("waits for the next June 1 in Maryland and the next August 1 in Minnesota", () => {
    expect(at("US-MD", "2026-04-10")).toBe("2026-06-01");
    expect(at("US-MD", "2026-06-01")).toBe("2027-06-01");
    expect(at("US-MN", "2026-05-20")).toBe("2026-08-01");
    expect(at("US-MN", "2026-09-02")).toBe("2027-08-01");
  });

  it("counts ninety days from Missouri's May 30 adjournment, so August 28", () => {
    expect(at("US-MO", "2026-04-02")).toBe("2026-08-28");
    expect(at("US-MO", "2026-07-10")).toBe("2026-08-28");
    // Past the regular session's date: never before the act itself.
    expect(at("US-MO", "2026-09-15")).toBe("2026-09-15");
  });
});
