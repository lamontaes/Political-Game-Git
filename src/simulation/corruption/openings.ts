import { queryPersonnelProtections } from "../civil-personnel";
import type { PersonnelClassContext } from "../civil-personnel-contract";
import { recordMisconductAct } from "../press/matters";
import { wasPersonalAppointment } from "../patronage/appointments";
import { evaluateDecision } from "../decisions";
import { currentHistoricalCutoff } from "../queries";
import type {
  DecisionEvaluation,
  DecisionConsideration,
  DecisionOption,
  EntityId,
  IsoDate,
  World,
} from "../types";

/**
 * The program-purchase writer belongs to Session 20. A contract opening can
 * only be recorded after that writer returns a completed, named purchase with
 * its resource-flow ID; estimates and forecasts never create an act.
 */
export interface RecordedContractPurchase {
  readonly status: "completed";
  readonly resourceFlowId: EntityId;
  readonly programKey: string;
  readonly businessId: EntityId;
  readonly awardingOfficialIds: readonly EntityId[];
  readonly handledByPersonIds: readonly EntityId[];
  readonly vendorParticipantPersonIds: readonly EntityId[];
  readonly jurisdictionId: EntityId;
  readonly occurredAt: IsoDate;
}

/** Subset accepted by Session 25's shared writer for an M8 act. */
export interface ContractSteeringActInput {
  readonly stableKey: string;
  readonly family: "M8";
  readonly actorPersonIds: readonly EntityId[];
  readonly participantPersonIds: readonly EntityId[];
  readonly relatedEntityIds: readonly EntityId[];
  readonly existingResourceFlowIds: readonly EntityId[];
  readonly flows: readonly [];
  readonly artifacts: readonly [
    {
      readonly stableKey: string;
      readonly evidenceKind: "record:contract-award";
      readonly createdAt: IsoDate;
      readonly recordedAt: IsoDate;
      readonly access: "public";
      readonly description: string;
    },
  ];
  readonly occurredAt: IsoDate;
  readonly jurisdictionId: EntityId;
  readonly summary: string;
  readonly choice: string;
}

export function contractPurchaseCanOpenMisconduct(
  purchase: RecordedContractPurchase | null,
): purchase is RecordedContractPurchase {
  return Boolean(
    purchase &&
    purchase.status === "completed" &&
    purchase.resourceFlowId &&
    purchase.programKey &&
    purchase.businessId &&
    purchase.awardingOfficialIds.length > 0 &&
    purchase.vendorParticipantPersonIds.length > 0,
  );
}

/** Build the shared-writer input only after a selected steering choice and a
 * canonical completed purchase. The existing resource flow is referenced from
 * the event; it is never written a second time here. */
export function contractSteeringActInput(input: {
  readonly stableKey: string;
  readonly purchase: RecordedContractPurchase | null;
  readonly decision: DecisionEvaluation;
  readonly steeringOptionKey: string;
}): ContractSteeringActInput | null {
  const purchase = input.purchase;
  if (
    !contractPurchaseCanOpenMisconduct(purchase) ||
    input.decision.outcomeKind !== "selected" ||
    input.decision.selectedOptionKey !== input.steeringOptionKey
  )
    return null;
  const actors = [...new Set(purchase.awardingOfficialIds)].sort();
  const participants = [
    ...new Set([
      ...actors,
      ...purchase.handledByPersonIds,
      ...purchase.vendorParticipantPersonIds,
    ]),
  ].sort();
  return {
    stableKey: input.stableKey,
    family: "M8",
    actorPersonIds: actors,
    participantPersonIds: participants,
    relatedEntityIds: [purchase.resourceFlowId, purchase.businessId],
    existingResourceFlowIds: [purchase.resourceFlowId],
    flows: [],
    artifacts: [
      {
        stableKey: `${input.stableKey}:contract-award`,
        evidenceKind: "record:contract-award",
        createdAt: purchase.occurredAt,
        recordedAt: purchase.occurredAt,
        access: "public",
        description: `Award of ${purchase.programKey} work to a named town business.`,
      },
    ],
    occurredAt: purchase.occurredAt,
    jurisdictionId: purchase.jurisdictionId,
    summary: `A public contract for ${purchase.programKey} was steered to a favored business.`,
    choice: "Award the completed purchase to the favored business.",
  };
}

/** Call the single misconduct writer after Session 20's purchase has landed. */
export function recordContractSteeringAct(
  world: World,
  input: Parameters<typeof contractSteeringActInput>[0],
): {
  readonly world: World;
  readonly occurrence:
    ReturnType<typeof recordMisconductAct>["occurrence"] | null;
} {
  const act = contractSteeringActInput(input);
  if (!act) return { world, occurrence: null };
  const recorded = recordMisconductAct(world, act);
  return { world: recorded.world, occurrence: recorded.occurrence };
}

/** A protected appointment is eligible only when sourced law and the saved
 * appointment comparison both show a personal choice over a stronger merit
 * candidate. Unknown or uncovered posts return false. */
export function protectedPatronageIsEligible(input: {
  readonly context: PersonnelClassContext;
  readonly asOfDate: string;
  readonly considerations: readonly DecisionConsideration[];
  readonly chosenOptionKey: string;
}): boolean {
  const protections = queryPersonnelProtections(input.context, input.asOfDate);
  const appointmentProtection = protections.civilService.find(
    (row) => row.field === "appointmentProtection",
  );
  return (
    appointmentProtection?.applicability === "matches-observed-scope" &&
    appointmentProtection.observation.state === "known" &&
    wasPersonalAppointment(input.considerations, input.chosenOptionKey)
  );
}

/** A conflict requires an exact recorded interest tied to the measure and no
 * disclosure filing. A place or broad industry match is never enough. */
export function undisclosedConflictIsEligible(input: {
  readonly interestRecordId: EntityId | null;
  readonly interestEntityId: EntityId | null;
  readonly measureInterestEntityId: EntityId | null;
  readonly disclosureArtifactId: EntityId | null;
}): boolean {
  return Boolean(
    input.interestRecordId &&
    input.interestEntityId &&
    input.measureInterestEntityId &&
    input.interestEntityId === input.measureInterestEntityId &&
    input.disclosureArtifactId === null,
  );
}

/**
 * NPC opening decisions are always evaluated from saved reasons and without
 * the close-choice override. The caller supplies the actor's recorded money,
 * relationships, traits, authority, and knowers as decision considerations.
 */
export function evaluateCorruptionOpening(
  world: World,
  input: {
    readonly stableKey: string;
    readonly actorPersonId: EntityId;
    readonly subjectKey: string;
    readonly options: readonly DecisionOption[];
    readonly considerations: readonly DecisionConsideration[];
  },
) {
  return evaluateDecision(world, {
    stableKey: input.stableKey,
    decisionType: "public-office.corruption-opening",
    actorPersonId: input.actorPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:public-office",
      key: input.subjectKey,
      entityId: null,
    },
    options: input.options,
    constraints: [],
    considerations: input.considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}
