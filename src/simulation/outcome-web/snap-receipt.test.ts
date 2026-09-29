import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import type { EntityId, World } from "../types";
import {
  OUTCOME_LINKS,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
} from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * A work requirement for assistance lowers how many residents receive SNAP.
 * Work requirements cut participation 53% among the adults they reach (Gray,
 * Leive, Prager, Pukelis and Zaki 2023), and those adults are 9.8% of SNAP
 * participants (USDA FNS, FY 2023), so about 5.2% fewer residents receive it.
 * The starting law answers the question yes for every place through the
 * federal law of 2025, operative November 1, 2025, and the SNAP base was
 * measured in fiscal 2024, before it: every place with SNAP starts that
 * effect three months after the law took effect.
 */
const QUESTION_KEY =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";
const QUESTION = "proposition_work_requirement" as EntityId;
const MEASURE = "program.snap-receipt";

function world(currentDate: string): World {
  return {
    currentDate: makeIsoDate(currentDate),
    policyCatalog: {
      propositions: { [QUESTION]: { id: QUESTION, stableKey: QUESTION_KEY } },
    },
    history: { legislativeMeasures: [], legislativeEnactments: [] },
  } as unknown as World;
}

describe("SNAP receipt", () => {
  const places = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places);

  it("starts every place with SNAP at its fiscal 2024 share of residents", () => {
    // 50 states, D.C., Guam and the Virgin Islands. Puerto Rico, American
    // Samoa and the Northern Mariana Islands run a block grant instead.
    expect(places).toHaveLength(53);
    for (const excluded of ["US-PR", "US-AS", "US-MP"])
      expect(places).not.toContain(excluded);
    const shares = Object.values(PLACE_OUTCOME_BASES[MEASURE]!.places);
    expect(Math.min(...shares)).toBeGreaterThan(4);
    expect(Math.max(...shares)).toBeLessThan(25);
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("the work requirement link is built and sized from the studies", () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "snap-work-requirement-to-participation",
    )!;
    expect(outcomeLinkStatus(link)).toBe("built");
    expect(link.size).toBe(-0.052);
  });

  it("lowers SNAP receipt about 5.2% in every place once the requirement has run three months", () => {
    for (const placeKey of places) {
      const jurisdictionId = stateJurisdictionForKey(placeKey)!.id;
      const before = outcomeFactor(
        world("2026-01-15"),
        jurisdictionId,
        MEASURE,
        makeIsoDate("2026-01-15"),
      );
      // Three months before January 15 the law was not yet operative.
      expect(before.multiplier, placeKey).toBe(1);
      const after = outcomeFactor(
        world("2026-03-01"),
        jurisdictionId,
        MEASURE,
        makeIsoDate("2026-03-01"),
      );
      expect(after.multiplier, placeKey).toBeCloseTo(0.948, 10);
      expect(after.causes.map((cause) => cause.key)).toEqual([
        "snap-work-requirement-to-participation",
      ]);
    }
  });

  it("raises food insecurity about 2.1% for each point of residents a law takes off SNAP", () => {
    // 51.1% of SNAP households are food insecure (ERR-358); SNAP cuts that
    // chance about 30% (Ratcliffe, McKernan and Zhang 2011), so a household
    // that loses it goes to about 73%. A point of residents is 1.3% of
    // households (1.9 people per SNAP household, 2.5 per household), which
    // is 0.29 points of food insecurity, 2.1% of the 13.7% national rate.
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "snap-to-food-insecurity",
    )!;
    expect(outcomeLinkStatus(link)).toBe("built");
    const texas = stateJurisdictionForKey("US-TX")!.id;
    const base = PLACE_OUTCOME_BASES[MEASURE]!.places["US-TX"]!;
    const withShare = (value: number, structural = base): World =>
      ({
        ...world("2026-03-01"),
        placeOutcomes: {
          months: [
            {
              month: makeIsoDate("2026-02-01"),
              records: [
                {
                  measure: MEASURE,
                  placeKey: "US-TX",
                  jurisdictionId: texas,
                  month: makeIsoDate("2026-02-01"),
                  base,
                  structural,
                  multiplier: value / structural,
                  value,
                  causes: [],
                },
              ],
            },
          ],
        },
      }) as unknown as World;
    const cause = (value: number, structural = base) =>
      outcomeFactor(
        withShare(value, structural),
        texas,
        "household.food-insecurity",
        makeIsoDate("2026-03-01"),
      ).causes.find((row) => row.key === "snap-to-food-insecurity");
    expect(cause(base)?.factor).toBe(1);
    expect(cause(base - 1)?.factor).toBeCloseTo(1.021, 10);
    expect(cause(base + 1)?.factor).toBeCloseTo(0.979, 10);
    // The share's own drift stands for changes in need, not for SNAP
    // reaching fewer people who need it, so it does not move food insecurity.
    expect(cause(base - 1, base - 1)?.factor).toBe(1);
  });
});
