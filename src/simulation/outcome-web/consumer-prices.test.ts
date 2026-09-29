import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  OUTCOME_LINKS,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
} from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * Raising tariffs on imports raises what households pay. The 2025 tariffs
 * raised consumer prices 0.5% to 1% (Yale Budget Lab, April 2026), 0.8% at
 * the middle, and about a year passes before the full rise reaches shelves
 * (the link's twelve-month lag). The world starts each state at its 2024
 * regional price parity (Bureau of Economic Analysis, U.S. average = 100).
 */
const QUESTION = "proposition_tariffs" as EntityId;
const QUESTION_KEY = "us-federal-positions:trade.raise-tariffs";
const MEASURE = "household.prices";

function law(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_tariff_${jurisdictionId}_${answer}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:tariff:${jurisdictionId}:${answer}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Tariff Act",
      summary: "A test law.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-10"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [QUESTION],
      propositionAnswers: [{ propositionId: QUESTION, answer }],
    },
    enactment: {
      id: `enactment_tariff_${jurisdictionId}_${answer}` as EntityId,
      stableKey: `test:tariff:${jurisdictionId}:${answer}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_tariff_${jurisdictionId}_${answer}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        [QUESTION]: { id: QUESTION, stableKey: QUESTION_KEY },
      },
    },
    history: {
      legislativeMeasures: laws.map((row) => row.measure),
      legislativeEnactments: laws.map((row) => row.enactment),
    },
  } as unknown as World;
}

const prices = (world: World, jurisdictionId: EntityId, on: string) =>
  outcomeFactor(world, jurisdictionId, MEASURE, makeIsoDate(on));

describe("consumer prices", () => {
  const places = PLACE_OUTCOME_BASES[MEASURE]!.places;

  it("starts the 50 states and D.C. at their 2024 regional price parity", () => {
    expect(Object.keys(places)).toHaveLength(51);
    for (const left of ["US-PR", "US-GU", "US-VI", "US-AS", "US-MP"])
      expect(places).not.toHaveProperty(left);
    expect(places["US-CA"]).toBeGreaterThan(105);
    expect(places["US-AR"]).toBeLessThan(90);
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
    const link = OUTCOME_LINKS.find((row) => row.key === "tariffs-to-prices")!;
    expect(outcomeLinkStatus(link)).toBe("built");
    expect(link.size).toBe(0.008);
  });

  it("an Act raising tariffs lifts prices 0.8% in every state once a year has passed", () => {
    const world = worldWith([
      law(NATIONAL_ELECTION_JURISDICTION.id, "yes", "2026-03-01"),
    ]);
    for (const key of Object.keys(places)) {
      const state = stateJurisdictionForKey(key)!.id;
      expect(prices(world, state, "2026-03-15").multiplier, key).toBe(1);
      expect(prices(world, state, "2027-02-15").multiplier, key).toBe(1);
      const after = prices(world, state, "2027-04-15");
      expect(after.multiplier, key).toBeCloseTo(1.008, 10);
      expect(after.causes.map((cause) => cause.key)).toEqual([
        "tariffs-to-prices",
      ]);
    }
  });

  it("an Act answering no leaves prices where they were", () => {
    const world = worldWith([
      law(NATIONAL_ELECTION_JURISDICTION.id, "no", "2026-03-01"),
    ]);
    const ohio = stateJurisdictionForKey("US-OH")!.id;
    expect(prices(world, ohio, "2027-04-15").multiplier).toBe(1);
  });

  it("repealing the tariffs takes the rise back the day the repeal takes effect", () => {
    const world = worldWith([
      law(NATIONAL_ELECTION_JURISDICTION.id, "yes", "2026-03-01"),
      law(NATIONAL_ELECTION_JURISDICTION.id, "no", "2027-07-01"),
    ]);
    const ohio = stateJurisdictionForKey("US-OH")!.id;
    expect(prices(world, ohio, "2027-06-15").multiplier).toBeCloseTo(1.008, 10);
    expect(prices(world, ohio, "2027-07-15").multiplier).toBe(1);
  });
});
