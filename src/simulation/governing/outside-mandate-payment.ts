import { organizationProfileAt, workStatusAt } from "../life-queries";
import {
  governingOfficeForPerson,
  type GoverningOffice,
} from "./state-governing";
import { publicProgramRecords } from "../public-program-integrity";
import { resourcePositionAt } from "../resource-queries";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import type {
  EntityId,
  PublicProgramAppropriationRecord,
  ResourceEndpoint,
  World,
} from "../types";
import { recordWorldEvent } from "../world";

/**
 * GOVERNING's labeled writer for public money spent outside its mandate.
 *
 * PRESS investigates misuse; it never invents one. When a story needs a
 * deliberate misuse to exist, this writer moves real money out of an existing
 * public account once, through the ordinary resource-flow store, and records a
 * private occurrence that says plainly the payment fell outside the program the
 * appropriation was made for. It refuses when the payer has no working access
 * to that account or the account lacks the cash. The appropriation is not
 * reduced: the money was never lawfully committed.
 */

export const OUTSIDE_MANDATE_VERSION = "outside-mandate-payment/v1";
export const OUTSIDE_MANDATE_TAG = "public-fund:outside-mandate";
export const OUTSIDE_MANDATE_EVENT = "fiscal.outside-mandate-payment" as const;

export interface OutsideMandatePaymentInput {
  readonly stableKey: string;
  readonly payerPersonId: EntityId;
  /**
   * The payer's job with access to the account, or null when the payer acts
   * as the sitting holder of the government's executive office, which is
   * recorded as a tenure rather than a job.
   */
  readonly payerWorkRoleId: EntityId | null;
  /** The public-program appropriation whose account paid. */
  readonly fundingId: EntityId;
  readonly operationKey: string;
  /** What the money was actually used for, in words. */
  readonly purposeUsed: string;
  readonly amountMinorUnits: number;
  readonly recipient: ResourceEndpoint;
  readonly intent: "deliberate-outside-mandate";
}

export interface OutsideMandatePaymentResult {
  readonly world: World;
  readonly resourceFlowId: EntityId;
  readonly occurrenceEventId: EntityId;
}

function flowKey(input: OutsideMandatePaymentInput): string {
  return `${OUTSIDE_MANDATE_VERSION}:${input.fundingId}:${input.operationKey}`;
}

/**
 * Whether this work role gives its holder access to the appropriation's
 * account: a current job with the account's own organization, or with a
 * public employer of the same jurisdiction.
 */
function roleReachesAccount(
  world: World,
  personId: EntityId,
  roleId: EntityId,
  appropriation: PublicProgramAppropriationRecord,
): boolean {
  const role = world.history.workRoles.find((r) => r.id === roleId);
  const relationship = role
    ? world.history.workRelationships.find(
        (w) => w.id === role.workRelationshipId,
      )
    : undefined;
  if (
    !relationship ||
    relationship.personId !== personId ||
    workStatusAt(world, relationship.id)?.status !== "active"
  )
    return false;
  if (relationship.organizationId === appropriation.accountOrganizationId)
    return true;
  const employer = relationship.organizationId
    ? (organizationProfileAt(world, relationship.organizationId) ?? null)
    : null;
  return (
    employer !== null &&
    (employer.classification === "sector:government" ||
      employer.classification.startsWith("service:")) &&
    employer.locationJurisdictionId === appropriation.jurisdictionId
  );
}

/**
 * The first of a person's work roles that reaches this appropriation's
 * account, or null when none does. Read-only.
 */
export function outsideMandatePayerRole(
  world: World,
  personId: EntityId,
  fundingId: EntityId,
): EntityId | null {
  const appropriation = publicProgramRecords(world).find(
    (record): record is PublicProgramAppropriationRecord =>
      record.id === fundingId && record.kind === "appropriation",
  );
  if (!appropriation) return null;
  const relationshipIds = new Set(
    world.history.workRelationships
      .filter((w) => w.personId === personId)
      .map((w) => w.id),
  );
  return (
    world.history.workRoles.find(
      (role) =>
        relationshipIds.has(role.workRelationshipId) &&
        roleReachesAccount(world, personId, role.id, appropriation),
    )?.id ?? null
  );
}

/**
 * The executive office this person holds over the appropriation's
 * government, if any. A governor's tenure carries no work relationship, and
 * holding the office is what gives the access.
 */
export function outsideMandateOfficeHeld(
  world: World,
  personId: EntityId,
  fundingId: EntityId,
): GoverningOffice | null {
  const appropriation = publicProgramRecords(world).find(
    (record): record is PublicProgramAppropriationRecord =>
      record.id === fundingId && record.kind === "appropriation",
  );
  const office = governingOfficeForPerson(world, personId);
  return appropriation &&
    office &&
    office.jurisdictionId === appropriation.jurisdictionId
    ? office
    : null;
}

/** Throws with the reason when the payment cannot happen; writes once. */
export function recordOutsideMandatePublicPayment(
  world: World,
  input: OutsideMandatePaymentInput,
): OutsideMandatePaymentResult {
  if (input.intent !== "deliberate-outside-mandate")
    throw new Error("This writer records only deliberate outside-mandate use.");
  if (
    !Number.isSafeInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0 ||
    !input.operationKey.trim() ||
    !input.purposeUsed.trim()
  )
    throw new Error(
      "An outside-mandate payment needs an operation key, a stated use and a positive amount.",
    );
  const key = flowKey(input);
  const prior = world.history.resourceFlows.find((f) => f.stableKey === key);
  if (prior) {
    const event = world.history.events.find(
      (e) => e.stableKey === `event:${key}`,
    );
    if (!event)
      throw new Error("The earlier outside-mandate payment lost its record.");
    return { world, resourceFlowId: prior.id, occurrenceEventId: event.id };
  }
  const appropriation = publicProgramRecords(world).find(
    (record): record is PublicProgramAppropriationRecord =>
      record.id === input.fundingId && record.kind === "appropriation",
  );
  if (!appropriation) throw new Error("No such public appropriation.");
  const role = input.payerWorkRoleId
    ? world.history.workRoles.find((r) => r.id === input.payerWorkRoleId)
    : undefined;
  const office = input.payerWorkRoleId
    ? null
    : outsideMandateOfficeHeld(world, input.payerPersonId, appropriation.id);
  const payerTitle =
    role &&
    roleReachesAccount(world, input.payerPersonId, role.id, appropriation)
      ? role.title
      : (office?.title ?? null);
  if (!payerTitle)
    throw new Error(
      "The payer holds no current position with access to this public account.",
    );
  const account: ResourceEndpoint = {
    kind: "organization",
    organizationId: appropriation.accountOrganizationId,
  };
  const amount = money(input.amountMinorUnits, appropriation.amount.currency);
  const cash = resourcePositionAt(world, account, amount.currency);
  if (!cash || cash.liquidBalance.minorUnits < amount.minorUnits)
    throw new Error("The public account does not hold that much cash.");
  let next = recordWorldEvent(world, {
    stableKey: `event:${key}`,
    type: OUTSIDE_MANDATE_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: appropriation.jurisdictionId,
    involvedEntityIds: [
      ...new Set([input.payerPersonId, appropriation.accountOrganizationId]),
    ].sort(),
    participants: [
      {
        personId: input.payerPersonId,
        role: "agency:outside-mandate-payment",
        detail: payerTitle,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "fiscal",
      OUTSIDE_MANDATE_TAG,
      `program:${appropriation.programKey}`,
      `funding:${appropriation.id}`,
      `requested-as:${input.stableKey}`,
    ],
    summary: `Public money appropriated for ${appropriation.programKey} was paid out for ${input.purposeUsed}, which that appropriation does not cover.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: input.purposeUsed,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = createResourceFlow(next, {
    stableKey: key,
    source: account,
    recipient: input.recipient,
    startsAt: next.currentDate,
    amount,
    cadenceKind: "custom:outside-mandate-payment",
    basisKind: "custom:outside-mandate-payment",
    basisReference: { kind: "general" },
    restrictionKind: "custom:outside-mandate",
    jurisdictionId: appropriation.jurisdictionId,
    provenance: { kind: "simulated-event", eventId },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${key}:transfer`,
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    attemptedAmount: amount,
    transferredAmount: amount,
    status: "completed",
    reasonKind: null,
    note: `Outside its mandate: ${input.purposeUsed}.`,
    provenance: flow.provenance,
  });
  return { world: next, resourceFlowId: flow.id, occurrenceEventId: eventId };
}

/** Outside-mandate payments recorded against one appropriation. */
export function outsideMandatePayments(
  world: World,
  fundingId: EntityId,
): readonly {
  readonly eventId: EntityId;
  readonly resourceFlowId: EntityId;
}[] {
  const prefix = `${OUTSIDE_MANDATE_VERSION}:${fundingId}:`;
  return world.history.resourceFlows
    .filter((flow) => flow.stableKey.startsWith(prefix))
    .flatMap((flow) => {
      const event = world.history.events.find(
        (e) => e.stableKey === `event:${flow.stableKey}`,
      );
      return event ? [{ eventId: event.id, resourceFlowId: flow.id }] : [];
    });
}
