/** Test fixture: an Omaha game whose Nebraska Legislature passes minimum wage bills. */
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  fileRuleChangeProvision,
  laborLawOfficeKey,
} from "../../src/simulation/enacted-rule-changes";
import { addDays, daysBetween } from "../../src/simulation/dates";
import { createFutureTransitionHandlerRegistry } from "../../src/simulation/future-transitions";
import {
  enrollMeasure,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  takeFloorVote,
} from "../../src/simulation/legislation";
import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
} from "../../src/simulation/legislation-scenarios";
import { chamberByKey } from "../../src/simulation/legislature-rules";
import { recordFiledProvision } from "../../src/simulation/legislative-politics";

import { advanceWorld } from "../../src/simulation/world";
import type { EntityId, World } from "../../src/simulation";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this fixture.",
  sourceEntityIds: [] as readonly EntityId[],
};

const QUESTION_KEY = "us-policy-positions:labor-workforce.raise-minimum-wage";

export interface RaiseBill {
  readonly key: string;
  readonly designation: string;
  readonly answer: "yes" | "no";
  readonly effectiveInDays: number;
  /** An explicit authored bill amount; omission supplies no numeric floor. */
  readonly cents?: number;
}

/**
 * An Omaha game in which Nebraska's Legislature passes each bill on "should
 * the state minimum wage be raised?" (answering yes or no, naming no dollar
 * figure) and the Governor signs it.
 */
export function omahaWithRaiseBills(bills: readonly RaiseBill[]) {
  const scenario = createLegislativeScenario("nebraska");
  const template = scenario.world.history.legislativeMeasures!.find(
    (measure) => measure.id === scenario.measureId,
  )!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "state-minimum-wage-bill-terms",
      placeKey: "3137000",
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const player = game.playerPersonId;
  const opened = game.world.currentDate;
  const chamber = chamberByKey(scenario.pack, "legislature");
  const committee = chamber.committees[0]!;
  const seated = bodyForChamber(scenario, "legislature");
  const body = {
    ...seated,
    members: seated.members.map((member) => ({ ...member, personId: null })),
  };
  let world: World = game.world;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (definition) => definition.stableKey === QUESTION_KEY,
  )!;
  const measures: EntityId[] = [];
  for (const bill of bills) {
    const key = `raise:${bill.key}`;
    world = introduceMeasure(world, {
      stableKey: `${key}:measure`,
      jurisdictionId: template.jurisdictionId,
      rulePackId: template.rulePackId,
      designation: bill.designation.split(",")[0]!,
      shortTitle: "Minimum wage",
      summary: "Answers whether the state minimum wage should be raised.",
      origin: "member-introduction",
      subjectClass: template.subjectClass,
      sponsorPersonId: player,
      propositionIds: [proposition.id],
      propositionAnswers: [
        { propositionId: proposition.id, answer: bill.answer },
      ],
    });
    const measureId = world.history.legislativeMeasures!.find(
      (measure) => measure.stableKey === `${key}:measure`,
    )!.id;
    measures.push(measureId);
    if (bill.cents !== undefined) {
      world = fileRuleChangeProvision(world, {
        stableKey: `${key}:floor`,
        measureId,
        officeKey: laborLawOfficeKey("NE"),
        field: "labor.minimumWage.hourlyCents",
        value: bill.cents,
      });
      world = recordFiledProvision(world, {
        stableKey: `${key}:numeric-floor`,
        measureId,
        provisionKey: "hourly-floor",
        sectionNumber: 1,
        heading: "Hourly minimum",
        text: `The hourly minimum is ${bill.cents} cents.`,
        beneficiary: {
          kind: "general-application",
          appliesToLabel: "Covered workers",
        },
        applicationScope: {
          jurisdictionId: template.jurisdictionId,
          segmentKey: null,
        },
        answers: { propositionId: proposition.id, answer: bill.answer },
        lawTerms: [
          {
            questionKey: QUESTION_KEY,
            key: "target",
            value: bill.cents,
            unit: "minor/hour",
          },
        ],
      });
    }
    world = referMeasure(world, {
      stableKey: `${key}:referral`,
      measureId,
      committeeKey: committee.committeeKey,
    });
    world = recordCommitteeDisposition(world, {
      stableKey: `${key}:committee`,
      measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers, nay: 0 },
      ),
      rationale: "The committee backed the bill.",
      provenance: AUTHORED,
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: `${key}:calendar`,
      measureId,
    });
  }
  for (const stage of chamber.floorStages) {
    for (const [index, measureId] of measures.entries()) {
      const until = measurePosition(world, measureId).earliestNextFloorDate;
      if (until && world.currentDate < until)
        world = advanceWorld(
          world,
          daysBetween(world.currentDate, until),
          createFutureTransitionHandlerRegistry([]),
        );
      world = takeFloorVote(world, {
        stableKey: `raise:${bills[index]!.key}:${stage.stageKey}`,
        measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: body.members.length,
          nay: 0,
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance: AUTHORED,
      });
    }
  }
  for (const [index, measureId] of measures.entries()) {
    const bill = bills[index]!;
    const key = `raise:${bill.key}`;
    world = enrollMeasure(world, { stableKey: `${key}:enroll`, measureId });
    world = presentMeasureToExecutive(world, {
      stableKey: `${key}:present`,
      measureId,
    });
    world = recordExecutiveAction(world, {
      stableKey: `${key}:governor`,
      measureId,
      action: "signed",
      rationale: "The Governor signed it.",
    });
    world = recordEnactment(world, {
      stableKey: `${key}:enactment`,
      measureId,
      actDesignation: bill.designation,
      effectiveAt: addDays(opened, bill.effectiveInDays),
    });
  }
  return { world, player, opened };
}
