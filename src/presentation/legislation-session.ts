import {
  attemptVetoOverride,
  enrollMeasure,
  measurePosition,
  offerFloorAmendment,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  scheduleCommitteeHearing,
  takeFloorVote,
  transmitMeasure,
} from "../simulation/legislation";
import {
  bodyForChamber,
  committeeMembers,
  dispositionsFromCounts,
  jointBody,
  votePlanKeyForAmendment,
  votePlanKeyForCommittee,
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
import type { LegislativeActionKind, World } from "../simulation/types";

/**
 * Carries out the step a player chose.
 *
 * The player decides *what to do next*; how the seated members then vote comes
 * from the scenario's authored decisions. Nothing here nudges a tally.
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

let stepCounter = 0;
function stepKey(prefix: string): string {
  stepCounter += 1;
  return `${prefix}:${stepCounter}`;
}

/** Resets the per-session key counter so a restarted session replays cleanly. */
export function resetLegislativeSessionKeys(): void {
  stepCounter = 0;
}

export function applyLegislativeStep(
  scenario: LegislativeScenario,
  world: World,
  step: LegislativeActionKind,
): StepResult {
  const measureId = scenario.measureId;
  const position = measurePosition(world, measureId);
  const pack = scenario.pack;
  const chamberKey = position.chamberKey ?? pack.chamberOrder[0]!;
  const chamber = chamberByKey(pack, chamberKey);

  switch (step) {
    case "referred": {
      const committee = chamber.committees[0]!;
      return {
        world: referMeasure(world, {
          stableKey: stepKey(`refer:${chamberKey}`),
          measureId,
          committeeKey: committee.committeeKey,
        }),
        message: `Your bill went to the ${committee.name}.`,
      };
    }
    case "committee-hearing-held": {
      const scheduled = scheduleCommitteeHearing(world, {
        stableKey: stepKey(`hearing:${chamberKey}`),
        measureId,
        hearingDate: nextWeek(world.currentDate),
      });
      return {
        world: advanceWorld(scheduled, 7, HEARING_HANDLERS),
        message:
          "The committee held a public hearing and took testimony on the bill.",
      };
    }
    case "committee-reported": {
      const committee = chamber.committees[0]!;
      const body = bodyForChamber(scenario, chamberKey);
      const next = recordCommitteeDisposition(world, {
        stableKey: stepKey(`committee:${chamberKey}`),
        measureId,
        report: "favorable",
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
          : `The ${committee.name} refused to report your bill, and it goes no further.`,
      };
    }
    case "placed-on-calendar":
      return {
        world: placeMeasureOnCalendar(world, {
          stableKey: stepKey(`calendar:${chamberKey}`),
          measureId,
        }),
        message: `Leadership put your bill on the ${chamber.name} calendar.`,
      };
    case "amendment-adopted": {
      const body = bodyForChamber(scenario, chamberKey);
      const next = offerFloorAmendment(world, {
        stableKey: stepKey(`amendment:${chamberKey}`),
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
    case "floor-stage-passed": {
      const body = bodyForChamber(scenario, chamberKey);
      const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
      const next = takeFloorVote(world, {
        stableKey: stepKey(`floor:${chamberKey}:${stage.stageKey}`),
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
      return {
        world: next,
        message: `The ${chamber.name} passed your bill.`,
      };
    }
    case "transmitted": {
      const next = transmitMeasure(world, {
        stableKey: stepKey("transmit"),
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
    case "enrolled":
      return {
        world: enrollMeasure(world, {
          stableKey: stepKey("enroll"),
          measureId,
        }),
        message: "Your bill was put into its final form.",
      };
    case "presented-to-executive":
      return {
        world: presentMeasureToExecutive(world, {
          stableKey: stepKey("present"),
          measureId,
        }),
        message: `Your bill is on the ${pack.executive.titleLabel}'s desk.`,
      };
    case "signed":
    case "vetoed": {
      const action = scenario.governorAction;
      const next = recordExecutiveAction(world, {
        stableKey: stepKey("governor"),
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
    case "override-succeeded": {
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
          : pack.chamberOrder.map((key) => ({
              forumKey: key,
              dispositions: dispositionsFromCounts(
                bodyForChamber(scenario, key).members,
                counts(scenario, votePlanKeyForOverride(key)),
              ),
            }));
      const next = attemptVetoOverride(world, {
        stableKey: stepKey("override"),
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
    case "enacted": {
      const next = recordEnactment(world, {
        stableKey: stepKey("enactment"),
        measureId,
      });
      return { world: next, message: "Your bill is now law." };
    }
    default:
      throw new Error(`That step cannot be taken here: ${step}`);
  }
}

function nextWeek(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 7);
  return parsed.toISOString().slice(0, 10);
}
