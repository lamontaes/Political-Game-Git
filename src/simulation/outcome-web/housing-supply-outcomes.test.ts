import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";
import { addDays, makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import type {
  EntityId,
  IsoDate,
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
 * Housing outcomes the world now computes for each state, D.C. and Puerto
 * Rico from the Census Bureau's 2024 figures: the share of homes rented, the
 * share of renters who moved in the past year, and new apartments in large
 * buildings. Rent stabilization moves the first two (Diamond, McQuade and
 * Qian 2019); allowing small multifamily homes in single-family zones moves
 * the third. Each acts only where a law changes what the place began with.
 * The world is unseeded, so each link acts at its central size.
 */
const QUESTIONS = {
  rentStabilization: "us-policy-positions:housing-land-use.rent-stabilization",
  multifamily:
    "us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones",
} as const;

function law(
  jurisdictionId: EntityId,
  questionKey: string,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const question = `proposition_${questionKey}` as EntityId;
  const id = `measure_housing_${jurisdictionId}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:housing:${jurisdictionId}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Housing Act",
      summary: "A test law.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-10"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [question],
      propositionAnswers: [{ propositionId: question, answer }],
    },
    enactment: {
      id: `enactment_housing_${jurisdictionId}` as EntityId,
      stableKey: `test:housing:${jurisdictionId}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt,
      outcomeEventId: `event_housing_${jurisdictionId}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: Object.fromEntries(
        Object.values(QUESTIONS).map((key) => [
          `proposition_${key}`,
          { id: `proposition_${key}`, stableKey: key },
        ]),
      ),
    },
    history: {
      legislativeMeasures: laws.map((row) => row.measure),
      legislativeEnactments: laws.map((row) => row.enactment),
    },
  } as unknown as World;
}

const began = (key: string) =>
  (
    startingLaw.questions as Record<
      string,
      {
        answers: Record<string, { answer: "yes" | "no"; operativeAt?: string }>;
      }
    >
  )[key]!.answers;

const EFFECTIVE = makeIsoDate("2026-07-01");

/** Each place with data: a law flipping its starting answer moves `measure`. */
function flipMoves(
  questionKey: string,
  measure: string,
  lagMonths: number,
  size: number,
): number {
  const answers = began(questionKey);
  let places = 0;
  for (const key of Object.keys(PLACE_OUTCOME_BASES[measure]!.places)) {
    const row = answers[key];
    if (!row || row.operativeAt) continue;
    const state = stateJurisdictionForKey(key)!.id;
    const flipped = row.answer === "yes" ? "no" : "yes";
    const world = worldWith([law(state, questionKey, flipped, EFFECTIVE)]);
    const acts = addDays(EFFECTIVE, Math.round(lagMonths * 30.44) + 20);
    const before = addDays(EFFECTIVE, -20);
    expect(outcomeFactor(world, state, measure, before).multiplier, key).toBe(
      1,
    );
    expect(
      outcomeFactor(world, state, measure, acts).multiplier,
      key,
    ).toBeCloseTo(flipped === "yes" ? 1 + size : 1 - size, 10);
    // Enacting what the place already had changes nothing.
    const same = worldWith([law(state, questionKey, row.answer, EFFECTIVE)]);
    expect(outcomeFactor(same, state, measure, acts).multiplier, key).toBe(1);
    places += 1;
  }
  return places;
}

describe("housing outcomes a housing law moves", () => {
  it("starts each outcome at the Census Bureau's 2024 figure, and its links act", () => {
    const bases = (measure: string) => PLACE_OUTCOME_BASES[measure]!.places;
    expect(Object.keys(bases("housing.rental-supply"))).toHaveLength(52);
    expect(bases("housing.rental-supply")["US-DC"]).toBe(59.1);
    expect(Object.keys(bases("housing.renter-moves"))).toHaveLength(51);
    expect(Object.keys(bases("housing.new-large-buildings"))).toHaveLength(52);
    for (const measure of [
      "housing.rental-supply",
      "housing.renter-moves",
      "housing.new-large-buildings",
    ])
      expect(OUTCOMES_PRODUCED.has(measure), measure).toBe(true);
    for (const key of [
      "rent-control-to-rental-supply",
      "rent-control-to-tenant-stays",
      "housing-by-right-to-new-buildings",
    ])
      expect(
        outcomeLinkStatus(OUTCOME_LINKS.find((row) => row.key === key)!),
        key,
      ).toBe("built");
  });

  it("rent stabilization cuts the share of homes rented 15% a year after it takes effect, in every place with data", () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "rent-control-to-rental-supply",
    )!;
    expect(
      flipMoves(
        QUESTIONS.rentStabilization,
        "housing.rental-supply",
        link.lagMonths,
        link.size!,
      ),
    ).toBeGreaterThan(40);
  });

  it("rent stabilization cuts renters' moves 20% from the day it takes effect, in every place with data", () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "rent-control-to-tenant-stays",
    )!;
    expect(
      flipMoves(
        QUESTIONS.rentStabilization,
        "housing.renter-moves",
        link.lagMonths,
        link.size!,
      ),
    ).toBeGreaterThan(40);
  });

  it("allowing multifamily homes doubles new apartments in large buildings a year later, in every place with data", () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "housing-by-right-to-new-buildings",
    )!;
    expect(link.size).toBe(1);
    expect(
      flipMoves(
        QUESTIONS.multifamily,
        "housing.new-large-buildings",
        link.lagMonths,
        link.size!,
      ),
    ).toBeGreaterThan(40);
  });
});
