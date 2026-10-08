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
 * Farmland easements: where a state pays landowners to put easements on
 * farmland that keep it from being developed, less farmland is lost to
 * development. Such programs cut a county's rate of farmland loss by 40% to
 * 55% across six Mid-Atlantic states over 50 years (Liu and Lynch 2011); the
 * link takes the middle, 47%, one Census of Agriculture period (five years)
 * after the law takes effect, in each direction, and only where it changes
 * what the place began with. 30 states and Puerto Rico had a program running
 * in 2024 or opened one since; Tennessee's opened on 9/1/2026. The world is
 * unseeded, so the link acts at its central size.
 */
const QUESTION = "proposition_farmland" as EntityId;
const QUESTION_KEY =
  "us-policy-positions:agriculture-natural-resources.protect-farmland-from-development";
const MEASURE = "farmland.developed-acres";
const LINK = "farmland-easements-to-farmland-lost";

function law(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_farmland_${jurisdictionId}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:farmland:${jurisdictionId}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Farmland Preservation Act",
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
      id: `enactment_farmland_${jurisdictionId}` as EntityId,
      stableKey: `test:farmland:${jurisdictionId}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_farmland_${jurisdictionId}` as EntityId,
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

const lost = (world: World, jurisdictionId: EntityId, on: string) =>
  outcomeFactor(world, jurisdictionId, MEASURE, makeIsoDate(on));

const began = (
  startingLaw.questions as Record<
    string,
    { answers: Record<string, { answer: "yes" | "no"; operativeAt?: string }> }
  >
)[QUESTION_KEY]!.answers;

describe("farmland easements", () => {
  it("has a starting answer in all 56 places and a sized link that acts", () => {
    expect(Object.keys(began)).toHaveLength(56);
    const yes = Object.values(began).filter((row) => row.answer === "yes");
    expect(yes).toHaveLength(31);
    const link = OUTCOME_LINKS.find((row) => row.key === LINK)!;
    expect(outcomeLinkStatus(link)).toBe("built");
    expect(link.size).toBe(-0.47);
    expect(link.range).toEqual([-0.55, -0.4]);
    expect(link.lagMonths).toBe(60);
  });

  it("starts the 48 contiguous states at their 2001 to 2016 yearly loss", () => {
    const places = PLACE_OUTCOME_BASES[MEASURE]!.places;
    expect(Object.keys(places)).toHaveLength(48);
    expect(places["US-TX"]).toBe(91533);
    expect(places["US-RI"]).toBe(267);
    expect(OUTCOMES_PRODUCED.has(MEASURE)).toBe(true);
  });

  it("moves farmland lost 47% five years after a state changes its answer, in every place with data", () => {
    const places = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places).filter(
      (key) => !began[key]!.operativeAt,
    );
    expect(places).toHaveLength(47);
    for (const key of places) {
      const state = stateJurisdictionForKey(key)!.id;
      const flipped = began[key]!.answer === "yes" ? "no" : "yes";
      const world = worldWith([law(state, flipped, "2026-07-01")]);
      expect(lost(world, state, "2031-06-15").multiplier, key).toBe(1);
      expect(lost(world, state, "2031-07-15").multiplier, key).toBeCloseTo(
        flipped === "yes" ? 0.53 : 1.47,
        10,
      );
      // Enacting what the place already had changes nothing.
      const same = worldWith([law(state, began[key]!.answer, "2026-07-01")]);
      expect(lost(same, state, "2031-07-15").multiplier, key).toBe(1);
    }
  });

  it("Tennessee's program, opened on 9/1/2026, slows its loss five years later with no new law", () => {
    const tennessee = stateJurisdictionForKey("US-TN")!.id;
    const world = worldWith([]);
    expect(lost(world, tennessee, "2031-08-15").multiplier).toBe(1);
    const after = lost(world, tennessee, "2031-09-15");
    expect(after.multiplier).toBeCloseTo(0.53, 10);
    expect(after.causes.map((cause) => cause.key)).toEqual([LINK]);
  });
});
