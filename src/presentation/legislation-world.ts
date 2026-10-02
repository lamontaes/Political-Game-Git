import {
  activeMemberSeats,
  resolveActiveMemberSeat,
} from "./legislative-member-seat";
import { resolvePlayerCapabilities } from "./player-capabilities";
import {
  canonicalStateExecutiveWaitAvailable,
  legislativeProcedureRefusal,
} from "./legislative-procedure-availability";
import {
  legislativePackForJurisdiction,
  legislativeWorkKey,
} from "../simulation/legislative-institutions";
import {
  regularSessionActionRefusal,
  RegularSessionUnavailableError,
} from "./legislative-session-window";
import { addDays } from "../simulation/dates";
import {
  AUTHORED_MEASURE_NOTICE,
  authoredScenarioSeatCount,
  legislativeBlueprint,
  legislativeScenarioKeysForPlace,
  measurePosition,
  rulePackForMeasure,
  personName,
  seatBodyForPack,
  simulationMinutesBetween,
  simulationMomentAtLocalTime,
} from "../simulation";
import {
  legislativeProcedureForPack,
  legislativeRulePackForWorld,
} from "../simulation/legislative-procedure-world";
import type {
  EntityId,
  LegislativeBlueprint,
  LegislativeMeasureRecord,
  LegislativeProcedureContext,
  MeasureStepKey,
  SeatedBody,
  World,
} from "../simulation";
import { applyLegislativeStep } from "./legislation-session";
import { seatedChamberForPack } from "../simulation/governing/chamber-votes";
import { governorOfficeForJurisdiction } from "../simulation/governing/state-governing";
import {
  LEGISLATIVE_INSTITUTION_STEP,
  measureSessionIsClosed,
  measureStepOwner,
  scheduleInstitutionStep,
} from "../simulation/governing/legislative-clock";
import { futureDueItemStateAt } from "../simulation/future-transitions";
import {
  CONGRESS_SITTING_TRANSITION,
  isCongressMeasure,
} from "../simulation/governing/congress-chambers";
import { ORDINARY_DAY_START_MINUTE, passOrdinaryDays } from "./ordinary-life";
import { describeRoutineOutcome } from "./routine-outcome";
import {
  readRecordedLegislativeSitting,
  RECORDED_SITTING_NOTICE,
} from "./legislative-authored-sitting";

/**
 * Legislative work, inside the player's own save.
 *
 * The workspace used to build a second world of its own and keep it in its own
 * corner of local storage. That meant a bill the player moved through the House
 * was not in their save at all: two different lives in the same state shared
 * one bill's history, and loading a game showed a bill that had nothing to do
 * with it.
 *
 * There is one world. A measure is introduced into it, the same rule packs and
 * state machine from the accepted legislative core act on it, and the result is
 * the player's history — saved, reloaded and continued like everything else.
 * Nothing in this module owns storage, and nothing in it can switch
 * jurisdictions: which legislature a character works in is a fact about their
 * job, not a control on a screen.
 */

/** A bill this character is actually working on, in this world. */
export interface LegislativeAssignment {
  readonly scenarioKey: string;
  readonly label: string;
  readonly measureNotice: typeof AUTHORED_MEASURE_NOTICE;
  /** The measure as it exists in the player's world, not in a scenario's. */
  readonly measureId: EntityId;
  readonly sponsorPersonId: EntityId;
  /** Everything a step needs, resolved against this world. */
  readonly procedure: LegislativeProcedureContext;
  readonly playerPersonId?: EntityId;
  readonly memberSeatStableKey?: string;
  readonly recordedSittingNotice?: string;
}

export interface OpenLegislativeWorkInput {
  readonly scenarioKey: string;
  readonly playerPersonId: EntityId;
  readonly memberSeatStableKey?: string;
  readonly jurisdictionId: EntityId;
}

/** The bills written for the legislature this character works in. */
export function legislativeWorkAvailableIn(
  jurisdictionId: EntityId,
): readonly string[] {
  const pack = legislativePackForJurisdiction(jurisdictionId);
  return pack
    ? [
        legislativeWorkKey(pack),
        ...legislativeScenarioKeysForPlace(jurisdictionId).filter(
          (key) => key !== legislativeWorkKey(pack),
        ),
      ]
    : [];
}

/** Reusable, read-only ordinary-measure seam; no second measure or law writer. */
export function resolveLegislativeAssignmentForMeasure(
  world: World,
  input: {
    readonly measureId: EntityId;
    readonly playerPersonId: EntityId;
    readonly memberSeatStableKey?: string;
  },
):
  | { readonly kind: "available"; readonly assignment: LegislativeAssignment }
  | { readonly kind: "unavailable"; readonly reason: string } {
  const measure = world.history.legislativeMeasures?.find(
    (entry) => entry.id === input.measureId,
  );
  if (!measure)
    return {
      kind: "unavailable",
      reason: "This measure is not recorded in the current world.",
    };
  const membership = resolveActiveMemberSeat(world, input.playerPersonId, {
    governingJurisdictionId: measure.jurisdictionId,
    legislativeRulePackId: measure.rulePackId,
    ...(input.memberSeatStableKey !== undefined
      ? { relationshipStableKey: input.memberSeatStableKey }
      : {}),
  });
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerPersonId ||
    membership.kind !== "seated"
  )
    return {
      kind: "unavailable",
      reason:
        membership.kind !== "seated"
          ? membership.reason
          : "This character has no reconciled current member seat for this measure.",
    };
  const seat = membership.seat;
  if (
    seat.governingJurisdictionId !== measure.jurisdictionId ||
    seat.legislativeRulePackId !== measure.rulePackId
  )
    return {
      kind: "unavailable",
      reason:
        "This measure belongs to a different institution from the current seat.",
    };
  const blueprint = legislativeBlueprint(`institution:${measure.rulePackId}`);
  const recorded = readRecordedLegislativeSitting(world, {
    ...input,
    memberSeatStableKey: seat.relationshipStableKey,
  });
  return {
    kind: "available",
    assignment: {
      ...assignmentFor(
        world,
        blueprint,
        measure.id,
        measure.sponsorPersonId ?? input.playerPersonId,
        input.playerPersonId,
      ),
      playerPersonId: input.playerPersonId,
      memberSeatStableKey: seat.relationshipStableKey,
      ...(recorded
        ? {
            procedure: recorded,
            recordedSittingNotice: RECORDED_SITTING_NOTICE,
          }
        : {}),
    },
  };
}

/** Recover saved authored content without choosing or filing another measure. */
export function openingMeasureContentKey(
  _world: World,
  input: {
    readonly scenarioKey: string;
    readonly jurisdictionId: EntityId;
    readonly filed?: LegislativeMeasureRecord | null;
  },
): string {
  const filed = input.filed;
  if (!filed) return input.scenarioKey;
  return (
    legislativeScenarioKeysForPlace(input.jurisdictionId).find(
      (key) => legislativeBlueprint(key).shortTitle === filed.shortTitle,
    ) ?? input.scenarioKey
  );
}

/**
 * Opens a recorded bill in the player's own world without creating facts.
 *
 * Called again for a world that already has the measure, it returns the same
 * assignment rather than filing a second copy — which is what makes save,
 * reload and carry on work: the bill is found where it was left, at whatever
 * stage it had reached.
 */
export function openLegislativeWork(
  world: World,
  input: OpenLegislativeWorkInput,
): { readonly world: World; readonly assignment: LegislativeAssignment } {
  const blueprint = legislativeBlueprint(input.scenarioKey);
  const activePack = legislativeRulePackForWorld(world, blueprint.pack.packId);
  const institutional = input.scenarioKey.startsWith("institution:");
  const membership = resolveActiveMemberSeat(world, input.playerPersonId, {
    governingJurisdictionId: input.jurisdictionId,
    legislativeRulePackId: blueprint.pack.packId,
    ...(input.memberSeatStableKey !== undefined
      ? { relationshipStableKey: input.memberSeatStableKey }
      : {}),
  });
  const seat = membership.kind === "seated" ? membership.seat : null;
  if (
    !seat &&
    (input.memberSeatStableKey !== undefined ||
      activeMemberSeats(world, input.playerPersonId).length > 0)
  )
    throw new RegularSessionUnavailableError(
      membership.kind !== "seated"
        ? membership.reason
        : "No supported seat matches this work.",
    );
  if (institutional) {
    const capabilities = resolvePlayerCapabilities(world);
    if (
      capabilities.personId !== input.playerPersonId ||
      (!seat &&
        (capabilities.legislativeJurisdictionId !== input.jurisdictionId ||
          capabilities.legislativeScenarioKey !== input.scenarioKey))
    )
      throw new RegularSessionUnavailableError(
        "This character does not currently work in the selected legislature.",
      );
    if (!seat)
      throw new RegularSessionUnavailableError(
        "Taking up a new introduced bill requires an actual supported member seat. Staff may inspect and prepare drafts; an office job does not grant sponsorship.",
      );
    if (
      seat.legislativeRulePackId !== blueprint.pack.packId ||
      seat.governingJurisdictionId !== input.jurisdictionId
    )
      throw new RegularSessionUnavailableError(
        "The current member seat belongs to a different institution.",
      );
  }
  if (blueprint.context.jurisdiction.id !== input.jurisdictionId) {
    throw new Error(
      `The ${blueprint.label} scenario does not belong to this character's legislature.`,
    );
  }
  if (!world.jurisdictions[input.jurisdictionId]) {
    throw new Error(
      "This world has no record of the jurisdiction the job sits in.",
    );
  }

  // Older office assignments keep their recorded identity, including completed
  // measures. Opening never replaces a saved bill or rewrites its history.
  const baseKey = `legislative-work:${input.scenarioKey}:measure`;
  const saved = (world.history.legislativeMeasures ?? [])
    .filter(
      (record) =>
        record.jurisdictionId === input.jurisdictionId &&
        record.rulePackId === activePack.packId &&
        (record.stableKey === baseKey ||
          record.stableKey.startsWith(`${baseKey}:`)),
    )
    .at(-1);
  if (saved) {
    if (!saved.sponsorPersonId || !world.people[saved.sponsorPersonId])
      throw new RegularSessionUnavailableError(
        "The saved bill has no recorded sponsor in this world.",
      );
    const content = institutional
      ? blueprint
      : legislativeBlueprint(
          openingMeasureContentKey(world, { ...input, filed: saved }),
        );
    return {
      world,
      assignment: {
        ...assignmentFor(
          world,
          content,
          saved.id,
          saved.sponsorPersonId,
          input.playerPersonId,
        ),
        ...(institutional && seat
          ? {
              playerPersonId: input.playerPersonId,
              memberSeatStableKey: seat.relationshipStableKey,
            }
          : {}),
      },
    };
  }

  const sessionRefusal = regularSessionActionRefusal(
    activePack,
    world.currentDate,
  );
  if (sessionRefusal) throw new RegularSessionUnavailableError(sessionRefusal);

  // Filing order is the recorded docket order. A pending bill is eligible only
  // in this institution, with its sponsor still seated on the origin floor.
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) =>
      record.jurisdictionId === input.jurisdictionId &&
      record.rulePackId === activePack.packId &&
      !measurePosition(world, record.id).terminal &&
      !measureSessionIsClosed(world, record.id).closed &&
      seatedOfficeMember(world, record) !== null,
  );
  if (!measure)
    throw new RegularSessionUnavailableError(
      "No pending measure with a currently seated sponsor is recorded for this legislature. File a supported draft or wait for a member to introduce a measure.",
    );
  // Ordinary recorded measures use the institution's procedure, not an authored
  // bill's predetermined votes or executive disposition.
  if (seat) {
    const resolved = resolveLegislativeAssignmentForMeasure(world, {
      measureId: measure.id,
      playerPersonId: input.playerPersonId,
      memberSeatStableKey: seat.relationshipStableKey,
    });
    if (resolved.kind === "unavailable")
      throw new RegularSessionUnavailableError(resolved.reason);
    return { world, assignment: resolved.assignment };
  }
  return {
    world,
    assignment: assignmentFor(
      world,
      legislativeBlueprint(`institution:${measure.rulePackId}`),
      measure.id,
      measure.sponsorPersonId!,
      input.playerPersonId,
    ),
  };
}

/**
 * The only way this surface changes the world.
 *
 * A typed command rather than a free hand on the world: the workspace says
 * which step the player took, and everything else — how the seated members
 * vote, what the governor does — stays where the accepted legislative core
 * already puts it.
 */
export type LegislativeCommand = {
  /**
   * `await-institution`: the step belongs to the other chamber, a clerk or
   * the governor; the office waits while the clock runs until they act.
   */
  readonly kind:
    "take-step" | "await-institutional-record" | "await-institution";
  readonly step: MeasureStepKey;
};

const WAIT_STEPS: readonly MeasureStepKey[] = [
  "await-executive-decision",
  "await-next-legislative-day",
];

/**
 * Whether the next step belongs to somebody other than this office: the
 * other chamber, a clerk, or the governor. Recorded-sitting routes keep their
 * own wait rule.
 */
export function institutionOwnsStep(
  world: World,
  assignment: LegislativeAssignment,
  step: MeasureStepKey,
): boolean {
  if (assignment.procedure.recordedSittingEventId) return false;
  // A bill on a seated governor's desk is the governor's to decide, on the
  // world's clock, the same desk every other bill reaches; the office waits.
  if (step === "await-executive-decision")
    return (
      governorOfficeForJurisdiction(
        world,
        assignment.procedure.pack.jurisdictionKey,
      ) !== null
    );
  if (WAIT_STEPS.includes(step)) return false;
  const measure = world.history.legislativeMeasures?.find(
    (entry) => entry.id === assignment.measureId,
  );
  if (!measure) return false;
  const seat = assignment.playerPersonId
    ? resolveActiveMemberSeat(world, assignment.playerPersonId, {
        relationshipStableKey: assignment.memberSeatStableKey,
      })
    : null;
  const officeChamber =
    seat?.kind === "seated" ? seat.seat.chamberKey : measure.originChamberKey;
  const owner = measureStepOwner(world, measure.id, officeChamber);
  return owner !== null && owner !== "sponsor-office";
}

/** Runs the clock until the institution's next scheduled act on the bill. */
function awaitInstitution(
  world: World,
  assignment: LegislativeAssignment,
): LegislativeCommandResult {
  const scheduled = scheduleInstitutionStep(world, assignment.measureId);
  const measure = scheduled.history.legislativeMeasures?.find(
    (entry) => entry.id === assignment.measureId,
  );
  const congress = measure !== undefined && isCongressMeasure(measure);
  const pending = scheduled.history.futureDueItems
    .filter(
      (item) =>
        (congress
          ? item.transitionKey === CONGRESS_SITTING_TRANSITION &&
            item.jurisdictionId === measure?.jurisdictionId
          : item.transitionKey === LEGISLATIVE_INSTITUTION_STEP &&
            item.entityIds.includes(assignment.measureId)) &&
        futureDueItemStateAt(scheduled, item.id, {
          asOfDate: scheduled.currentDate,
          historySequenceExclusive: scheduled.history.nextSequence,
        })?.status === "scheduled",
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  if (!pending)
    throw new RegularSessionUnavailableError(
      "Nothing is scheduled for the institution on this bill; it is not moving this session.",
    );
  const before = measurePosition(scheduled, assignment.measureId);
  const days = Math.max(
    1,
    Math.round(
      (Date.parse(pending.dueAt) - Date.parse(scheduled.currentDate)) /
        86_400_000,
    ),
  );
  const next = passOrdinaryDays(scheduled, days);
  // Use the same target and outcome reader as Day/Week. A protected personal
  // commitment may stop this wait early, including without advancing at all.
  const target = simulationMomentAtLocalTime({
    date: addDays(scheduled.currentDate, days),
    minuteOfDay: ORDINARY_DAY_START_MINUTE,
    timeZone: scheduled.currentMoment.timeZone,
    preferredUtcOffsetMinutes: scheduled.currentMoment.utcOffsetMinutes,
  });
  const requestedMinutes = simulationMinutesBetween(
    scheduled.currentMoment,
    target,
  );
  const interrupted =
    simulationMinutesBetween(scheduled.currentMoment, next.currentMoment) <
    requestedMinutes;
  const after = measurePosition(next, assignment.measureId);
  const moved =
    after.phase !== before.phase ||
    after.chamberKey !== before.chamberKey ||
    after.floorStageKey !== before.floorStageKey ||
    after.hearingHeld !== before.hearingHeld;
  return {
    world: next,
    message:
      interrupted && next.control.kind === "person"
        ? `${describeRoutineOutcome(scheduled, next, next.control.personId, requestedMinutes)}\n${
            moved
              ? "The institution acted on the bill."
              : "The institution has not acted on the bill yet."
          }`
        : moved
          ? "Time passed while the institution acted on the bill."
          : "Time passed. The institution has not acted on the bill yet.",
  };
}
const RECORDED_CHAMBER_STEPS: readonly MeasureStepKey[] = [
  "request-referral",
  "request-committee-hearing",
  "move-committee-report",
  "request-calendar-placement",
  "offer-amendment",
  "move-floor-vote",
  "await-next-legislative-day",
  "move-concurrence",
];
export function recordedInstitutionalStepRequiresWait(
  world: World,
  assignment: LegislativeAssignment,
  step: MeasureStepKey,
): boolean {
  if (
    !assignment.procedure.recordedSittingEventId ||
    !assignment.playerPersonId ||
    !RECORDED_CHAMBER_STEPS.includes(step)
  )
    return false;
  const member = resolveActiveMemberSeat(world, assignment.playerPersonId, {
    relationshipStableKey: assignment.memberSeatStableKey,
  });
  const chamber = measurePosition(world, assignment.measureId).chamberKey;
  return (
    member.kind === "seated" &&
    chamber !== null &&
    chamber !== member.seat.chamberKey
  );
}

export interface LegislativeCommandResult {
  readonly world: World;
  readonly message: string;
}

export function applyLegislativeCommand(
  world: World,
  assignment: LegislativeAssignment,
  command: LegislativeCommand,
): LegislativeCommandResult {
  if (
    !["take-step", "await-institutional-record", "await-institution"].includes(
      command.kind,
    )
  ) {
    throw new Error("That is not something this surface can do.");
  }
  if (
    command.step === "offer-amendment" &&
    !assignment.procedure.recordedSittingEventId &&
    legislativeProcedureForPack(world, assignment.procedure.pack.packId)
  ) {
    throw new RegularSessionUnavailableError(
      "No recorded amendment vote is available for this bill.",
    );
  }
  if (command.kind === "await-institution") {
    if (!institutionOwnsStep(world, assignment, command.step))
      throw new RegularSessionUnavailableError(
        "This step is the office's own to take.",
      );
    return awaitInstitution(world, assignment);
  }
  if (
    command.kind === "take-step" &&
    command.step !== "await-executive-decision"
  ) {
    const session = measureSessionIsClosed(world, assignment.measureId);
    if (session.closed) {
      const pack = rulePackForMeasure(world, assignment.measureId);
      throw new RegularSessionUnavailableError(
        legislativeProcedureForPack(world, pack.packId)
          ? (regularSessionActionRefusal(pack, world.currentDate) ??
              `This bill's prior regular session ended on ${session.closedOn}.`)
          : `The session ended on ${session.closedOn}. Whether this bill carries over is not established, so it does not move again; the office can file a new bill next session.`,
      );
    }
  }
  if (
    command.kind === "take-step" &&
    institutionOwnsStep(world, assignment, command.step)
  )
    throw new RegularSessionUnavailableError(
      "That step belongs to the other chamber, the clerks or the governor. This office can only wait for them.",
    );
  if (assignment.playerPersonId) {
    const membership = resolveActiveMemberSeat(
      world,
      assignment.playerPersonId,
      { relationshipStableKey: assignment.memberSeatStableKey },
    );
    if (
      world.control.kind !== "person" ||
      world.control.personId !== assignment.playerPersonId ||
      membership.kind !== "seated" ||
      membership.seat.relationshipStableKey !==
        assignment.memberSeatStableKey ||
      membership.seat.legislativeRulePackId !== assignment.procedure.pack.packId
    )
      throw new RegularSessionUnavailableError(
        "This assignment no longer matches the character's current member seat.",
      );
    const measure = world.history.legislativeMeasures?.find(
      (entry) => entry.id === assignment.measureId,
    );
    if (
      !measure ||
      measure.jurisdictionId !== membership.seat.governingJurisdictionId
    )
      throw new RegularSessionUnavailableError(
        "This measure does not belong to the character's current institution.",
      );
    const otherChamber =
      measurePosition(world, measure.id).chamberKey !==
      membership.seat.chamberKey;
    if (
      command.kind === "await-institutional-record" &&
      (!otherChamber ||
        !assignment.procedure.recordedSittingEventId ||
        !RECORDED_CHAMBER_STEPS.includes(command.step))
    )
      throw new RegularSessionUnavailableError(
        "No other-chamber recorded sitting supports this wait action.",
      );
    if (
      otherChamber &&
      assignment.procedure.recordedSittingEventId &&
      RECORDED_CHAMBER_STEPS.includes(command.step) &&
      command.kind === "take-step"
    )
      throw new RegularSessionUnavailableError(
        "The other chamber acts through its recorded sitting; this member may wait, not act in that chamber.",
      );
    if (
      ["move-floor-vote", "offer-amendment", "move-concurrence"].includes(
        command.step,
      ) &&
      otherChamber &&
      command.kind !== "await-institutional-record"
    )
      throw new RegularSessionUnavailableError(
        "The current seat does not grant member authority in the chamber handling this question.",
      );
  }
  if (
    command.kind === "await-institutional-record" &&
    !assignment.playerPersonId
  )
    throw new RegularSessionUnavailableError(
      "A recorded sitting wait requires the actual member's assignment.",
    );
  if (assignment.procedure.recordedSittingEventId) {
    const recorded = assignment.playerPersonId
      ? readRecordedLegislativeSitting(world, {
          measureId: assignment.measureId,
          playerPersonId: assignment.playerPersonId,
          memberSeatStableKey: assignment.memberSeatStableKey,
        })
      : null;
    if (
      !recorded ||
      recorded.recordedSittingEventId !==
        assignment.procedure.recordedSittingEventId
    )
      throw new RegularSessionUnavailableError(
        "The recorded sitting no longer matches this member and bill text.",
      );
    assignment = { ...assignment, procedure: recorded };
  }
  const procedureRefusal = legislativeProcedureRefusal(
    world,
    assignment.procedure,
    command.step,
  );
  if (procedureRefusal)
    throw new RegularSessionUnavailableError(procedureRefusal);
  if (
    command.kind === "take-step" &&
    command.step === "await-executive-decision" &&
    canonicalStateExecutiveWaitAvailable(world, assignment.procedure)
  )
    return awaitInstitution(world, assignment);
  const regularSessionSteps: readonly MeasureStepKey[] = [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
    "offer-amendment",
    "await-next-legislative-day",
    "move-floor-vote",
    "transmit-to-second-chamber",
    "move-concurrence",
    "move-veto-override",
  ];
  if (regularSessionSteps.includes(command.step)) {
    const actionDate =
      command.step === "request-committee-hearing"
        ? addDays(world.currentDate, 7)
        : command.step === "await-next-legislative-day"
          ? (measurePosition(world, assignment.measureId)
              .earliestNextFloorDate ?? addDays(world.currentDate, 1))
          : world.currentDate;
    const refusal = regularSessionActionRefusal(
      assignment.procedure.pack,
      actionDate,
    );
    if (refusal) throw new RegularSessionUnavailableError(refusal);
  }
  const result = applyLegislativeStep(
    assignment.procedure,
    world,
    command.step,
  );
  // Whatever the institution does next is now on its calendar.
  const next = assignment.procedure.recordedSittingEventId
    ? result.world
    : scheduleInstitutionStep(result.world, assignment.measureId);
  return { world: next, message: result.message };
}

function assignmentFor(
  world: World,
  blueprint: LegislativeBlueprint,
  measureId: EntityId,
  sponsorPersonId: EntityId,
  playerPersonId: EntityId,
): LegislativeAssignment {
  const activeBlueprint = {
    ...blueprint,
    pack: rulePackForMeasure(world, measureId),
  };
  const seated = seatedBodies(world, activeBlueprint);
  return {
    scenarioKey: blueprint.scenarioKey,
    label: blueprint.label,
    measureNotice: AUTHORED_MEASURE_NOTICE,
    measureId,
    sponsorPersonId,
    procedure: {
      pack: activeBlueprint.pack,
      measureId,
      bodies:
        seated ??
        seatBodies(
          world,
          activeBlueprint,
          sponsorPersonId,
          measureId,
          playerPersonId,
        ),
      ...(seated ? { memberDecisions: { playerPersonId } } : {}),
      committeeMemberCount: blueprint.scenarioKey.startsWith("institution:")
        ? null
        : (activeBlueprint.pack.chambers[0]?.committees[0]?.appointedMembers ??
          null),
      votePlan: blueprint.votePlan,
      governorAction: blueprint.governorAction,
      governorRationale: blueprint.governorRationale,
    },
  };
}

/**
 * The state's own chambers, where its legislature has been seated with real
 * people; null where it has not, so an older save keeps its authored bodies.
 */
function seatedBodies(
  world: World,
  blueprint: LegislativeBlueprint,
): readonly SeatedBody[] | null {
  const bodies = blueprint.pack.chambers.map(
    (chamber) =>
      seatedChamberForPack(
        world,
        blueprint.pack.packId,
        chamber.chamberKey,
        chamber.name,
      )?.body ?? null,
  );
  return bodies.every((body) => body !== null && body.members.length > 0)
    ? (bodies as SeatedBody[])
    : null;
}

/** Read the sponsor of record against the actual current origin chamber. */
function seatedOfficeMember(
  world: World,
  measure: LegislativeMeasureRecord,
): EntityId | null {
  if (
    !measure.originChamberKey ||
    !measure.sponsorPersonId ||
    !world.people[measure.sponsorPersonId]
  )
    return null;
  const membership = resolveActiveMemberSeat(world, measure.sponsorPersonId, {
    governingJurisdictionId: measure.jurisdictionId,
    legislativeRulePackId: measure.rulePackId,
    chamberKey: measure.originChamberKey,
  });
  if (membership.kind === "seated") return measure.sponsorPersonId;
  const pack = rulePackForMeasure(world, measure.id);
  const origin = pack.chambers.find(
    (chamber) => chamber.chamberKey === measure.originChamberKey,
  );
  if (!origin) return null;
  const chamber = seatedChamberForPack(
    world,
    pack.packId,
    origin.chamberKey,
    origin.name,
  );
  return chamber?.body.members.some(
    (member) => member.personId === measure.sponsorPersonId,
  )
    ? measure.sponsorPersonId
    : null;
}

/**
 * Seats the chambers against this world.
 *
 * Named people are only those this world actually contains: the live member
 * when they sit in that chamber, and the filing sponsor on the origin floor.
 * The remaining seats stay authored. A vote writer still refuses a disposition
 * naming somebody the world does not contain.
 */
function seatBodies(
  world: World,
  blueprint: LegislativeBlueprint,
  sponsorPersonId: EntityId,
  measureId: EntityId,
  playerPersonId: EntityId,
): readonly SeatedBody[] {
  // A legal chamber size is not a current seated/appointed membership snapshot.
  // Institutional assignments receive no borrowed story roster. A caller with
  // recorded sitting inputs can supply them at the existing procedure boundary.
  if (blueprint.scenarioKey.startsWith("institution:")) return [];
  const originChamber =
    world.history.legislativeMeasures?.find(
      (measure) => measure.id === measureId,
    )?.originChamberKey ?? blueprint.pack.chamberOrder[0];
  return blueprint.pack.chambers.map((chamber) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      authoredScenarioSeatCount(blueprint.pack, chamber.chamberKey),
      linkedPeopleForChamber(world, {
        chamberKey: chamber.chamberKey,
        originChamberKey: originChamber,
        sponsorPersonId,
        playerPersonId,
      }),
      blueprint.nonpartisan,
    ),
  );
}

function linkedPeopleForChamber(
  world: World,
  input: {
    readonly chamberKey: string;
    readonly originChamberKey: string | undefined;
    readonly sponsorPersonId: EntityId;
    readonly playerPersonId: EntityId;
  },
): readonly { readonly personId: EntityId; readonly name: string }[] {
  const linked: { personId: EntityId; name: string }[] = [];
  const seen = new Set<EntityId>();
  const push = (personId: EntityId) => {
    if (seen.has(personId)) return;
    const person = world.people[personId];
    if (!person) return;
    seen.add(personId);
    linked.push({ personId: person.id, name: personName(person) });
  };
  const membership = resolveActiveMemberSeat(world, input.playerPersonId);
  if (
    membership.kind === "seated" &&
    membership.seat.chamberKey === input.chamberKey
  ) {
    push(input.playerPersonId);
  }
  if (input.chamberKey === input.originChamberKey) {
    push(input.sponsorPersonId);
  }
  return linked;
}
