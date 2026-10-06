import { wasPersonalAppointment } from "../patronage/appointments";
import { officeStaffPositionRecords } from "../governing/office-staffing";
import type { DecisionTraceRecord, EntityId, IsoDate, World } from "../types";

/**
 * The saved public-program records currently have no vendor purchase or award
 * record. A future canonical purchase reader may supply this optional input;
 * commitments, program recipients, and generic cash flows are not substitutes.
 */
export interface NamedProgramPurchaseEvidence {
  readonly programRecordId: EntityId;
  readonly programKey: string;
  readonly purchaseRecordId: EntityId;
  readonly awardRecordId: EntityId;
  readonly vendorOrganizationId: EntityId;
  readonly vendorPersonId: EntityId;
  readonly purchaseJurisdictionId: EntityId;
  readonly vendorJurisdictionId: EntityId;
  readonly purchasePurpose: "goods" | "services";
  readonly awardingBodyId: EntityId;
  readonly awardingOfficialPersonId: EntityId;
  readonly authority:
    | {
        readonly status: "known";
        readonly recordId: EntityId;
        readonly officialPersonId: EntityId;
        readonly awardingBodyId: EntityId;
        readonly scope: "goods-or-services-contract-award";
      }
    | { readonly status: "unknown" };
  readonly personalInterestRecordId: EntityId;
  readonly interestHolderPersonId: EntityId;
  readonly interestedOrganizationId: EntityId;
  readonly amountMinorUnits: number;
  readonly status: "paid" | "failed";
}

export interface ContractSteeringOpening {
  readonly family: "M8";
  readonly actorPersonIds: readonly EntityId[];
  readonly participantPersonIds: readonly EntityId[];
  readonly relatedEntityIds: readonly EntityId[];
  readonly sourceRecordIds: readonly EntityId[];
  readonly amountMinorUnits: number;
  readonly summary: string;
}

/**
 * Convert only a completed purchase with a named vendor, saved award, saved
 * authority for that same official, and a saved personal business interest.
 * No writer runs here; the caller supplies the single canonical purchase row.
 */
export function contractSteeringOpening(
  purchase: NamedProgramPurchaseEvidence | null | undefined,
): ContractSteeringOpening | null {
  if (!purchase) return null;
  if (
    !purchase.programRecordId ||
    !purchase.programKey.trim() ||
    purchase.status !== "paid" ||
    !purchase.purchaseRecordId ||
    !purchase.awardRecordId ||
    !purchase.vendorOrganizationId ||
    !purchase.vendorPersonId ||
    purchase.purchaseJurisdictionId !== purchase.vendorJurisdictionId ||
    (purchase.purchasePurpose !== "goods" &&
      purchase.purchasePurpose !== "services") ||
    !purchase.awardingBodyId ||
    purchase.authority.status !== "known" ||
    !purchase.authority.recordId ||
    purchase.awardingOfficialPersonId !== purchase.authority.officialPersonId ||
    purchase.awardingBodyId !== purchase.authority.awardingBodyId ||
    purchase.authority.scope !== "goods-or-services-contract-award" ||
    purchase.interestHolderPersonId !== purchase.awardingOfficialPersonId ||
    purchase.interestedOrganizationId !== purchase.vendorOrganizationId ||
    !purchase.personalInterestRecordId ||
    !Number.isSafeInteger(purchase.amountMinorUnits) ||
    purchase.amountMinorUnits <= 0
  )
    return null;

  return {
    family: "M8",
    actorPersonIds: [purchase.awardingOfficialPersonId],
    participantPersonIds: [
      purchase.awardingOfficialPersonId,
      purchase.vendorPersonId,
    ],
    relatedEntityIds: [purchase.awardingBodyId, purchase.vendorOrganizationId],
    sourceRecordIds: [
      purchase.programRecordId,
      purchase.purchaseRecordId,
      purchase.awardRecordId,
      purchase.authority.recordId,
      purchase.personalInterestRecordId,
    ],
    amountMinorUnits: purchase.amountMinorUnits,
    summary:
      "A public-program purchase went to a business tied to its awarding official.",
  };
}

export type PatronageOpeningResult =
  | { readonly status: "opened"; readonly opening: PatronageOpening }
  | {
      readonly status: "closed";
      readonly reason:
        | "position-missing"
        | "civil-service-protection-unknown"
        | "position-not-protected"
        | "appointment-trace-missing"
        | "appointment-does-not-match-position"
        | "appointment-was-not-personal";
    };

export interface PatronageOpening {
  readonly family: "M10";
  readonly actorPersonIds: readonly EntityId[];
  readonly participantPersonIds: readonly EntityId[];
  readonly relatedEntityIds: readonly EntityId[];
  readonly sourceRecordIds: readonly EntityId[];
  readonly occurredAt: IsoDate;
  readonly summary: string;
}

/**
 * Check a saved appointment choice against the saved post's civil-service
 * class. Unknown classes and unprotected posts stay closed. This prepares
 * opening facts for the existing misconduct writer; it does not write a
 * second appointment, evidence, or occurrence record.
 */
export function protectedPersonalAppointmentOpening(
  world: World,
  input: {
    readonly positionId: EntityId;
    readonly decisionTraceId: EntityId;
  },
): PatronageOpeningResult {
  const position = officeStaffPositionRecords(world).find(
    (record) => record.id === input.positionId,
  );
  if (!position) return { status: "closed", reason: "position-missing" };
  if (position.civilClass === "unknown")
    return {
      status: "closed",
      reason: "civil-service-protection-unknown",
    };
  if (position.civilClass !== "classified")
    return { status: "closed", reason: "position-not-protected" };

  const trace = world.history.decisionTraces.find(
    (record) => record.id === input.decisionTraceId,
  );
  if (!trace || !isAppointmentChoice(trace))
    return { status: "closed", reason: "appointment-trace-missing" };

  const optionKey = trace.selectedOptionKey;
  const chosenPersonId = personIdFromOptionKey(optionKey);
  if (
    !chosenPersonId ||
    trace.context.subject.kind !== "context:appointment" ||
    trace.context.subject.key !== position.officeKey
  )
    return {
      status: "closed",
      reason: "appointment-does-not-match-position",
    };
  if (!wasPersonalAppointment(trace.context.considerations, optionKey))
    return { status: "closed", reason: "appointment-was-not-personal" };

  const opening: PatronageOpening = {
    family: "M10",
    actorPersonIds: [trace.context.actorPersonId],
    participantPersonIds: [trace.context.actorPersonId, chosenPersonId],
    relatedEntityIds: [position.id, position.organizationId],
    sourceRecordIds: [trace.id, position.id],
    occurredAt: trace.recordedAt,
    summary: `The appointer chose ${position.title} for personal reasons despite a protected civil-service classification.`,
  };
  return { status: "opened", opening };
}

function isAppointmentChoice(
  trace: DecisionTraceRecord,
): trace is DecisionTraceRecord & { readonly selectedOptionKey: string } {
  return (
    trace.context.decisionType === "appointment.choose-appointee" &&
    trace.outcomeKind === "selected" &&
    trace.selectedOptionKey !== null
  );
}

function personIdFromOptionKey(optionKey: string | null): EntityId | null {
  if (!optionKey?.startsWith("person:")) return null;
  const personId = optionKey.slice("person:".length);
  return personId ? (personId as EntityId) : null;
}
