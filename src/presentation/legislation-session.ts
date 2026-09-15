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
  legislativeScenarioKeys,
  votePlanKeyForAmendment,
  votePlanKeyForCommittee,
  votePlanKeyForConcurrence,
  votePlanKeyForFloor,
  votePlanKeyForOverride,
  type LegislativeProcedureContext,
  type SeatedMember,
} from "../simulation/legislation-scenarios";
import { chamberByKey, floorStageByKey } from "../simulation/legislature-rules";
import {
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
} from "../simulation/future-transitions";
import { passOrdinaryDays } from "./ordinary-life";
import {
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
} from "../simulation/legislation";
import { addDays, daysBetween } from "../simulation/dates";
import type { World } from "../simulation/types";
import { dispositionsHonoringOfficeInstructions } from "./office-vote-instruction";

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

function counts(scenario: LegislativeProcedureContext, key: string) {
  const plan = scenario.votePlan[key];
  if (!plan) {
    throw new Error(`This scenario has no recorded decisions for '${key}'.`);
  }
  return plan;
}
function recordedDispositions(
  scenario: LegislativeProcedureContext,
  members: readonly SeatedMember[],
  question: string,
) {
  const dispositions = dispositionsFromCounts(
    members,
    counts(scenario, question),
  );
  return scenario.recordedSittingEventId
    ? dispositions.map((record) =>
        record.personId === scenario.recordedPlayerPersonId &&
        scenario.recordedPlayerBallot
          ? { ...record, disposition: scenario.recordedPlayerBallot }
          : record,
      )
    : dispositions;
}

export function applyLegislativeStep(
  scenario: LegislativeProcedureContext,
  world: World,
  step: MeasureStepKey,
): StepResult {
  const measureId = scenario.measureId;
  const position = measurePosition(world, measureId);
  const pack = scenario.pack;
  const chamberKey = position.chamberKey ?? pack.chamberOrder[0]!;
  const chamber = chamberByKey(pack, chamberKey);
  const measure = world.history.legislativeMeasures?.find(
    (entry) => entry.id === measureId,
  );
  const legacyFixture = legislativeScenarioKeys().some(
    (fixtureKey) =>
      measure?.stableKey === `${fixtureKey}:measure` ||
      measure?.stableKey === `legislative-work:${fixtureKey}:measure`,
  );
  const key = (prefix: string) =>
    nextMeasureStableKey(
      world,
      measureId,
      legacyFixture ? prefix : `measure:${measureId}:${prefix}`,
    );

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
      const pending = world.history.futureDueItems.find(
        (item) =>
          item.transitionKey === COMMITTEE_HEARING_TRANSITION_KEY &&
          item.entityIds.includes(measureId) &&
          futureDueItemStateAt(world, item.id, {
            asOfDate: world.currentDate,
            historySequenceExclusive: world.history.nextSequence,
          })?.status === "scheduled",
      );
      const hearingDate = pending?.dueAt ?? addDays(world.currentDate, 7);
      const scheduled = pending
        ? world
        : scheduleCommitteeHearing(world, {
            stableKey: key(`hearing:${chamberKey}`),
            measureId,
            hearingDate,
          });
      const next = passOrdinaryDays(
        scheduled,
        Math.max(1, daysBetween(world.currentDate, hearingDate)),
        HEARING_HANDLERS,
      );
      return {
        world: next,
        message: measurePosition(next, measureId).hearingHeld
          ? "The committee held a public hearing and took testimony on the bill."
          : "Time stopped at a commitment. The committee hearing remains scheduled.",
      };
    }
    case "move-committee-report": {
      const committee = chamber.committees[0]!;
      const body = bodyForChamber(scenario, chamberKey);
      const next = recordCommitteeDisposition(world, {
        stableKey: key(`committee:${chamberKey}`),
        measureId,
        recommendation: "favorable",
        dispositions: recordedDispositions(
          scenario,
          committeeMembers(body, committee.appointedMembers),
          votePlanKeyForCommittee(committee.committeeKey),
        ),
        rationale:
          "The committee weighed the testimony it heard and voted on reporting the bill.",
        provenance: {
          method: "authored-fixture",
          note: "Committee members' recorded decisions for this scenario.",
          sourceEntityIds: scenario.recordedSittingEventId
            ? [scenario.recordedSittingEventId]
            : [],
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
        dispositions: dispositionsHonoringOfficeInstructions(world, {
          measureId,
          chamberKey,
          dispositions: recordedDispositions(
            scenario,
            body.members,
            votePlanKeyForAmendment(chamberKey),
          ),
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance: {
          method: "authored-fixture",
          note: "Members' recorded decisions on the amendment.",
          sourceEntityIds: scenario.recordedSittingEventId
            ? [scenario.recordedSittingEventId]
            : [],
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
      const next = passOrdinaryDays(world, days, HEARING_HANDLERS);
      return {
        world: next,
        message:
          next.currentDate >= until
            ? `The ${chamber.name} took up other business. ${stage.label} can be reached now.`
            : "Time stopped at a commitment. The bill is still waiting on its next legislative day.",
      };
    }
    case "move-floor-vote": {
      const body = bodyForChamber(scenario, chamberKey);
      const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
      const next = takeFloorVote(world, {
        stableKey: key(`floor:${chamberKey}:${stage.stageKey}`),
        measureId,
        dispositions: dispositionsHonoringOfficeInstructions(world, {
          measureId,
          chamberKey,
          dispositions: recordedDispositions(
            scenario,
            body.members,
            votePlanKeyForFloor(chamberKey, stage.stageKey),
          ),
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance: {
          method: "authored-fixture",
          note: "Members' recorded decisions on this question.",
          sourceEntityIds: scenario.recordedSittingEventId
            ? [scenario.recordedSittingEventId]
            : [],
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
        dispositions: dispositionsHonoringOfficeInstructions(world, {
          measureId,
          chamberKey,
          dispositions: recordedDispositions(
            scenario,
            body.members,
            votePlanKeyForConcurrence(chamberKey),
          ),
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance: {
          method: "authored-fixture",
          note: "Members' recorded decisions on accepting the other chamber's changes.",
          sourceEntityIds: scenario.recordedSittingEventId
            ? [scenario.recordedSittingEventId]
            : [],
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
      if (action === null)
        throw new Error(
          "No executive disposition has been supplied for this bill.",
        );
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
                dispositions: recordedDispositions(
                  scenario,
                  jointBody(scenario).members,
                  votePlanKeyForOverride("joint"),
                ),
                presentMembers: jointBody(scenario).members.length,
                electedMembers: jointBody(scenario).members.length,
              },
            ]
          : pack.chamberOrder.map((forumChamberKey) => {
              const body = bodyForChamber(scenario, forumChamberKey);
              return {
                forumKey: forumChamberKey,
                dispositions: recordedDispositions(
                  scenario,
                  body.members,
                  votePlanKeyForOverride(forumChamberKey),
                ),
                presentMembers: body.members.length,
                electedMembers: body.members.length,
              };
            });
      const next = attemptVetoOverride(world, {
        stableKey: key("override"),
        measureId,
        forums,
        rationale: "The legislature reconsidered the vetoed bill.",
        provenance: {
          method: "authored-fixture",
          note: "Members' recorded decisions on the override.",
          sourceEntityIds: scenario.recordedSittingEventId
            ? [scenario.recordedSittingEventId]
            : [],
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
