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
 * Teen marijuana use is a place outcome: each state and D.C. starts at the
 * 2023-2024 NSDUH estimate for ages 12 to 17, and the outcome web moves it
 * from there. Legal cannabis sales act on it (contested, about -4%). Places
 * are drawn from the starting law, not named.
 */

const MEASURE = "health.youth-cannabis-use";
const QUESTION =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";
const LINK = "cannabis-sales-to-youth-use";
const SEED = "youth-cannabis-1";

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
        key in places,
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
  const id = `measure_cannabis_${jurisdictionId}_${answer}` as EntityId;
  const propositionId = "proposition_cannabis" as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:cannabis:${jurisdictionId}:${answer}`,
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
      id: `enactment_cannabis_${jurisdictionId}_${answer}` as EntityId,
      stableKey: `test:cannabis:${jurisdictionId}:${answer}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2026-03-01"),
      outcomeEventId: `event_cannabis_${jurisdictionId}_${answer}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        proposition_cannabis: {
          id: "proposition_cannabis",
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

describe("teen marijuana use as a place outcome", () => {
  it("starts every state and D.C. at the 2023-2024 NSDUH estimate, and the territories are unknown", () => {
    const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
    expect(Object.keys(places)).toHaveLength(51);
    expect(places).toHaveProperty("US-DC");
    expect(places).not.toHaveProperty("US-PR");
    for (const [key, value] of Object.entries(places)) {
      expect(value, key).toBeGreaterThan(2);
      expect(value, key).toBeLessThan(15);
    }
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("the legal-sales link into it now acts", () => {
    const link = OUTCOME_LINKS.find((row) => row.key === LINK)!;
    expect(link.to).toBe(MEASURE);
    expect(outcomeLinkStatus(link)).toBe("built");
  });

  it(`legal sales lower teen use about 4% once in force, and ending sales a state began with raises it (seed ${SEED})`, () => {
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
    expect(factor(adopter, "2026-02-15") ?? 1, adopter).toBe(1);
    expect(factor(adopter, "2026-04-15"), adopter).toBeCloseTo(0.96, 10);
    expect(factor(repealer, "2026-04-15"), repealer).toBeCloseTo(1.04, 10);
  });
});
