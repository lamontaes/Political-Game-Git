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
  outcomeFactor,
  outcomeLinkStatus,
} from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * Universal pre-K reaches more than math and graduation: it moves eighth-grade
 * reading (contested, centered just below zero) and, once enrolled cohorts are
 * teenagers, violent crime (contested, about -1.2%). The adopting state is
 * drawn from the starting law among the places that keep both outcomes, not
 * named.
 */

const QUESTION = "us-policy-positions:education.universal-preschool";
const READING = "school.reading-proficient-pct";
const VIOLENT = "crime.violent";
const SEED = "universal-prek-effects-1";

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
  const candidates = Object.entries(answers)
    .filter(
      ([key, row]) =>
        row.answer === answer &&
        // A "yes" that took effect after calibration is not the place's
        // starting law, so repealing it moves nothing.
        (answer === "no" ||
          !row.operativeAt ||
          row.operativeAt <= OUTCOME_WEB_CALIBRATED_AT) &&
        key in PLACE_OUTCOME_BASES[READING]!.places &&
        key in PLACE_OUTCOME_BASES[VIOLENT]!.places,
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
  const id = `measure_prek_${jurisdictionId}_${answer}` as EntityId;
  const propositionId = "proposition_prek" as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:prek:${jurisdictionId}:${answer}`,
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
      id: `enactment_prek_${jurisdictionId}_${answer}` as EntityId,
      stableKey: `test:prek:${jurisdictionId}:${answer}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2026-03-01"),
      outcomeEventId: `event_prek_${jurisdictionId}_${answer}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        proposition_prek: { id: "proposition_prek", stableKey: QUESTION },
      },
    },
    history: {
      legislativeMeasures: laws.map((row) => row.measure),
      legislativeEnactments: laws.map((row) => row.enactment),
    },
  } as unknown as World;
}

const state = (key: string) => stateJurisdictionForKey(key)!.id;

function causeFactor(
  world: World,
  place: string,
  outcome: string,
  key: string,
  on: string,
): number | undefined {
  return outcomeFactor(
    world,
    state(place),
    outcome,
    makeIsoDate(on),
  ).causes.find((cause) => cause.key === key)?.factor;
}

describe("universal pre-K beyond math and graduation", () => {
  it("both new links are sized, contested and act in play", () => {
    for (const key of [
      "universal-prek-to-reading-proficiency",
      "universal-prek-to-violent-crime",
    ]) {
      const link = OUTCOME_LINKS.find((row) => row.key === key)!;
      expect(link.evidence, key).toBe("contested");
      expect(outcomeLinkStatus(link), key).toBe("built");
    }
  });

  it(`a new program moves eighth-grade reading once its first four-year-olds reach eighth grade (seed ${SEED})`, () => {
    const adopter = drawPlace("no");
    const world = worldWith([law(state(adopter), "yes")]);
    const key = "universal-prek-to-reading-proficiency";
    expect(
      causeFactor(world, adopter, READING, key, "2035-09-15") ?? 1,
      adopter,
    ).toBe(1);
    expect(
      causeFactor(world, adopter, READING, key, "2036-01-15"),
      adopter,
    ).toBeCloseTo(0.98, 10);
  });

  it(`a new program lowers violent crime once its first cohort turns 18, and a repeal where it began reverses it (seed ${SEED})`, () => {
    const adopter = drawPlace("no");
    const world = worldWith([law(state(adopter), "yes")]);
    const key = "universal-prek-to-violent-crime";
    expect(
      causeFactor(world, adopter, VIOLENT, key, "2039-12-15") ?? 1,
      adopter,
    ).toBe(1);
    expect(
      causeFactor(world, adopter, VIOLENT, key, "2040-06-15"),
      adopter,
    ).toBeCloseTo(0.988, 10);
    const repealer = drawPlace("yes");
    const repealed = worldWith([law(state(repealer), "no")]);
    expect(
      causeFactor(repealed, repealer, VIOLENT, key, "2040-06-15"),
      repealer,
    ).toBeCloseTo(1.012, 10);
  });
});
