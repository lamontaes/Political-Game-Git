import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
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
 * Public school spending per student is a place outcome: each state and D.C.
 * starts at the Census Bureau's fiscal 2024 current spending per pupil, and
 * the outcome web moves it from there. A law equalizing school funding raises
 * it about 7% a year after it takes effect. No state had such a law when the
 * outcome web was calibrated, so the adopting state is drawn from every place
 * with a starting level, not named.
 */

const MEASURE = "school.spending-per-student";
const QUESTION = "us-policy-positions:education.equalize-school-funding";
const SEED = "school-spending-1";

function drawPlace(): string {
  const candidates = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places).sort();
  let hash = 0;
  for (const character of SEED)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return candidates[hash % candidates.length]!;
}

function law(
  jurisdictionId: EntityId,
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_funding_${jurisdictionId}` as EntityId;
  const propositionId = "proposition_funding" as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:funding:${jurisdictionId}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Test Act",
      summary: "A test law.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-10"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer: "yes" }],
    },
    enactment: {
      id: `enactment_funding_${jurisdictionId}` as EntityId,
      stableKey: `test:funding:${jurisdictionId}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_funding_${jurisdictionId}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        proposition_funding: {
          id: "proposition_funding",
          stableKey: QUESTION,
        },
      },
    },
    history: {
      legislativeMeasures: laws.map((row) => row.measure),
      legislativeEnactments: laws.map((row) => row.enactment),
    },
  } as unknown as World;
}

const state = (key: string) => stateJurisdictionForKey(key)!.id;

describe("school spending per student as a place outcome", () => {
  it("starts every state and D.C. at the Census fiscal 2024 level, and the territories are unknown", () => {
    const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
    expect(Object.keys(places)).toHaveLength(51);
    expect(places).toHaveProperty("US-DC");
    expect(places).not.toHaveProperty("US-PR");
    for (const [key, value] of Object.entries(places)) {
      expect(value, key).toBeGreaterThan(8000);
      expect(value, key).toBeLessThan(40000);
    }
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("the equalized-funding link into it now acts", () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "equalized-funding-to-spending",
    )!;
    expect(link.to).toBe(MEASURE);
    expect(outcomeLinkStatus(link)).toBe("built");
  });

  it(`equalizing school funding raises spending about 7% a year on (seed ${SEED})`, () => {
    const adopter = drawPlace();
    const world = worldWith([law(state(adopter), "2026-03-01")]);
    const at = (key: string, on: string) =>
      outcomeFactor(world, state(key), MEASURE, makeIsoDate(on));
    expect(at(adopter, "2027-02-15").multiplier, adopter).toBe(1);
    const after = at(adopter, "2027-04-15");
    expect(after.multiplier, adopter).toBeCloseTo(1.07, 10);
    expect(after.causes.map((cause) => cause.key)).toContain(
      "equalized-funding-to-spending",
    );
    // A state that passed nothing is unmoved.
    const other = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places).find(
      (key) => key !== adopter,
    )!;
    expect(at(other, "2027-04-15").multiplier, other).toBe(1);
  });
});
