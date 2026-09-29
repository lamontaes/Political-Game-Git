import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lifePlaceByKey, stateJurisdictionForKey } from "../life-places";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { OUTCOME_LINKS, OUTCOMES_PRODUCED, outcomeFactor } from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * Fare-free transit: a law that makes local transit free to ride raises how
 * many rides residents take. Transit ridership's elasticity with respect to
 * fares is -0.2 to -0.5 in the first year (Litman 2025, Table 15); read on the
 * semi-log curve that suits fares near zero, a fare falling to zero raises
 * ridership by e to that elasticity, 22% to 65%, 42% at the middle. A state
 * law or a city ordinance acts where it is law. The world is unseeded, so the
 * link acts at its central size.
 */
const QUESTION = "proposition_fare_free" as EntityId;
const QUESTION_KEY =
  "us-policy-positions:transportation-infrastructure.fare-free-transit";
const MEASURE = "transit.ridership";

function law(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_fare_free_${jurisdictionId}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:fare-free:${jurisdictionId}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Fare-Free Transit Act",
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
      id: `enactment_fare_free_${jurisdictionId}` as EntityId,
      stableKey: `test:fare-free:${jurisdictionId}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_fare_free_${jurisdictionId}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: { [QUESTION]: { id: QUESTION, stableKey: QUESTION_KEY } },
    },
    history: {
      legislativeMeasures: laws.map((row) => row.measure),
      legislativeEnactments: laws.map((row) => row.enactment),
    },
  } as unknown as World;
}

const ridership = (world: World, jurisdictionId: EntityId, on: string) =>
  outcomeFactor(world, jurisdictionId, MEASURE, makeIsoDate(on));

describe("transit ridership", () => {
  const places = PLACE_OUTCOME_BASES[MEASURE]!.places;

  it("starts the 50 states, D.C. and Puerto Rico at their 2024 rides per resident", () => {
    expect(Object.keys(places)).toHaveLength(52);
    // The same places as transit service, whose populations are published.
    expect(Object.keys(places).sort()).toEqual(
      Object.keys(PLACE_OUTCOME_BASES["transit.service-access"]!.places).sort(),
    );
    expect(places["US-NY"]).toBeGreaterThan(100);
    expect(places["US-ID"]).toBeLessThan(2);
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "fare-free-transit-to-ridership",
    )!;
    expect(link.size).toBe(0.42);
    expect(link.range).toEqual([0.22, 0.65]);
  });

  it("a state law making transit free raises the state's rides 42% a month after it takes effect", () => {
    const ohio = stateJurisdictionForKey("US-OH")!.id;
    const world = worldWith([law(ohio, "yes", "2026-03-01")]);
    expect(ridership(world, ohio, "2026-03-15").multiplier).toBe(1);
    const after = ridership(world, ohio, "2026-04-15");
    expect(after.multiplier).toBeCloseTo(1.42, 10);
    expect(after.causes.map((cause) => cause.key)).toEqual([
      "fare-free-transit-to-ridership",
    ]);
    // A place with no such law is unmoved.
    const utah = stateJurisdictionForKey("US-UT")!.id;
    expect(ridership(world, utah, "2026-04-15").multiplier).toBe(1);
  });

  it("a city ordinance moves that city's rides, not the rest of its state", () => {
    const kansasCity = lifePlaceByKey("2938000")!.context.jurisdiction.id;
    const missouri = stateJurisdictionForKey("US-MO")!.id;
    const world = worldWith([law(kansasCity, "yes", "2026-03-01")]);
    expect(ridership(world, kansasCity, "2026-04-15").multiplier).toBeCloseTo(
      1.42,
      10,
    );
    expect(ridership(world, missouri, "2026-04-15").multiplier).toBe(1);
  });

  it("a law answering no leaves ridership where it began", () => {
    const ohio = stateJurisdictionForKey("US-OH")!.id;
    const world = worldWith([law(ohio, "no", "2026-03-01")]);
    expect(ridership(world, ohio, "2026-04-15").multiplier).toBe(1);
  });
});
