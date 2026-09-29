import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { lifePlaceByKey, stateJurisdictionForKey } from "../life-places";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { OUTCOME_LINKS, outcomeFactor, outcomeLinkStatus } from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * Highway money for transit: where a state lets money raised for highways
 * (the gas tax) be spent on transit, transit service per resident rises. When
 * federal law let highway money go to transit, states spent about 3% of the
 * whole federal-aid highway program on it (GAO-07-772); the same share of a
 * state's own highway spending is about 6% of what transit agencies spend to
 * run service. The law acts two years after it takes effect, in each
 * direction, and only where it changes what the place began with: 39 places
 * start with the money kept on roads and 17 with it free for transit. The
 * world is unseeded, so the link acts at its central size.
 */
const QUESTION = "proposition_highway_money" as EntityId;
const QUESTION_KEY =
  "us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit";
const MEASURE = "transit.service-access";
const LINK = "highway-money-for-transit-to-service";

function law(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_highway_money_${jurisdictionId}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:highway-money:${jurisdictionId}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Transportation Funding Act",
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
      id: `enactment_highway_money_${jurisdictionId}` as EntityId,
      stableKey: `test:highway-money:${jurisdictionId}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_highway_money_${jurisdictionId}` as EntityId,
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

const service = (world: World, jurisdictionId: EntityId, on: string) =>
  outcomeFactor(world, jurisdictionId, MEASURE, makeIsoDate(on));

const began = (
  startingLaw.questions as Record<
    string,
    { answers: Record<string, { answer: "yes" | "no" }> }
  >
)[QUESTION_KEY]!.answers;

describe("highway money for transit", () => {
  it("has a starting answer in all 56 places and a sized link that acts", () => {
    expect(Object.keys(began)).toHaveLength(56);
    const link = OUTCOME_LINKS.find((row) => row.key === LINK)!;
    expect(outcomeLinkStatus(link)).toBe("built");
    expect(link.size).toBe(0.06);
    expect(link.lagMonths).toBe(24);
  });

  it("moves transit service 6% two years after a state changes its answer, in every place with transit data", () => {
    const places = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places);
    expect(places).toHaveLength(52);
    for (const key of places) {
      const state = stateJurisdictionForKey(key)!.id;
      const flipped = began[key]!.answer === "yes" ? "no" : "yes";
      const world = worldWith([law(state, flipped, "2026-07-01")]);
      expect(service(world, state, "2028-06-15").multiplier, key).toBe(1);
      expect(service(world, state, "2028-07-15").multiplier, key).toBeCloseTo(
        flipped === "yes" ? 1.06 : 0.94,
        10,
      );
      // Enacting what the place already had changes nothing.
      const same = worldWith([law(state, began[key]!.answer, "2026-07-01")]);
      expect(service(same, state, "2028-07-15").multiplier, key).toBe(1);
    }
  });

  it("a city ordinance moves that city's service, not the rest of its state", () => {
    // Missouri's constitution keeps its gas tax on roads.
    expect(began["US-MO"]!.answer).toBe("no");
    const kansasCity = lifePlaceByKey("2938000")!.context.jurisdiction.id;
    const missouri = stateJurisdictionForKey("US-MO")!.id;
    const world = worldWith([law(kansasCity, "yes", "2026-03-01")]);
    const after = service(world, kansasCity, "2028-04-15");
    expect(after.multiplier).toBeCloseTo(1.06, 10);
    expect(after.causes.map((cause) => cause.key)).toEqual([LINK]);
    expect(service(world, missouri, "2028-04-15").multiplier).toBe(1);
  });
});
