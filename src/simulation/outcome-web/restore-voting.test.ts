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
import { OUTCOME_LINKS, outcomeFactor } from ".";

/*
 * Restoring the vote at the end of a sentence adds people to the
 * voting-eligible population who vote less than others, so the eligible
 * turnout rate falls while ballots rise. Each state's size depends on how
 * many people it bars after their sentence (Sentencing Project, Locked Out
 * 2024), sized by Research 3. Where the vote already returns by the end of a
 * sentence, there is no one to restore. The world is unseeded, so the link
 * acts at each place's central size.
 */
const QUESTION = "proposition_restore_voting" as EntityId;
const QUESTION_KEY =
  "us-policy-positions:justice-public-safety.restore-voting-after-sentence";
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
  const id = `measure_restore_${jurisdictionId}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:restore:${jurisdictionId}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "Act 1",
      shortTitle: "Voting Rights Restoration Act",
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
      id: `enactment_restore_${jurisdictionId}` as EntityId,
      stableKey: `test:restore:${jurisdictionId}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_restore_${jurisdictionId}` as EntityId,
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

const link = OUTCOME_LINKS.find(
  (row) => row.key === "restore-voting-to-turnout",
)!;

describe("restoring the vote after a sentence moves the eligible turnout rate", () => {
  it("is sized state by state, and only where people are barred after their sentence", () => {
    expect(link.size).toBe(0);
    const barred = Object.keys(link.sizeByPlace!).sort();
    // Every place with a size is one whose starting law does not restore.
    for (const key of barred) expect(answers[key]!.answer).toBe("no");
    expect(link.sizeByPlace!["US-TN"]!.size).toBeCloseTo(-0.0413, 4);
  });

  it("lowers the rate from the day a barring state restores the vote, and a repeal undoes it", () => {
    const tennessee = stateJurisdictionForKey("US-TN")!.id;
    const restores = law(tennessee, "yes", "2026-03-01");
    expect(
      turnout(worldWith([restores]), tennessee, "2026-02-28").multiplier,
    ).toBe(1);
    expect(
      turnout(worldWith([restores]), tennessee, "2026-03-01").multiplier,
    ).toBeCloseTo(1 - 0.0413, 4);
    const repeal = {
      ...law(tennessee, "no", "2027-01-01"),
    };
    const both = worldWith([
      restores,
      {
        measure: {
          ...repeal.measure,
          id: "measure_repeal" as EntityId,
          stableKey: "test:repeal",
          sequence: 2,
        },
        enactment: {
          ...repeal.enactment,
          id: "enactment_repeal" as EntityId,
          stableKey: "test:repeal:enactment",
          sequence: 1002,
          measureId: "measure_repeal" as EntityId,
        },
      },
    ]);
    expect(turnout(both, tennessee, "2027-01-01").multiplier).toBe(1);
  });

  it("changes nothing where the vote already returns at the end of a sentence", () => {
    const place = stateThatBegan("yes");
    const world = worldWith([law(place, "no", "2026-03-01")]);
    expect(turnout(world, place, "2026-06-01").multiplier).toBe(1);
  });
});
