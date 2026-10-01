import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
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
  OUTCOME_WEB_CALIBRATED_AT,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
} from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * Medical debt in collections is a place outcome: each state and D.C. starts
 * at the Urban Institute's August 2025 credit-panel share, and the outcome web
 * moves it from there. Medicaid expansion acts on it (about -34% six months
 * after it takes effect). Places are drawn from the starting law, not named;
 * a state whose own law keeps medical debt off credit reports starts at zero
 * and is left out of the draw, since a share of zero has nothing to move.
 */

const MEASURE = "finance.medical-debt-in-collections";
const QUESTION =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const LINK = "medicaid-expansion-to-medical-debt";
const SEED = "medical-debt-1";

function drawPlace(answer: "yes" | "no"): string {
  const answers = (
    startingLaw as unknown as {
      questions: Record<
        string,
        {
          answers: Record<string, { answer?: string; operativeAt?: string }>;
        }
      >;
    }
  ).questions[QUESTION]!.answers;
  const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
  const candidates = Object.entries(answers)
    .filter(
      ([key, row]) =>
        row.answer === answer &&
        // A "yes" that took effect after calibration is not the place's
        // starting law, so repealing it moves nothing.
        (answer === "no" ||
          !row.operativeAt ||
          row.operativeAt <= OUTCOME_WEB_CALIBRATED_AT) &&
        (places[key] ?? 0) > 0,
    )
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
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_medicaid_${jurisdictionId}_${answer}` as EntityId;
  const propositionId = "proposition_medicaid" as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:medicaid:${jurisdictionId}:${answer}`,
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
      id: `enactment_medicaid_${jurisdictionId}_${answer}` as EntityId,
      stableKey: `test:medicaid:${jurisdictionId}:${answer}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2026-03-01"),
      outcomeEventId: `event_medicaid_${jurisdictionId}_${answer}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        proposition_medicaid: {
          id: "proposition_medicaid",
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

describe("medical debt in collections as a place outcome", () => {
  it("starts every state and D.C. at the August 2025 credit-panel share, seven at a recorded zero, and the territories are unknown", () => {
    const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
    expect(Object.keys(places)).toHaveLength(51);
    expect(places).toHaveProperty("US-DC");
    expect(places).not.toHaveProperty("US-PR");
    for (const [key, value] of Object.entries(places)) {
      expect(value, key).toBeGreaterThanOrEqual(0);
      expect(value, key).toBeLessThan(15);
    }
    expect(Object.values(places).filter((value) => value === 0)).toHaveLength(
      7,
    );
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("the Medicaid expansion link into it now acts", () => {
    const link = OUTCOME_LINKS.find((row) => row.key === LINK)!;
    expect(link.to).toBe(MEASURE);
    expect(outcomeLinkStatus(link)).toBe("built");
  });

  it(`expanding Medicaid lowers medical debt in collections about 34% six months on, and ending an expansion a state began with raises it (seed ${SEED})`, () => {
    const adopter = drawPlace("no");
    const repealer = drawPlace("yes");
    const world = worldWith([
      law(state(adopter), "yes"),
      law(state(repealer), "no"),
    ]);
    const factor = (key: string, on: string) =>
      outcomeFactor(world, state(key), MEASURE, makeIsoDate(on)).causes.find(
        (cause) => cause.key === LINK,
      )?.factor;
    expect(factor(adopter, "2026-08-15") ?? 1, adopter).toBe(1);
    expect(factor(adopter, "2026-09-15"), adopter).toBeCloseTo(0.66, 10);
    expect(factor(repealer, "2026-09-15"), repealer).toBeCloseTo(1.34, 10);
  });
});
