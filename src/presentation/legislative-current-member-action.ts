import {
  availableMeasureSteps,
  currentMeasureProvisions,
  measureActions,
  measurePosition,
  type EntityId,
  type LegislativeVoteRecord,
  type World,
} from "../simulation";
import { canonicalJson } from "../simulation/canonical-json";
import { draftLineageForMeasure } from "../simulation/legislation-draft-lineage";
import {
  applyLegislativeCommand,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import type { RecordedPlayerBallot } from "./legislative-authored-sitting";

export interface CurrentMemberActionTicket {
  readonly actorPersonId: EntityId;
  readonly officeRelationshipId: EntityId;
  readonly memberSeatStableKey: string;
  readonly measureId: EntityId;
  readonly chamberKey: string;
  readonly floorStageKey: string;
  readonly recordedSittingEventId: EntityId;
  readonly playerDisposition: RecordedPlayerBallot;
  /** Complete substantive payload, independent of procedural progress. */
  readonly measureTextVersion: string;
  /** One existing floor question; this ticket cannot advance another one. */
  readonly questionVersion: string;
}

type RefusalCode =
  | "member-authority"
  | "question-unavailable"
  | "recorded-input-missing"
  | "stale-question"
  | "command-refused";

/** Feature-local A/L read: no ballot, authority, admission or time is written. */
export function projectCurrentMemberAction(
  world: World,
  input: {
    readonly actorPersonId: EntityId;
    readonly measureId: EntityId;
    readonly memberSeatStableKey?: string;
  },
):
  | { readonly kind: "available"; readonly ticket: CurrentMemberActionTicket }
  | {
      readonly kind: "refused";
      readonly code: RefusalCode;
      readonly reason: string;
    } {
  const entry = resolveLegislativeAssignmentForMeasure(world, {
    playerPersonId: input.actorPersonId,
    measureId: input.measureId,
    memberSeatStableKey: input.memberSeatStableKey,
  });
  if (entry.kind !== "available")
    return { kind: "refused", code: "member-authority", reason: entry.reason };
  const assignment = entry.assignment;
  const member = resolveActiveMemberSeat(world, input.actorPersonId, {
    relationshipStableKey: assignment.memberSeatStableKey,
  });
  if (member.kind !== "seated")
    return { kind: "refused", code: "member-authority", reason: member.reason };
  const position = measurePosition(world, input.measureId);
  const chamber = assignment.procedure.pack.chambers.find(
    (record) => record.chamberKey === member.seat.chamberKey,
  )!;
  if (
    position.phase !== "on-floor" ||
    position.chamberKey !== member.seat.chamberKey ||
    position.floorStageKey !== chamber.floorStages.at(-1)?.stageKey ||
    !availableMeasureSteps(world, input.measureId).includes("move-floor-vote")
  )
    return {
      kind: "refused",
      code: "question-unavailable",
      reason:
        "This member has no available final-passage question in their own chamber.",
    };
  const source = assignment.procedure;
  if (!source.recordedSittingEventId || !source.recordedPlayerBallot)
    return {
      kind: "refused",
      code: "recorded-input-missing",
      reason:
        "This question needs its existing recorded member ballot and institutional sitting inputs; a workflow preference supplies neither.",
    };
  return {
    kind: "available",
    ticket: {
      actorPersonId: input.actorPersonId,
      officeRelationshipId: member.seat.relationshipId,
      memberSeatStableKey: member.seat.relationshipStableKey,
      measureId: input.measureId,
      chamberKey: member.seat.chamberKey,
      floorStageKey: position.floorStageKey!,
      recordedSittingEventId: source.recordedSittingEventId,
      playerDisposition: source.recordedPlayerBallot,
      measureTextVersion: canonicalJson({
        measure: world.history.legislativeMeasures!.find(
          (record) => record.id === input.measureId,
        ),
        provisions: currentMeasureProvisions(world, input.measureId),
        lineage: draftLineageForMeasure(world, input.measureId),
      }),
      questionVersion: canonicalJson({
        seat: member.seat,
        position,
        lastActionId: measureActions(world, input.measureId).at(-1)?.id ?? null,
      }),
    },
  };
}

/** Explicit one-question execution. A/L opening, reading and preferences never call it. */
export function executeCurrentMemberAction(
  world: World,
  ticket: CurrentMemberActionTicket,
):
  | {
      readonly kind: "recorded";
      readonly world: World;
      readonly vote: LegislativeVoteRecord;
      readonly message: string;
    }
  | {
      readonly kind: "refused";
      readonly world: World;
      readonly code: RefusalCode;
      readonly reason: string;
    } {
  const current = projectCurrentMemberAction(world, ticket);
  if (current.kind === "refused") return { ...current, world };
  if (canonicalJson(current.ticket) !== canonicalJson(ticket))
    return {
      kind: "refused",
      world,
      code: "stale-question",
      reason:
        "The exact actor, office, text, ballot or question changed. Confirm the current question again; nothing was written.",
    };
  const entry = resolveLegislativeAssignmentForMeasure(world, {
    playerPersonId: ticket.actorPersonId,
    measureId: ticket.measureId,
    memberSeatStableKey: ticket.memberSeatStableKey,
  });
  if (entry.kind !== "available")
    return {
      kind: "refused",
      world,
      code: "member-authority",
      reason: entry.reason,
    };
  try {
    const result = applyLegislativeCommand(world, entry.assignment, {
      kind: "take-step",
      step: "move-floor-vote",
    });
    const priorIds = new Set(
      world.history.legislativeVotes?.map((record) => record.id),
    );
    const vote = result.world.history.legislativeVotes?.find(
      (record) =>
        !priorIds.has(record.id) &&
        record.measureId === ticket.measureId &&
        record.purpose === "floor-stage" &&
        record.floorStageKey === ticket.floorStageKey &&
        record.forum.kind === "chamber" &&
        record.forum.chamberKey === ticket.chamberKey,
    );
    if (!vote)
      throw new Error(
        "The existing command did not record this floor question.",
      );
    return {
      kind: "recorded",
      world: result.world,
      vote,
      message: result.message,
    };
  } catch (error) {
    return {
      kind: "refused",
      world,
      code: "command-refused",
      reason:
        error instanceof Error
          ? error.message
          : "The existing command refused this question.",
    };
  }
}
