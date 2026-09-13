/**
 * L ↔ S vote-instruction seam.
 *
 * L records a standing instruction bound to actor, office, chamber, measure
 * and measure version. S owns whether a vote or amendment is legally
 * available and the only writers of those canonical transitions. Call
 * `evaluateOfficeVoteInstruction` before any such write. An armed result is
 * not itself a vote.
 */

import { resolveActiveMemberSeat } from "./legislative-member-seat";
import type { ActiveMemberSeat } from "./legislative-member-seat";
import {
  currentOfficeVoteInstruction,
  currentOfficeWorkflowPreference,
  measureTextVersion,
  type OfficeVoteInstructionRecord,
} from "../simulation";
import type { EntityId, World } from "../simulation";

export type OfficeVoteInstructionRefusalCode =
  | "no-active-seat"
  | "office-mismatch"
  | "chamber-mismatch"
  | "actor-mismatch"
  | "measure-missing"
  | "measure-changed"
  | "no-preference"
  | "mode-forbids-standing-instruction"
  | "instruction-missing";

export type OfficeVoteInstructionEvaluation =
  | {
      readonly kind: "armed";
      readonly instruction: OfficeVoteInstructionRecord;
      readonly seat: ActiveMemberSeat;
    }
  | {
      readonly kind: "refused";
      readonly reason: string;
      readonly code: OfficeVoteInstructionRefusalCode;
    };

export interface EvaluateOfficeVoteInstructionInput {
  readonly actorPersonId: EntityId;
  readonly officeRelationshipId: EntityId;
  readonly chamberKey: string;
  readonly measureId: EntityId;
}

/**
 * Whether a saved instruction may be handed to S for this live authority and
 * this exact bill version. Does not write a vote, amendment, or preference.
 */
export function evaluateOfficeVoteInstruction(
  world: World,
  input: EvaluateOfficeVoteInstructionInput,
): OfficeVoteInstructionEvaluation {
  const membership = resolveActiveMemberSeat(world, input.actorPersonId);
  if (membership.kind !== "seated") {
    return {
      kind: "refused",
      code: "no-active-seat",
      reason:
        "This character holds no live legislative seat, so a saved instruction cannot stand in for a vote.",
    };
  }
  const seat = membership.seat;
  if (seat.relationshipId !== input.officeRelationshipId) {
    return {
      kind: "refused",
      code: "office-mismatch",
      reason:
        "The saved instruction belongs to another office. A past term does not authorize this sitting.",
    };
  }
  if (seat.chamberKey !== input.chamberKey) {
    return {
      kind: "refused",
      code: "chamber-mismatch",
      reason: "The instruction names a chamber this member does not sit in.",
    };
  }
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === input.measureId,
  );
  if (!measure) {
    return {
      kind: "refused",
      code: "measure-missing",
      reason: "That bill is not recorded in this World.",
    };
  }
  const preference = currentOfficeWorkflowPreference(
    world,
    input.actorPersonId,
    seat.relationshipId,
  );
  if (!preference) {
    return {
      kind: "refused",
      code: "no-preference",
      reason:
        "This office has no recorded voting workflow, so nothing executes automatically.",
    };
  }
  if (preference.votingMode === "handle-individually") {
    return {
      kind: "refused",
      code: "mode-forbids-standing-instruction",
      reason:
        "This office handles votes individually. A standing instruction is not a vote.",
    };
  }
  if (preference.votingMode === "review-batch") {
    return {
      kind: "refused",
      code: "mode-forbids-standing-instruction",
      reason:
        "This office reviews votes in a batch. A saved instruction is not executed until that review.",
    };
  }
  const instruction = currentOfficeVoteInstruction(
    world,
    input.actorPersonId,
    seat.relationshipId,
    measure.id,
  );
  if (!instruction) {
    return {
      kind: "refused",
      code: "instruction-missing",
      reason: "No standing instruction is recorded for this bill.",
    };
  }
  if (instruction.personId !== input.actorPersonId) {
    return {
      kind: "refused",
      code: "actor-mismatch",
      reason: "The instruction belongs to another actor.",
    };
  }
  const liveVersion = measureTextVersion(world, measure.id);
  if (instruction.measureTextVersion !== liveVersion) {
    return {
      kind: "refused",
      code: "measure-changed",
      reason:
        "The bill has changed since this instruction was recorded. Decide again on the current text.",
    };
  }
  return { kind: "armed", instruction, seat };
}
