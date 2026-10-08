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
  outcomeLinksFedByQuestion,
  outcomeWebStatus,
} from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * Groundwater limits: where a state meters and limits large groundwater
 * withdrawals, farms pump less groundwater to irrigate. Kansas's first Local
 * Enhanced Management Area cut irrigation pumping 31% under capped
 * allocations (Deines and others 2019, 95% interval 21% to 40%); the link
 * takes that cut one year after the law takes effect, in each direction, and
 * only where it changes what the place began with: 31 states, Puerto Rico and
 * Guam limit withdrawals, and D.C. and three territories are estimated. The
 * world is unseeded, so the link acts at its central size.
 */
const QUESTION = "proposition_groundwater" as EntityId;
const QUESTION_KEY =
  "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal";
const MEASURE = "water.irrigation-groundwater";
const LINK = "groundwater-limits-to-irrigation-pumping";

function law(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_groundwater_${jurisdictionId}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:groundwater:${jurisdictionId}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Groundwater Management Act",
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
      id: `enactment_groundwater_${jurisdictionId}` as EntityId,
      stableKey: `test:groundwater:${jurisdictionId}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_groundwater_${jurisdictionId}` as EntityId,
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

const pumped = (world: World, jurisdictionId: EntityId, on: string) =>
  outcomeFactor(world, jurisdictionId, MEASURE, makeIsoDate(on));

const began = (
  startingLaw.questions as Record<
    string,
    { answers: Record<string, { answer: "yes" | "no"; estimated?: string }> }
  >
)[QUESTION_KEY]!.answers;

describe("groundwater limits", () => {
  it("retains all starting answers and research while leaving the deferred link unconsumed", () => {
    expect(Object.keys(began)).toHaveLength(56);
    const yes = Object.values(began).filter((row) => row.answer === "yes");
    expect(yes).toHaveLength(37);
    const estimated = Object.keys(began).filter((key) => began[key]!.estimated);
    expect(estimated.sort()).toEqual(["US-AS", "US-DC", "US-MP", "US-VI"]);
    const link = OUTCOME_LINKS.find((row) => row.key === LINK)!;
    expect(outcomeLinkStatus(link)).toBe("built");
    expect(link.size).toBe(-0.31);
    expect(link.range).toEqual([-0.4, -0.21]);
    expect(link.lagMonths).toBe(12);
    expect(link.consumed).toBe(false);
    expect(outcomeLinksFedByQuestion(QUESTION_KEY)).toEqual([]);
    expect(outcomeWebStatus().find((row) => row.key === LINK)?.consumed).toBe(
      false,
    );
  });

  it("starts the 50 states and Puerto Rico at their 2015 irrigation pumping", () => {
    const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
    expect(Object.keys(places)).toHaveLength(51);
    expect(places["US-AR"]).toBeGreaterThan(9000);
    expect(places["US-WV"]).toBeLessThan(1);
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("does not consume an enacted groundwater cap in any place with recorded base data", () => {
    const places = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places);
    for (const key of places) {
      const state = stateJurisdictionForKey(key)!.id;
      const flipped = began[key]!.answer === "yes" ? "no" : "yes";
      const world = worldWith([law(state, flipped, "2026-07-01")]);
      expect(pumped(world, state, "2027-06-15").multiplier, key).toBe(1);
      expect(world.history.legislativeEnactments).toHaveLength(1);
      expect(pumped(world, state, "2027-07-15").multiplier, key).toBe(1);
      expect(
        pumped(world, state, "2027-07-15").causes.some(
          (cause) => cause.key === LINK,
        ),
        key,
      ).toBe(false);
      // Enacting what the place already had changes nothing.
      const same = worldWith([law(state, began[key]!.answer, "2026-07-01")]);
      expect(pumped(same, state, "2027-07-15").multiplier, key).toBe(1);
    }
  });
});
