import {
  activeMemberSeats,
  resolveActiveMemberSeat,
} from "./legislative-member-seat";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { legislativeProcedureRefusal } from "./legislative-procedure-availability";
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
  applyCharacterHistoryPlan,
  authoredScenarioSeatCount,
  characterHistoryContextPersonId,
  createStableId,
  drawCanonicalName,
  introduceMeasure,
  legislativeBlueprint,
  legislativeScenarioKeysForPlace,
  makeIsoDate,
  measurePosition,
  personName,
  seatBodyForPack,
  SeededRng,
} from "../simulation";
import type {
  EntityId,
  IsoDate,
  LegislativeBlueprint,
  LegislativeProcedureContext,
  MeasureStepKey,
  SeatedBody,
  World,
} from "../simulation";
import { applyLegislativeStep } from "./legislation-session";
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

/**
 * Puts a bill in front of the player, in their own world.
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
      `The ${blueprint.designation} scenario does not belong to this character's legislature.`,
    );
  }
  if (!world.jurisdictions[input.jurisdictionId]) {
    throw new Error(
      "This world has no record of the jurisdiction the job sits in.",
    );
  }

  const measureStableKey = `legislative-work:${input.scenarioKey}:measure`;
  const existing = (world.history.legislativeMeasures ?? []).find(
    (record) => record.stableKey === measureStableKey,
  );

  // The member the office serves. A staffer does not sponsor bills, so the
  // sponsor is a legislator this world actually contains rather than the
  // player with a title they do not hold.
  const sponsorKey = `legislative-work:${input.scenarioKey}:member`;
  const sponsorPersonId = institutional
    ? input.playerPersonId
    : characterHistoryContextPersonId(world, sponsorKey);

  if (existing) {
    return {
      world,
      assignment: {
        ...assignmentFor(
          world,
          blueprint,
          existing.id,
          existing.sponsorPersonId ?? sponsorPersonId,
          input.playerPersonId,
        ),
        ...(institutional
          ? {
              playerPersonId: input.playerPersonId,
              memberSeatStableKey: seat!.relationshipStableKey,
            }
          : {}),
      },
    };
  }

  const sessionRefusal = regularSessionActionRefusal(
    blueprint.pack,
    world.currentDate,
  );
  if (sessionRefusal) throw new RegularSessionUnavailableError(sessionRefusal);

  const rng = new SeededRng(world.seed).fork(
    `legislative-member:${input.scenarioKey}`,
  );
  const name = drawCanonicalName(rng);
  let next = institutional
    ? world
    : applyCharacterHistoryPlan(world, {
        stableKey: sponsorKey,
        mode: "quick-generated",
        personId: input.playerPersonId,
        transitions: [
          {
            kind: "context-person",
            input: {
              stableKey: sponsorKey,
              givenName: name.givenName,
              familyName: name.familyName,
              birthDate: memberBirthDate(world.currentDate),
              homeJurisdictionId: input.jurisdictionId,
            },
          },
        ],
      }).world;

  next = introduceMeasure(next, {
    stableKey: measureStableKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: blueprint.pack.packId,
    designation: blueprint.designation,
    shortTitle: blueprint.shortTitle,
    summary: blueprint.summary,
    origin: "member-introduction",
    subjectClass: blueprint.subjectClass,
    sponsorPersonId,
    ...(institutional ? { originChamberKey: seat!.chamberKey } : {}),
  });

  const measureId = createStableId(
    "legislative-measure",
    `${next.id}:${input.jurisdictionId}:${measureStableKey}`,
  );
  return {
    world: next,
    assignment: {
      ...assignmentFor(
        next,
        blueprint,
        measureId,
        sponsorPersonId,
        input.playerPersonId,
      ),
      ...(institutional
        ? {
            playerPersonId: input.playerPersonId,
            memberSeatStableKey: seat!.relationshipStableKey,
          }
        : {}),
    },
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
  readonly kind: "take-step" | "await-institutional-record";
  readonly step: MeasureStepKey;
};
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
  if (!["take-step", "await-institutional-record"].includes(command.kind)) {
    throw new Error("That is not something this surface can do.");
  }
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
  return { world: result.world, message: result.message };
}

function assignmentFor(
  world: World,
  blueprint: LegislativeBlueprint,
  measureId: EntityId,
  sponsorPersonId: EntityId,
  playerPersonId: EntityId,
): LegislativeAssignment {
  return {
    scenarioKey: blueprint.scenarioKey,
    label: blueprint.label,
    measureNotice: AUTHORED_MEASURE_NOTICE,
    measureId,
    sponsorPersonId,
    procedure: {
      pack: blueprint.pack,
      measureId,
      bodies: seatBodies(
        world,
        blueprint,
        sponsorPersonId,
        measureId,
        playerPersonId,
      ),
      committeeMemberCount: blueprint.scenarioKey.startsWith("institution:")
        ? null
        : (blueprint.pack.chambers[0]?.committees[0]?.appointedMembers ?? null),
      votePlan: blueprint.votePlan,
      governorAction: blueprint.governorAction,
      governorRationale: blueprint.governorRationale,
    },
  };
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

/** An adult old enough to be seated. No other claim is made about them. */
function memberBirthDate(currentDate: IsoDate): IsoDate {
  return makeIsoDate(
    `${Number(currentDate.slice(0, 4)) - 47}${currentDate.slice(4)}`,
  );
}
