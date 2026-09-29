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
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
} from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * Three environment and energy laws act on a place's own measures.
 *
 * - A clean-electricity standard raises the average price of electricity 11%
 *   seven years after it takes effect (Greenstone and Nath 2019).
 * - A carbon price lowers energy carbon dioxide per person about 3%
 *   (Andersson 2019; Pretis 2022; contested).
 * - A container deposit cuts litter 45% a year on (state studies summarized
 *   by the Container Recycling Institute) and raises the whole consumer price
 *   level about 0.05% within three months, through the price of covered
 *   drinks (Journal of Marketing 2025; BEA 2024 spending shares).
 *
 * Electricity prices and emissions start at EIA's 2024 figures for the 50
 * states and D.C.; litter starts at 100 in every one of the 56 places. The
 * places below are drawn from the starting law, not named: one state that
 * starts without the law adopts it, and one that starts with it repeals it.
 */

const QUESTIONS = {
  clean: "us-policy-positions:environment-energy.clean-electricity-standard",
  carbon: "us-policy-positions:environment-energy.price-carbon",
  deposit: "us-policy-positions:environment-energy.bottle-deposit",
} as const;
type Question = keyof typeof QUESTIONS;

const SEED = "env-energy-5";

type StartingAnswers = Record<string, { answer?: string }>;
function startingAnswers(question: Question): StartingAnswers {
  const questions = (
    startingLaw as unknown as {
      questions: Record<string, { answers: StartingAnswers }>;
    }
  ).questions;
  return questions[QUESTIONS[question]]!.answers;
}

/** A seeded pick among the places that start with the given answer. */
function drawPlace(
  question: Question,
  answer: "yes" | "no",
  measure: string,
): string {
  const places = PLACE_OUTCOME_BASES[measure]!.places;
  const candidates = Object.entries(startingAnswers(question))
    .filter(([key, row]) => row.answer === answer && key in places)
    .map(([key]) => key)
    .sort();
  expect(candidates.length, `${question} ${answer}`).toBeGreaterThan(0);
  let hash = 0;
  for (const character of `${SEED}:${question}:${answer}`)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return candidates[hash % candidates.length]!;
}

function law(
  jurisdictionId: EntityId,
  question: Question,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_${question}_${jurisdictionId}_${answer}` as EntityId;
  const propositionId = `proposition_${question}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${question}:${jurisdictionId}:${answer}`,
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
      id: `enactment_${question}_${jurisdictionId}_${answer}` as EntityId,
      stableKey: `test:${question}:${jurisdictionId}:${answer}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId:
        `event_${question}_${jurisdictionId}_${answer}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof law>[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: Object.fromEntries(
        (Object.keys(QUESTIONS) as Question[]).map((question) => [
          `proposition_${question}`,
          { id: `proposition_${question}`, stableKey: QUESTIONS[question] },
        ]),
      ),
    },
    history: {
      legislativeMeasures: laws.map((row) => row.measure),
      legislativeEnactments: laws.map((row) => row.enactment),
    },
  } as unknown as World;
}

const state = (key: string) => stateJurisdictionForKey(key)!.id;

function factor(world: World, key: string, measure: string, on: string) {
  return outcomeFactor(world, state(key), measure, makeIsoDate(on));
}

describe("environment and energy laws", () => {
  it("starts electricity prices and emissions at EIA's 2024 figures, and litter at 100 everywhere", () => {
    const price = PLACE_OUTCOME_BASES["energy.electricity-price"]!.places;
    const emissions = PLACE_OUTCOME_BASES["env.emissions"]!.places;
    const litter = PLACE_OUTCOME_BASES["env.litter"]!.places;
    expect(Object.keys(price)).toHaveLength(51);
    expect(Object.keys(emissions)).toHaveLength(51);
    expect(Object.keys(litter)).toHaveLength(56);
    // The territories are outside EIA's state series: unknown, never zero.
    expect(price).not.toHaveProperty("US-PR");
    expect(emissions).not.toHaveProperty("US-GU");
    expect(price["US-HI"]).toBe(38);
    expect(price["US-ND"]).toBe(7.93);
    expect(emissions["US-WY"]).toBe(85.2);
    expect(emissions["US-DC"]).toBe(3.6);
    expect(Object.values(litter).every((value) => value === 100)).toBe(true);
    for (const measure of [
      "energy.electricity-price",
      "env.emissions",
      "env.litter",
    ])
      expect(OUTCOMES_PRODUCED.has(measure), measure).toBe(true);
  });

  it("every link from the three laws is built and sized from its study", () => {
    const expected: Record<string, [number, [number, number], number]> = {
      "clean-electricity-to-price": [0.11, [0.03, 0.17], 84],
      "carbon-price-to-emissions": [-0.03, [-0.08, 0], 12],
      "container-deposit-to-litter": [-0.45, [-0.64, -0.3], 12],
      "container-deposit-to-prices": [0.0005, [0.0002, 0.0011], 3],
    };
    for (const [key, [size, range, lag]] of Object.entries(expected)) {
      const link = OUTCOME_LINKS.find((row) => row.key === key)!;
      expect(outcomeLinkStatus(link), key).toBe("built");
      expect(link.size, key).toBe(size);
      expect(link.range, key).toEqual(range);
      expect(link.lagMonths, key).toBe(lag);
    }
  });

  it(`adopting a clean-electricity standard raises power prices 11% after seven years, and repealing one lowers them (seed ${SEED})`, () => {
    const adopter = drawPlace("clean", "no", "energy.electricity-price");
    const world = worldWith([
      law(state(adopter), "clean", "yes", "2026-03-01"),
    ]);
    expect(
      factor(world, adopter, "energy.electricity-price", "2032-12-15")
        .multiplier,
    ).toBe(1);
    expect(
      factor(world, adopter, "energy.electricity-price", "2033-04-15")
        .multiplier,
    ).toBeCloseTo(1.11, 10);
    const repealer = drawPlace("clean", "yes", "energy.electricity-price");
    const repeal = worldWith([
      law(state(repealer), "clean", "no", "2026-03-01"),
    ]);
    expect(
      factor(repeal, repealer, "energy.electricity-price", "2033-04-15")
        .multiplier,
    ).toBeCloseTo(0.89, 10);
    // A state that changed nothing is unmoved.
    expect(
      factor(world, repealer, "energy.electricity-price", "2033-04-15")
        .multiplier,
    ).toBe(1);
  });

  it(`a carbon price lowers emissions 3% a year on, and repeal raises them (seed ${SEED})`, () => {
    const adopter = drawPlace("carbon", "no", "env.emissions");
    const world = worldWith([
      law(state(adopter), "carbon", "yes", "2026-03-01"),
    ]);
    expect(
      factor(world, adopter, "env.emissions", "2027-04-15").multiplier,
    ).toBeCloseTo(0.97, 10);
    const repealer = drawPlace("carbon", "yes", "env.emissions");
    const repeal = worldWith([
      law(state(repealer), "carbon", "no", "2026-03-01"),
    ]);
    expect(
      factor(repeal, repealer, "env.emissions", "2027-04-15").multiplier,
    ).toBeCloseTo(1.03, 10);
  });

  it(`a container deposit cuts litter 45% and nudges prices up; repeal undoes both (seed ${SEED})`, () => {
    const adopter = drawPlace("deposit", "no", "env.litter");
    const world = worldWith([
      law(state(adopter), "deposit", "yes", "2026-03-01"),
    ]);
    expect(
      factor(world, adopter, "env.litter", "2027-04-15").multiplier,
    ).toBeCloseTo(0.55, 10);
    const prices = factor(world, adopter, "household.prices", "2026-06-15");
    expect(prices.multiplier).toBeCloseTo(1.0005, 10);
    expect(prices.causes.map((cause) => cause.key)).toContain(
      "container-deposit-to-prices",
    );
    const repealer = drawPlace("deposit", "yes", "env.litter");
    const repeal = worldWith([
      law(state(repealer), "deposit", "no", "2026-03-01"),
    ]);
    expect(
      factor(repeal, repealer, "env.litter", "2027-04-15").multiplier,
    ).toBeCloseTo(1.45, 10);
  });
});
