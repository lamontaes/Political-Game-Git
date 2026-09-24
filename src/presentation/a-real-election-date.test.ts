import { describe, expect, it } from "vitest";

import {
  LEGISLATIVE_GAME_PROFILE_VERSION,
  candidacyPacks,
  legislativeElectionRule,
  legislativeOfficeCalendar,
  nextLegislativeElection,
} from "../simulation";
import type { IsoDate } from "../simulation";

/**
 * A seat is contested on a day the calendar names, not a fixed number of days
 * after the player filed.
 *
 * Walked in fifteen towns on 2026-09-22: every contest in every state, for
 * every office, counted down 28 days, while the governorship on the same
 * screen already ran off the state's own election rule. Recorded in
 * `docs/playtest/a-real-field-of-candidates-2026-09-22.md`.
 */
const day = (value: string): IsoDate => value as IsoDate;

function everyOffer() {
  return candidacyPacks().flatMap((pack) =>
    pack.offices.map((option) => ({ pack, option })),
  );
}

describe("the day a legislative seat is contested", () => {
  it("has an offer to test in the first place", () => {
    // A sweep whose fixture reaches nothing reads exactly like a pass.
    expect(everyOffer().length).toBeGreaterThan(10);
  });

  it("always lands on a November general election day", () => {
    for (const { option } of everyOffer()) {
      const rule = legislativeElectionRule(option);
      for (const from of ["2026-01-15", "2026-09-23", "2027-03-01"]) {
        const election = nextLegislativeElection(rule, day(from));
        expect(election.slice(5, 7)).toBe("11");
        // The first Tuesday after the first Monday is never before the 2nd
        // and never after the 8th.
        const date = Number(election.slice(8, 10));
        expect(date).toBeGreaterThanOrEqual(2);
        expect(date).toBeLessThanOrEqual(8);
        expect(new Date(`${election}T00:00:00Z`).getUTCDay()).toBe(2);
      }
    }
  });

  it("is never a fixed distance from the day of filing", () => {
    const spans = new Set<number>();
    for (const { pack, option } of everyOffer()) {
      const calendar = legislativeOfficeCalendar(
        `jurisdiction_${pack.jurisdictionKey}` as never,
        option.officeKey,
        day("2026-03-04"),
      );
      // The lookup is by jurisdiction id, which a pack key is not; the rule
      // itself is what this case is about, so read it directly.
      expect(calendar).toBeNull();
      const rule = legislativeElectionRule(option);
      const election = nextLegislativeElection(rule, day("2026-03-04"));
      spans.add(
        Math.round(
          (Date.parse(`${election}T00:00:00Z`) -
            Date.parse("2026-03-04T00:00:00Z")) /
            86400000,
        ),
      );
    }
    expect([...spans].every((span) => span !== 28)).toBe(true);
  });

  it("follows a sourced term length where the pack has one", () => {
    const sourced = everyOffer()
      .map(({ pack, option }) => ({
        where: `${pack.jurisdictionKey}:${option.officeKey}`,
        rule: legislativeElectionRule(option),
      }))
      .filter((entry) => entry.rule.basis.termYears === "verified");
    // Nebraska, Alaska and Ohio carry sourced term lengths today.
    expect(sourced.length).toBeGreaterThanOrEqual(5);
    for (const entry of sourced) {
      expect(entry.rule.sources.length).toBeGreaterThan(0);
      expect(entry.rule.sources[0]?.citation.length).toBeGreaterThan(0);
      // The cycle follows the term, so a four-year seat is not contested
      // every second year.
      expect(entry.rule.election.cycleYears).toBe(entry.rule.termYears);
    }
  });

  it("never claims the election calendar itself is sourced", () => {
    // No state's legislative election calendar has been read into this
    // repository. A sourced term length must not launder into a sourced
    // calendar, which is the failure this whole lane exists to avoid.
    for (const { option } of everyOffer()) {
      const rule = legislativeElectionRule(option);
      expect(rule.basis.election).toBe("game-profile");
      expect(rule.ruleVersion).toBe(LEGISLATIVE_GAME_PROFILE_VERSION);
    }
  });

  it("moves to the next cycle once this year's election has passed", () => {
    const [{ option }] = everyOffer();
    const rule = legislativeElectionRule(option!);
    const thisYear = nextLegislativeElection(rule, day("2026-01-01"));
    const afterIt = nextLegislativeElection(rule, day("2026-12-01"));
    expect(afterIt > thisYear).toBe(true);
    expect(Number(afterIt.slice(0, 4)) - Number(thisYear.slice(0, 4))).toBe(
      rule.election.cycleYears,
    );
  });
});
