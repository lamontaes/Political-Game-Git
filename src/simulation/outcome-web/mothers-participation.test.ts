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
  OUTCOME_WEB_CALIBRATED_AT,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
} from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * The share of mothers of young children who work or look for work is a
 * place outcome: each state, D.C. and Puerto Rico starts at the 2024 ACS rate
 * for women 20 to 64 whose children are all under 6, and the outcome web
 * moves it from there. Two sized laws act on it: universal pre-K (about +15%
 * a year on) and paid family leave (contested, about +2%). Places are drawn
 * from the starting law, not named.
 */

const MEASURE = "labor.mothers-participation";
const PREK = "us-policy-positions:education.universal-preschool";
const LEAVE = "us-policy-positions:labor-workforce.paid-family-leave";
const SEED = "mothers-participation-1";

function drawPlace(question: string, answer: "yes" | "no"): string {
  const answers = (
    startingLaw as unknown as {
      questions: Record<
        string,
        {
          answers: Record<string, { answer?: string; operativeAt?: string }>;
        }
      >;
    }
  ).questions[question]!.answers;
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
        key in places,
    )
    .map(([key]) => key)
    .sort();
  expect(candidates.length, `${question} ${answer}`).toBeGreaterThan(0);
  let hash = 0;
  for (const character of `${SEED}:${question}:${answer}`)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return candidates[hash % candidates.length]!;
}

function law(
  question: string,
  jurisdictionId: EntityId,
  answer: "yes" | "no",
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const tag = question === PREK ? "prek" : "leave";
  const id = `measure_${tag}_${jurisdictionId}_${answer}` as EntityId;
  const propositionId = `proposition_${tag}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${tag}:${jurisdictionId}:${answer}`,
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
      id: `enactment_${tag}_${jurisdictionId}_${answer}` as EntityId,
      stableKey: `test:${tag}:${jurisdictionId}:${answer}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2026-03-01"),
      outcomeEventId: `event_${tag}_${jurisdictionId}_${answer}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        proposition_prek: { id: "proposition_prek", stableKey: PREK },
        proposition_leave: { id: "proposition_leave", stableKey: LEAVE },
      },
    },
    history: {
      legislativeMeasures: laws.map((row) => row.measure),
      legislativeEnactments: laws.map((row) => row.enactment),
    },
  } as unknown as World;
}

const state = (key: string) => stateJurisdictionForKey(key)!.id;

describe("mothers of young children at work as a place outcome", () => {
  it("starts every state, D.C. and Puerto Rico at the 2024 ACS rate, and the other territories are unknown", () => {
    const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
    expect(Object.keys(places)).toHaveLength(52);
    expect(places).toHaveProperty("US-DC");
    expect(places).toHaveProperty("US-PR");
    expect(places).not.toHaveProperty("US-GU");
    for (const [key, value] of Object.entries(places)) {
      expect(value, key).toBeGreaterThan(50);
      expect(value, key).toBeLessThan(95);
    }
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("both sized laws into it now act", () => {
    for (const key of [
      "universal-childcare-to-mothers-work",
      "paid-leave-to-mothers-work",
    ]) {
      const link = OUTCOME_LINKS.find((row) => row.key === key)!;
      expect(link.to, key).toBe(MEASURE);
      expect(outcomeLinkStatus(link), key).toBe("built");
    }
  });

  it(`a new universal pre-K raises mothers' work about 15% a year on, and repealing paid leave lowers it about 2% (seed ${SEED})`, () => {
    const adopter = drawPlace(PREK, "no");
    const repealer = drawPlace(LEAVE, "yes");
    const world = worldWith([
      law(PREK, state(adopter), "yes"),
      law(LEAVE, state(repealer), "no"),
    ]);
    const at = (key: string, on: string) =>
      outcomeFactor(world, state(key), MEASURE, makeIsoDate(on));
    expect(at(adopter, "2027-02-15").multiplier, adopter).toBe(1);
    const after = at(adopter, "2027-04-15");
    expect(after.causes.map((cause) => cause.key)).toContain(
      "universal-childcare-to-mothers-work",
    );
    expect(
      after.causes.find(
        (cause) => cause.key === "universal-childcare-to-mothers-work",
      )!.factor,
      adopter,
    ).toBeCloseTo(1.15, 10);
    expect(
      at(repealer, "2027-04-15").causes.find(
        (cause) => cause.key === "paid-leave-to-mothers-work",
      )!.factor,
      repealer,
    ).toBeCloseTo(0.98, 10);
  });
});
