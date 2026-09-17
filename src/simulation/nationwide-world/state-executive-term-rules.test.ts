import { describe, expect, it } from "vitest";

import { makeIsoDate as d } from "../dates";
import { US_STATE_USPS } from "./state-executive-candidacy-packs";
import {
  STATE_EXECUTIVE_GAME_PROFILE_VERSION,
  commencementAfter,
  generalElectionDay,
  isFullyVerified,
  nextRegularElection,
  regularTermWindowOn,
  stateExecutiveTermRule,
  termDatesAfterElection,
} from "./state-executive-term-rules";

describe("state executive term rules", () => {
  it("gives every state a rule with an explicit basis", () => {
    for (const usps of US_STATE_USPS) {
      const rule = stateExecutiveTermRule(usps)!;
      expect(rule.stateUsps).toBe(usps);
      for (const basis of Object.values(rule.basis))
        expect(["verified", "game-profile"]).toContain(basis);
      if (isFullyVerified(rule)) {
        // A verified rule always carries its sources and excerpts.
        expect(rule.sources.length).toBeGreaterThan(0);
        for (const source of rule.sources) {
          expect(source.url).toMatch(/^https:\/\//);
          expect(source.excerpt.length).toBeGreaterThan(5);
        }
      } else {
        expect(rule.ruleVersion).toBe(STATE_EXECUTIVE_GAME_PROFILE_VERSION);
        // The game profile never pretends to cite law.
        expect(rule.sources).toEqual([]);
      }
    }
    expect(stateExecutiveTermRule("DC")).toBeNull();
  });

  it("dates Washington from RCW 43.01.010: Wednesday after the second Monday of January", () => {
    const wa = stateExecutiveTermRule("WA")!;
    expect(isFullyVerified(wa)).toBe(true);
    expect(generalElectionDay(wa.election, 2028)).toBe("2028-11-07");
    expect(nextRegularElection(wa, d("2026-01-05"))).toBe("2028-11-07");
    // Second Monday of January 2029 is the 8th; the Wednesday after is the 10th.
    expect(termDatesAfterElection(wa, d("2028-11-07"))).toEqual({
      startsAt: "2029-01-10",
      endsAt: "2033-01-12",
    });
    // January 2025: second Monday the 13th, Wednesday the 15th.
    expect(commencementAfter(wa.commencement, d("2024-11-05"))).toBe(
      "2025-01-15",
    );
    expect(regularTermWindowOn(wa, d("2026-01-05"))).toEqual({
      startsAt: "2025-01-15",
      endsAt: "2029-01-10",
    });
  });

  it("dates a game-profile state from its disclosed calendar", () => {
    const ohio = stateExecutiveTermRule("OH")!;
    expect(ohio.basis.commencement).toBe("game-profile");
    expect(nextRegularElection(ohio, d("2026-01-05"))).toBe("2026-11-03");
    expect(nextRegularElection(ohio, d("2026-11-04"))).toBe("2030-11-05");
    // First Monday of January 2027 is the 4th; of 2031, the 6th.
    expect(termDatesAfterElection(ohio, d("2026-11-03"))).toEqual({
      startsAt: "2027-01-04",
      endsAt: "2031-01-06",
    });
    expect(regularTermWindowOn(ohio, d("2026-01-05"))).toEqual({
      startsAt: "2023-01-02",
      endsAt: "2027-01-04",
    });
  });

  it("finds the November general election day in any year", () => {
    const rule = stateExecutiveTermRule("OH")!.election;
    expect(generalElectionDay(rule, 2026)).toBe("2026-11-03");
    expect(generalElectionDay(rule, 2030)).toBe("2030-11-05");
    // November 1 is itself a Monday in 2027, so the Tuesday is the 2nd.
    expect(generalElectionDay(rule, 2027)).toBe("2027-11-02");
    // November 1 is a Tuesday in 2022; the first Monday is the 7th.
    expect(generalElectionDay(rule, 2022)).toBe("2022-11-08");
  });
});
