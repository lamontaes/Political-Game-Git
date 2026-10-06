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
import { OUTCOME_LINKS, outcomeFactor } from ".";

/*
 * Automatic voter registration: registering eligible people when they deal
 * with the state raises registration a lot and eligible turnout a little,
 * about +1 point on a turnout near 66%, building over the first year
 * (McGhee, Hill and Romero 2021). A state that adopts it gains that turnout a
 * year after it takes effect; a state that repeals it loses it. The world is
 * unseeded, so the link acts at its central size.
 */
const QUESTION = "proposition_avr" as EntityId;
const QUESTION_KEY =
  "us-policy-positions:government-operations.automatic-voter-registration";
const MEASURE = "voting.turnout-pct";

const answers = (
  startingLaw as unknown as {
    questions: Record<
      string,
      { answers: Record<string, { answer: "yes" | "no" }> }
    >;
  }
).questions[QUESTION_KEY]!.answers;
const stateThatBegan = (answer: "yes" | "no") =>
  stateJurisdictionForKey(
    Object.keys(answers)
      .sort()
      .find((key) => answers[key]!.answer === answer)!,
  )!.id;

function law(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_avr_${jurisdictionId}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:avr:${jurisdictionId}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Automatic Voter Registration Act",
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
      id: `enactment_avr_${jurisdictionId}` as EntityId,
      stableKey: `test:avr:${jurisdictionId}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_avr_${jurisdictionId}` as EntityId,
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

const turnout = (world: World, jurisdictionId: EntityId, on: string) =>
  outcomeFactor(world, jurisdictionId, MEASURE, makeIsoDate(on));

describe("automatic voter registration moves turnout", () => {
  it("is sized from the research, with its spread", () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "automatic-registration-to-turnout",
    )!;
    expect(link.size).toBe(0.015);
    expect(link.range).toEqual([0.005, 0.055]);
    expect(link.lagMonths).toBe(12);
  });

  it("raises turnout a year after a state adopts it, and lowers it where a state repeals it", () => {
    const adopter = stateThatBegan("no");
    const repealer = stateThatBegan("yes");
    const world = worldWith([
      law(adopter, "yes", "2026-03-01"),
      law(repealer, "no", "2026-03-01"),
    ]);
    expect(turnout(world, adopter, "2026-12-15").multiplier).toBe(1);
    expect(turnout(world, adopter, "2027-04-15").multiplier).toBeCloseTo(
      1.015,
      10,
    );
    expect(turnout(world, repealer, "2027-04-15").multiplier).toBeCloseTo(
      0.985,
      10,
    );
    // A state whose law stands where it began is unmoved.
    expect(turnout(worldWith([]), adopter, "2027-04-15").multiplier).toBe(1);
  });
});
