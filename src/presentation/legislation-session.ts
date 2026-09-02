import {
  attemptVetoOverride,
  chamberForPosition,
  enrollMeasure,
  measurePosition,
  nextMeasureStableKey,
  offerFloorAmendment,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordConcurrenceVote,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  scheduleCommitteeHearing,
  takeFloorVote,
  transmitMeasure,
  type MeasureStepKey,
} from "../simulation/legislation";
import {
  bodyForChamber,
  committeeMembers,
  dispositionsFromCounts,
  jointBody,
  votePlanKeyForAmendment,
  votePlanKeyForCommittee,
  votePlanKeyForConcurrence,
  votePlanKeyForFloor,
  votePlanKeyForOverride,
  type LegislativeScenario,
} from "../simulation/legislation-scenarios";
import { chamberByKey, floorStageByKey } from "../simulation/legislature-rules";
import { advanceWorld } from "../simulation/world";
import { createFutureTransitionHandlerRegistry } from "../simulation/future-transitions";
import {
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
} from "../simulation/legislation";
import { addDays, daysBetween } from "../simulation/dates";
import type { World } from "../simulation/types";

/**
 * Carries out the step a player chose.
 *
 * The player decides *what to do next*; how the seated members then vote comes
 * from the scenario's authored decisions, and what the governor does is the
 * governor's. Nothing here nudges a tally.
 *
 * Every record this writes is keyed from the saved world itself, so a player
 * who saves, reloads and carries on gets the same next key as one who never
 * left. Identity belongs to the world, not to the browser tab.
 */

const HEARING_HANDLERS = createFutureTransitionHandlerRegistry([
  [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
]);

export interface StepResult {
  readonly world: World;
  readonly message: string;
}

function counts(scenario: LegislativeScenario, key: string) {
  const plan = scenario.votePlan[key];
  if (!plan) {
    throw new Error(`This scenario has no recorded decisions for '${key}'.`);
  }
  return plan;
}

export function applyLegislativeStep(
  scenario: LegislativeScenario,
  world: World,
  step: MeasureStepKey,
): StepResult {
  const measureId = scenario.measureId;
  const position = measurePosition(world, measureId);
  const pack = scenario.pack;
  const chamberKey = position.chamberKey ?? pack.chamberOrder[0]!;
  const chamber = chamberByKey(pack, chamberKey);
  const key = (prefix: string) =>
    nextMeasureStableKey(world, measureId, prefix);

  switch (step) {
    case "request-referral": {
      const committee = chamber.committees[0]!;
      return {
        world: referMeasure(world, {
          stableKey: key(`refer:${chamberKey}`),
          measureId,
          committeeKey: committee.committeeKey,
        }),
        message: `Your bill went to the ${committee.name}.`,
      };
    }
    case "request-committee-hearing": {
      const scheduled = scheduleCommitteeHearing(world, {
        stableKey: key(`hearing:${chamberKey}`),
        measureId,
        hearingDate: addDays(world.currentDate, 7),
      });
      return {
        world: advanceWorld(scheduled, 7, HEARING_HANDLERS),
        message:
          "The committee held a public hearing and took testimony on the bill.",
      };
    }
    case "move-committee-report": {
      const committee = chamber.committees[0]!;
      const body = bodyForChamber(scenario, chamberKey);
      const next = recordCommitteeDisposition(world, {
        stableKey: key(`committee:${chamberKey}`),
        measureId,
        recommendation: "favorable",
        dispositions: dispositionsFromCounts(
          committeeMembers(body, committee.appointedMembers),
          counts(scenario, votePlanKeyForCommittee(committee.committeeKey)),
        ),
        rationale:
          "The committee weighed the testimony it heard and voted on reporting the bill.",
        provenance: {
          method: "authored-fixture",
          note: "Committee members' recorded decisions for this scenario.",
          sourceEntityIds: [],
        },
      });
      const reported = measurePosition(next, measureId).phase !== "failed";
      return {
        world: next,
        message: reported
          ? `The ${committee.name} voted to send your bill to the floor.`
          : `The ${committee.name} would not report your bill, and it goes no further.`,
      };
    }
    case "request-calendar-placement":
      return {
        world: placeMeasureOnCalendar(world, {
          stableKey: key(`calendar:${chamberKey}`),
          measureId,
        }),
        message: `Leadership put your bill on the ${chamber.name} calendar.`,
      };
    case "offer-amendment": {
      const body = bodyForChamber(scenario, chamberKey);
      const next = offerFloorAmendment(world, {
        stableKey: key(`amendment:${chamberKey}`),
        measureId,
        description:
          "Narrow the pilot so it starts in the counties already served.",
        offeredByLabel: "Floor sponsor",
        dispositions: dispositionsFromCounts(
          body.members,
          counts(scenario, votePlanKeyForAmendment(chamberKey)),
        ),
        provenance: {
          method: "authored-fixture",
          note: "Members' recorded decisions on the amendment.",
          sourceEntityIds: [],
        },
      });
      const amendment = (next.history.legislativeAmendments ?? []).at(-1);
      return {
        world: next,
        message:
          amendment?.status === "adopted"
            ? "The chamber adopted your amendment; the bill is still at the same stage."
            : "The chamber rejected your amendment; the bill is unchanged.",
      };
    }
    case "await-next-legislative-day": {
      const until = position.earliestNextFloorDate;
      if (!until) {
        throw new Error("The bill is not waiting on a legislative day.");
      }
      const days = Math.max(1, daysBetween(world.currentDate, until));
      const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
      return {
        world: advanceWorld(world, days, HEARING_HANDLERS),
        message: `The ${chamber.name} took up other business. ${stage.label} can be reached now.`,
      };
    }
    case "move-floor-vote": {
      const body = bodyForChamber(scenario, chamberKey);
      const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
      const next = takeFloorVote(world, {
        stableKey: key(`floor:${chamberKey}:${stage.stageKey}`),
        measureId,
        dispositions: dispositionsFromCounts(
          body.members,
          counts(scenario, votePlanKeyForFloor(chamberKey, stage.stageKey)),
        ),
        presentMembers: chamber.seats,
        provenance: {
          method: "authored-fixture",
          note: "Members' recorded decisions on this question.",
          sourceEntityIds: [],
        },
      });
      const after = measurePosition(next, measureId);
      if (after.phase === "failed") {
        return {
          world: next,
          message: `The ${chamber.name} did not give your bill the votes it needed.`,
        };
      }
      if (after.phase === "on-floor") {
        const nextStage = floorStageByKey(chamber, after.floorStageKey ?? "");
        return {
          world: next,
          message: `Your bill cleared ${stage.label} and moves to ${nextStage.label}.`,
        };
      }
      if (after.phase === "awaiting-concurrence") {
        const origin = chamberForPosition(pack, after);
        return {
          world: next,
          message: `The ${chamber.name} passed your bill, but it changed the text, so the ${origin?.name ?? "other chamber"} has to agree to that change.`,
        };
      }
      return {
        world: next,
        message: `The ${chamber.name} passed your bill.`,
      };
    }
    case "transmit-to-second-chamber": {
      const next = transmitMeasure(world, {
        stableKey: key("transmit"),
        measureId,
      });
      const target = chamberByKey(
        pack,
        measurePosition(next, measureId).chamberKey ?? "",
      );
      return {
        world: next,
        message: `Your bill is now before the ${target.name}.`,
      };
    }
    case "move-concurrence": {
      const body = bodyForChamber(scenario, chamberKey);
      const next = recordConcurrenceVote(world, {
        stableKey: key(`concurrence:${chamberKey}`),
        measureId,
        dispositions: dispositionsFromCounts(
          body.members,
          counts(scenario, votePlanKeyForConcurrence(chamberKey)),
        ),
        provenance: {
          method: "authored-fixture",
          note: "Members' recorded decisions on accepting the other chamber's changes.",
          sourceEntityIds: [],
        },
      });
      const agreed =
        measurePosition(next, measureId).phase === "awaiting-enrollment";
      return {
        world: next,
        message: agreed
          ? `The ${chamber.name} accepted the changes, so there is one bill again.`
          : `The ${chamber.name} refused the changes, and the two chambers never agreed on one bill.`,
      };
    }
    case "request-enrollment":
      return {
        world: enrollMeasure(world, {
          stableKey: key("enroll"),
          measureId,
        }),
        message: "Your bill was put into its final form.",
      };
    case "present-to-executive":
      return {
        world: presentMeasureToExecutive(world, {
          stableKey: key("present"),
          measureId,
        }),
        message: `Your bill is on the ${pack.executive.titleLabel}'s desk.`,
      };
    case "await-executive-decision": {
      // The player waits. What the Governor then does is the Governor's, and
      // it is only revealed once the wait is over.
      const action = scenario.governorAction;
      const next = recordExecutiveAction(world, {
        stableKey: key("governor"),
        measureId,
        action,
        rationale: scenario.governorRationale,
      });
      return {
        world: next,
        message:
          action === "signed"
            ? `The ${pack.executive.titleLabel} signed your bill.`
            : `The ${pack.executive.titleLabel} vetoed your bill. ${scenario.governorRationale}`,
      };
    }
    case "move-veto-override": {
      const override = pack.executive.override;
      const forums =
        override.kind === "joint-session"
          ? [
              {
                forumKey: "joint",
                dispositions: dispositionsFromCounts(
                  jointBody(scenario).members,
                  counts(scenario, votePlanKeyForOverride("joint")),
                ),
              },
            ]
          : pack.chamberOrder.map((forumChamberKey) => ({
              forumKey: forumChamberKey,
              dispositions: dispositionsFromCounts(
                bodyForChamber(scenario, forumChamberKey).members,
                counts(scenario, votePlanKeyForOverride(forumChamberKey)),
              ),
            }));
      const next = attemptVetoOverride(world, {
        stableKey: key("override"),
        measureId,
        forums,
        rationale: "The legislature reconsidered the vetoed bill.",
        provenance: {
          method: "authored-fixture",
          note: "Members' recorded decisions on the override.",
          sourceEntityIds: [],
        },
      });
      const after = measurePosition(next, measureId);
      return {
        world: next,
        message:
          after.phase === "failed"
            ? "The override fell short, so the veto stands and your bill is dead."
            : "The legislature overrode the veto.",
      };
    }
    case "record-enactment": {
      const next = recordEnactment(world, {
        stableKey: key("enactment"),
        measureId,
      });
      return { world: next, message: "Your bill is now law." };
    }
    default:
      throw new Error(`That step cannot be taken here: ${step}`);
  }
}
