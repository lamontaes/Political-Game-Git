import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";
import { isoDateFromParts, makeIsoDate } from "../dates";
import { rulePackById } from "../legislature-rule-packs";
import { STATES } from "../state-reference";
import {
  stateSessionEndEstimate,
  stateSessionEnds,
  stateStatuteOperativeAt,
  statuteEffectiveDateEstimated,
  statuteEffectiveRule,
  statuteEffectiveRuleEstimate,
} from "./statute-effective-date";

const PLACES = new Set([
  ...Object.keys(STATES).map((usps) => `US-${usps}`),
  "US-DC",
  "US-PR",
  "US-GU",
  "US-VI",
  "US-AS",
  "US-MP",
]);

const at = (key: string, enacted: string) =>
  stateStatuteOperativeAt(key, makeIsoDate(enacted));

/** An act whose record carries its final passage. */
const recorded = (
  key: string,
  enacted: string,
  dates: { finalPassageAt?: string },
) =>
  stateStatuteOperativeAt(key, makeIsoDate(enacted), {
    finalPassageAt: () =>
      dates.finalPassageAt ? makeIsoDate(dates.finalPassageAt) : null,
  });

describe("when a state law takes effect by its state's own rule", () => {
  it("gives every place a well-formed rule that dates an act of an odd year", () => {
    for (const key of PLACES) {
      expect(statuteEffectiveRule(key), key).not.toBeNull();
      const operative = recorded(key, "2027-03-15", {
        finalPassageAt: "2027-03-10",
      });
      // No earlier than the act (Colorado and Guam: the same day), and
      // within a year and a half of it.
      expect(operative, key).not.toBeNull();
      expect(operative! >= makeIsoDate("2027-03-15"), key).toBe(true);
      expect(operative! < makeIsoDate("2028-09-15"), key).toBe(true);
    }
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

  it("marks every rule and session end that was not read as estimated, and sources the rest", () => {
    const { rules, sessionEnds } = (
      startingLaw as unknown as {
        effectiveDates: {
          rules: Record<
            string,
            {
              rule: { kind: string };
              estimated?: string;
              cite: string;
              source: string;
            }
          >;
          sessionEnds: Record<
            string,
            { estimated?: string; cite?: string; source?: string }
          >;
        };
      }
    ).effectiveDates;
    expect(Object.keys(rules).sort()).toEqual([...PLACES].sort());
    let estimatedRules = 0;
    for (const [key, row] of Object.entries(rules)) {
      expect(row.cite.length, key).toBeGreaterThan(0);
      expect(row.source, key).toMatch(/^https?:\/\//);
      if (row.estimated) {
        estimatedRules += 1;
        expect(row.estimated, key).toMatch(/^ESTIMATED FROM AVERAGE: /);
        expect(statuteEffectiveRuleEstimate(key), key).toBe(row.estimated);
      } else expect(statuteEffectiveRuleEstimate(key), key).toBeNull();
      // A rule that counts from a session's end has that end in the table.
      if (row.rule.kind === "days-after-session-end")
        expect(Object.hasOwn(sessionEnds, key), key).toBe(true);
    }
    // Kansas, Hawaii, Alabama, D.C., Puerto Rico, the Northern Marianas.
    expect(estimatedRules).toBe(6);
    let estimatedEnds = 0;
    for (const [key, row] of Object.entries(sessionEnds)) {
      if (row.estimated) {
        estimatedEnds += 1;
        expect(row.estimated, key).toMatch(/^ESTIMATED FROM AVERAGE: /);
        // 2027: no legislature has adjourned yet.
        expect(stateSessionEndEstimate(key, 2027), key).toBe(row.estimated);
      } else {
        expect(row.cite?.length, key).toBeGreaterThan(0);
        expect(row.source, key).toMatch(/^https?:\/\//);
      }
    }
    expect(estimatedEnds).toBe(10);
  });

  it("estimates an unread session end as the median last day of the known ones", () => {
    // 2027, before any session has adjourned: the eleven read limits,
    // earliest first, run from Utah's March 5 to American Samoa's August 25.
    // The lower middle of eleven is the sixth, Florida's April 30.
    expect(stateSessionEnds("US-MI", 2027)).toEqual(["2027-04-30"]);
    // 2026: seventeen rows have a published adjournment or a limit, and the
    // lower middle of seventeen is Kentucky's April 15.
    // Michigan sits all year and had not adjourned when it was read.
    expect(stateSessionEnds("US-MI", 2026)).toEqual(["2026-04-15"]);
    // Puerto Rico: the territories' rule, at once.
    expect(at("US-PR", "2026-03-01")).toBe("2026-03-01");
  });

  it("dates a session that adjourned from the day it published", () => {
    // Maine's 2026 session ran past its April 15 statutory date to April 29,
    // and its laws take effect 91 days later.
    expect(stateSessionEnds("US-ME", 2026)).toEqual(["2026-04-29"]);
    expect(at("US-ME", "2026-03-01")).toBe("2026-07-29");
    // Oklahoma adjourned May 14, 2026, two weeks before its limit.
    expect(stateSessionEnds("US-OK", 2026)).toEqual(["2026-05-14"]);
    expect(at("US-OK", "2026-03-01")).toBe("2026-08-12");
    // Arizona sets no calendar limit; its 2026 session adjourned June 13,
    // so the 91st day is September 12, and that date is not an estimate.
    expect(at("US-AZ", "2026-03-01")).toBe("2026-09-12");
    expect(
      statuteEffectiveDateEstimated("US-AZ", makeIsoDate("2026-03-01")),
    ).toBe(false);
    expect(
      statuteEffectiveDateEstimated("US-AZ", makeIsoDate("2027-03-01")),
    ).toBe(true);
    // Kansas's rule is estimated, counted from its real April 10 end.
    expect(at("US-KS", "2026-03-01")).toBe("2026-07-10");
    expect(
      statuteEffectiveDateEstimated("US-KS", makeIsoDate("2026-03-01")),
    ).toBe(true);
    // Missouri's constitution sets the session's end on May 30, and its laws
    // take effect August 28, whatever day the chambers last sat.
    expect(stateSessionEnds("US-MO", 2026)).toEqual(["2026-05-30"]);
    // Every published adjournment names its source.
    const { sessionEnds } = (
      startingLaw as unknown as {
        effectiveDates: {
          sessionEnds: Record<
            string,
            {
              adjourned?: Record<
                string,
                { dates: string[]; sourceUrl: string; quote: string }
              >;
            }
          >;
        };
      }
    ).effectiveDates;
    for (const [key, row] of Object.entries(sessionEnds))
      for (const [year, entry] of Object.entries(row.adjourned ?? {})) {
        expect(entry.sourceUrl, `${key} ${year}`).toMatch(/^https:\/\//);
        expect(entry.quote.length, `${key} ${year}`).toBeGreaterThan(0);
        expect(entry.dates.length, `${key} ${year}`).toBeGreaterThan(0);
      }
  });

  it("dates session-end states from the day each one's law sets", () => {
    // Texas: 140 days from the second Tuesday in January (2025: January 14
    // to June 2), then the 91st day: September 1.
    expect(stateSessionEnds("US-TX", 2025)).toEqual(["2025-06-02"]);
    expect(at("US-TX", "2025-05-20")).toBe("2025-09-01");
    // No regular session in even years: a special session's act counts
    // from the day it became law.
    expect(at("US-TX", "2026-08-01")).toBe("2026-10-31");
    // Florida's governor signs weeks after the session: once the sixtieth
    // day after the session has passed, the count starts from the act.
    expect(at("US-FL", "2026-05-20")).toBe("2026-07-19");
    // Washington 2026: January 12 to March 12, effective June 11.
    expect(at("US-WA", "2026-03-20")).toBe("2026-06-11");
    // New Mexico 2025: January 21 to March 22, effective June 20.
    expect(at("US-NM", "2025-03-01")).toBe("2025-06-20");
    // Utah 2025: January 21 to March 7, effective May 7.
    expect(at("US-UT", "2025-03-01")).toBe("2025-05-07");
    // Oklahoma: the last Friday in May, May 28 in 2027.
    expect(stateSessionEnds("US-OK", 2027)).toEqual(["2027-05-28"]);
    // Maine: the third Wednesday in June (odd) and April (even).
    expect(stateSessionEnds("US-ME", 2025)).toEqual(["2025-06-18"]);
    expect(stateSessionEnds("US-ME", 2028)).toEqual(["2028-04-19"]);
    // Florida 2026: January 13 for 60 days, then the sixtieth day after.
    expect(stateSessionEnds("US-FL", 2026)).toEqual(["2026-03-13"]);
    expect(at("US-FL", "2026-03-01")).toBe("2026-05-12");
    // Idaho: July 1 or sixty days after, whichever is later (2026 adjourned
    // April 2, so July 1).
    expect(at("US-ID", "2026-03-01")).toBe("2026-07-01");
    // Nebraska: the day after three calendar months (2026 adjourned April
    // 17, so July 18).
    expect(at("US-NE", "2026-03-01")).toBe("2026-07-18");
  });

  it("marks a date as estimated when the rule or its session end is", () => {
    // Michigan's rule is read; its session end, set by resolution, is not.
    expect(statuteEffectiveRuleEstimate("US-MI")).toBeNull();
    expect(
      statuteEffectiveDateEstimated("US-MI", makeIsoDate("2026-10-01")),
    ).toBe(true);
    // A legislature that sits all year: a fall act counts from itself.
    expect(at("US-MI", "2026-10-01")).toBe("2026-12-31");
    expect(
      statuteEffectiveDateEstimated("US-KS", makeIsoDate("2026-03-01")),
    ).toBe(true);
    expect(
      statuteEffectiveDateEstimated("US-KY", makeIsoDate("2026-03-01")),
    ).toBe(false);
    expect(
      statuteEffectiveDateEstimated("US-GA", makeIsoDate("2026-03-01")),
    ).toBe(false);
  });

  it("dates American Samoa from whichever of its two sessions the act came from", () => {
    // January 12 to February 25, 2026, then sixty days.
    expect(at("US-AS", "2026-03-01")).toBe("2026-04-26");
    // July 13 to August 26, 2026, then sixty days.
    expect(at("US-AS", "2026-08-01")).toBe("2026-10-25");
  });

  it("counts ninety days from Missouri's May 30 adjournment, so August 28", () => {
    expect(at("US-MO", "2026-04-02")).toBe("2026-08-28");
    expect(at("US-MO", "2026-07-10")).toBe("2026-08-28");
    // Past the regular session's date: the session ran at least that long,
    // so the count starts from the act.
    expect(at("US-MO", "2026-09-15")).toBe("2026-12-14");
  });

  it("dates Kentucky from its session's end, the day after ninety full days", () => {
    // OAG 26-03: adjourned April 15, 2026; acts took effect July 15, 2026.
    expect(at("US-KY", "2026-03-20")).toBe("2026-07-15");
    // Signed during the governor's days after adjournment: the same date.
    expect(at("US-KY", "2026-04-24")).toBe("2026-07-15");
    // Odd years end by March 30.
    expect(at("US-KY", "2027-03-01")).toBe("2027-06-29");
  });

  it("reads Kentucky's session end from the same limit its rule pack holds", () => {
    const limit = rulePackById("us-ky-general-assembly-v1").session
      .regularSessionLatestAdjournment!.value;
    for (const [year, end] of [
      [2027, limit.oddYear],
      [2026, limit.evenYear],
    ] as const) {
      expect(stateSessionEnds("US-KY", year)).toEqual([
        isoDateFromParts(year, end.month, end.day),
      ]);
    }
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
