import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { STATES } from "../state-reference";
import {
  stateStatuteOperativeAt,
  statuteEffectiveRule,
} from "./statute-effective-date";

const at = (key: string, enacted: string) =>
  stateStatuteOperativeAt(key, makeIsoDate(enacted));

/** An act whose record carries its session's close and its final passage. */
const recorded = (
  key: string,
  enacted: string,
  dates: { sessionClosedOn?: string; finalPassageAt?: string },
) =>
  stateStatuteOperativeAt(key, makeIsoDate(enacted), {
    sessionClosedOn: () =>
      dates.sessionClosedOn ? makeIsoDate(dates.sessionClosedOn) : null,
    finalPassageAt: () =>
      dates.finalPassageAt ? makeIsoDate(dates.finalPassageAt) : null,
  });

describe("when a state law takes effect by its state's own rule", () => {
  it("gives every place either a well-formed rule or none, never a guess", () => {
    const places = new Set([
      ...Object.keys(STATES).map((usps) => `US-${usps}`),
      "US-DC",
      "US-PR",
      "US-GU",
      "US-VI",
      "US-AS",
      "US-MP",
    ]);
    let researched = 0;
    for (const key of places) {
      const rule = statuteEffectiveRule(key);
      const operative = recorded(key, "2026-03-15", {
        sessionClosedOn: "2026-04-15",
        finalPassageAt: "2026-03-10",
      });
      if (!rule) {
        expect(operative, key).toBeNull();
        continue;
      }
      researched += 1;
      // No earlier than the act (Colorado and Guam: the same day), and
      // within a year and a half of it.
      expect(operative! >= makeIsoDate("2026-03-15"), key).toBe(true);
      expect(operative! < makeIsoDate("2027-09-15"), key).toBe(true);
    }
    expect(researched).toBe(35);
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

  it("takes effect July 1 or January 1 in Georgia, by the half of the year", () => {
    expect(at("US-GA", "2026-04-20")).toBe("2026-07-01");
    expect(at("US-GA", "2026-06-30")).toBe("2026-07-01");
    expect(at("US-GA", "2026-07-01")).toBe("2027-01-01");
    expect(at("US-GA", "2026-12-31")).toBe("2027-01-01");
  });

  it("uses the year's date, or days after the act once that date has passed", () => {
    // North Dakota: August 1, or 90 days after filing from August 1 on.
    expect(at("US-ND", "2026-04-10")).toBe("2026-08-01");
    expect(at("US-ND", "2026-08-01")).toBe("2026-10-30");
    // Iowa: July 1, or 45 days after a late approval.
    expect(at("US-IA", "2026-05-01")).toBe("2026-07-01");
    expect(at("US-IA", "2026-07-02")).toBe("2026-08-16");
    // Rhode Island: July 1 for acts on or before it, else on passage.
    expect(at("US-RI", "2026-06-30")).toBe("2026-07-01");
    expect(at("US-RI", "2026-07-01")).toBe("2026-07-01");
    expect(at("US-RI", "2026-07-15")).toBe("2026-07-15");
  });

  it("counts days from the act where the rule says so", () => {
    expect(at("US-CO", "2026-05-01")).toBe("2026-05-01");
    expect(at("US-WI", "2026-04-01")).toBe("2026-04-03");
    expect(at("US-NY", "2026-06-10")).toBe("2026-06-30");
    expect(at("US-TN", "2026-04-01")).toBe("2026-05-11");
  });

  it("accounts for every place: a dated rule or a read rule it cannot date", () => {
    const { rules, notModeled } = (
      startingLaw as unknown as {
        effectiveDates: {
          rules: Record<string, unknown>;
          notModeled: Record<string, { cite: string; source: string }>;
        };
      }
    ).effectiveDates;
    const places = [
      ...Object.keys(STATES).map((usps) => `US-${usps}`),
      "US-DC",
      "US-PR",
      "US-GU",
      "US-VI",
      "US-AS",
      "US-MP",
    ];
    for (const key of new Set(places)) {
      const dated = Object.hasOwn(rules, key);
      const undated = Object.hasOwn(notModeled, key);
      expect(dated !== undated, key).toBe(true);
      if (undated) {
        expect(statuteEffectiveRule(key), key).toBeNull();
        expect(notModeled[key]!.cite.length, key).toBeGreaterThan(0);
        expect(notModeled[key]!.source, key).toMatch(/^https?:\/\//);
      }
    }
  });

  it("leaves out places whose rule the game cannot date", () => {
    // Ninety days after an adjournment the game does not record,
    // publication, and Congress's review.
    for (const key of ["US-TX", "US-FL", "US-KS", "US-HI", "US-DC"]) {
      expect(statuteEffectiveRule(key), key).toBeNull();
    }
  });

  it("counts ninety days from Missouri's May 30 adjournment, so August 28", () => {
    expect(at("US-MO", "2026-04-02")).toBe("2026-08-28");
    expect(at("US-MO", "2026-07-10")).toBe("2026-08-28");
    // Past the regular session's date: a special session the rule does not
    // date, so the caller keeps its labeled default.
    expect(at("US-MO", "2026-09-15")).toBeNull();
  });

  it("dates Kentucky from the session's recorded close, the day after ninety full days", () => {
    // OAG 26-03: adjourned April 15, 2026; acts took effect July 15, 2026.
    const close = { sessionClosedOn: "2026-04-15" };
    expect(recorded("US-KY", "2026-03-20", close)).toBe("2026-07-15");
    // Signed during the governor's days after adjournment: the same date.
    expect(recorded("US-KY", "2026-04-24", close)).toBe("2026-07-15");
    // No recorded close: not dated, so the caller keeps its labeled default.
    expect(recorded("US-KY", "2026-03-20", {})).toBeNull();
    expect(at("US-KY", "2026-03-20")).toBeNull();
  });

  it("dates Illinois from final passage: January 1 before June 1, else June 1", () => {
    expect(
      recorded("US-IL", "2026-08-20", { finalPassageAt: "2026-05-31" }),
    ).toBe("2027-01-01");
    expect(
      recorded("US-IL", "2026-08-20", { finalPassageAt: "2026-06-01" }),
    ).toBe("2027-06-01");
    // Or on becoming law, if that is later.
    expect(
      recorded("US-IL", "2027-02-01", { finalPassageAt: "2026-05-30" }),
    ).toBe("2027-02-01");
    // An act recorded without its passage date is not dated.
    expect(recorded("US-IL", "2026-08-20", {})).toBeNull();
  });

  it("dates California on the January 1 after ninety days, and first-year acts the next January 1", () => {
    // Second year (even): the January 1 after the 90-day period.
    expect(at("US-CA", "2026-09-30")).toBe("2027-01-01");
    expect(at("US-CA", "2026-12-10")).toBe("2028-01-01");
    // First year (odd): the next January 1, under sec. 8(c)(2), including a
    // bill signed in October.
    expect(at("US-CA", "2023-09-05")).toBe("2024-01-01");
    expect(at("US-CA", "2025-10-10")).toBe("2026-01-01");
  });
});
