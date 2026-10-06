import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";
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
 * Infant deaths per 1,000 live births is a place outcome: each state and D.C.
 * starts at CDC's final 2024 rate, and the outcome web moves it from there.
 * Two sized links act on it: an abortion restriction (about +6% seven months
 * on, Gemmill et al.) and fine particulates (0.5% per 1% of the place's
 * starting level, Chay and Greenstone). The place is drawn from the starting
 * law, not named.
 */

const MEASURE = "health.infant-mortality";
const QUESTION = "us-policy-positions:civil-family-community.restrict-abortion";
const SEED = "infant-mortality-1";

function drawPlace(answer: "yes" | "no"): string {
  const answers = (
    startingLaw as unknown as {
      questions: Record<
        string,
        { answers: Record<string, { answer?: string }> }
      >;
    }
  ).questions[QUESTION]!.answers;
  const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
  const candidates = Object.entries(answers)
    .filter(([key, row]) => row.answer === answer && key in places)
    .map(([key]) => key)
    .sort();
  expect(candidates.length, answer).toBeGreaterThan(0);
  let hash = 0;
  for (const character of `${SEED}:${answer}`)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return candidates[hash % candidates.length]!;
}

function law(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_abortion_${jurisdictionId}_${answer}` as EntityId;
  const propositionId = "proposition_abortion" as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:abortion:${jurisdictionId}:${answer}`,
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
      propositionAnswers: [{ propositionId, answer }],
    },
    enactment: {
      id: `enactment_abortion_${jurisdictionId}_${answer}` as EntityId,
      stableKey: `test:abortion:${jurisdictionId}:${answer}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_abortion_${jurisdictionId}_${answer}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        proposition_abortion: {
          id: "proposition_abortion",
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

describe("infant mortality as a place outcome", () => {
  it("starts every state and D.C. at CDC's 2024 rate, and the territories are unknown", () => {
    const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
    expect(Object.keys(places)).toHaveLength(51);
    expect(places).toHaveProperty("US-DC");
    expect(places).not.toHaveProperty("US-PR");
    for (const [key, value] of Object.entries(places)) {
      expect(value, key).toBeGreaterThan(2);
      expect(value, key).toBeLessThan(12);
    }
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("both sized links into it now act", () => {
    for (const key of [
      "abortion-ban-to-infant-deaths",
      "particles-to-infant-deaths",
    ]) {
      const link = OUTCOME_LINKS.find((row) => row.key === key)!;
      expect(link.to, key).toBe(MEASURE);
      expect(outcomeLinkStatus(link), key).toBe("built");
    }
  });

  it(`a new abortion restriction raises infant deaths about 6% seven months on, and lifting one lowers them (seed ${SEED})`, () => {
    const adopter = drawPlace("no");
    const world = worldWith([law(state(adopter), "yes", "2026-03-01")]);
    const at = (w: World, key: string, on: string) =>
      outcomeFactor(w, state(key), MEASURE, makeIsoDate(on));
    expect(at(world, adopter, "2026-08-15").multiplier, adopter).toBe(1);
    const after = at(world, adopter, "2026-11-15");
    expect(after.multiplier, adopter).toBeCloseTo(1.06, 10);
    expect(after.causes.map((cause) => cause.key)).toContain(
      "abortion-ban-to-infant-deaths",
    );
    const lifter = drawPlace("yes");
    const lifted = worldWith([law(state(lifter), "no", "2026-03-01")]);
    expect(at(lifted, lifter, "2026-11-15").multiplier, lifter).toBeCloseTo(
      0.94,
      10,
    );
    // A state whose law did not change is unmoved.
    expect(at(world, lifter, "2026-11-15").multiplier, lifter).toBe(1);
  });
});
