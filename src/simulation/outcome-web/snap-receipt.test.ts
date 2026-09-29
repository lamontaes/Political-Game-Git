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
});
