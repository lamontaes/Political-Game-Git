import { personName } from "../people";
import { recordEventKnowledge } from "../records";
import { resourcePositionAt } from "../resource-queries";
import {
  createResourceFlow,
  createResourceObligation,
  recordResourceTransferOutcome,
} from "../resources";
import { publicOrganizationKey } from "../tax-policy";
import type { EntityId, MoneyAmount, World } from "../types";
import { recordWorldEvent } from "../world";
import { generatedStateOversightBody } from "../press/generated-state-oversight";
import {
  priorAdverseFindings,
  repeatOffenseMultiplier,
} from "../press/findings";
import {
  PRESS_CONTRACT_VERSION,
  type MatterProceedingRecord,
  type ProceedingStepRecord,
} from "../press/records";
import {
  DISBURSEMENT_RECORD_KEY_PREFIX,
  PRESS_MATTER_TAG,
  sortedUnique,
} from "../press/shared";
import { pressRecordsOfKind, requirePressRecord } from "../press/store";

// The saved institutional proceeding supplies this adapter in its existing
// restitution slot. Procedure availability is not a new sanction grant;
// this preserves the existing adjudicated order/payment survivor only.
interface MisusedMoney {
  readonly organizationId: EntityId;
  readonly amount: MoneyAmount;
  /** How many separate payments make up the amount. */
  readonly payments: number;
}

/**
 * Money the respondent actually took from a committee: the matter's own
 * occurrence, plus every other M1 payment of theirs whose public disbursement
 * record was linked to the matter as evidence (a rival complaint links each
 * payment it saw). Summed per committee.
 */
function misusedCampaignMoney(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
): readonly MisusedMoney[] {
  const matter = requirePressRecord(world, "matter", proceeding.matterId);
  if (matter.family !== "M1") return [];
  const theirs = pressRecordsOfKind(world, "financial-occurrence").filter(
    (record) =>
      record.family === "M1" && record.actorPersonIds.includes(respondentId),
  );
  const linkedFlowIds = new Set(
    pressRecordsOfKind(world, "matter-evidence-link")
      .filter(
        (link) => link.matterId === matter.id && link.bearing === "supports",
      )
      .flatMap((link) => {
        const artifact = world.history.evidenceArtifacts.find(
          (row) => row.id === link.evidenceArtifactId,
        );
        return artifact?.stableKey.startsWith(DISBURSEMENT_RECORD_KEY_PREFIX)
          ? [artifact.stableKey.slice(DISBURSEMENT_RECORD_KEY_PREFIX.length)]
          : [];
      }),
  );
  const flowIds = new Set(
    theirs.flatMap((occurrence) =>
      occurrence.id === matter.occurrenceId
        ? occurrence.resourceFlowIds
        : occurrence.resourceFlowIds.filter((flowId) =>
            linkedFlowIds.has(flowId),
          ),
    ),
  );
  const owed = new Map<string, { amount: MoneyAmount; payments: number }>();
  for (const flowId of [...flowIds].sort()) {
    const flow = world.history.resourceFlows.find((row) => row.id === flowId);
    if (
      !flow ||
      flow.source.kind !== "organization" ||
      flow.recipient.kind !== "person" ||
      flow.recipient.personId !== respondentId
    )
      continue;
    const organizationId = flow.source.organizationId;
    for (const outcome of world.history.resourceTransferOutcomes) {
      if (
        outcome.resourceFlowId !== flow.id ||
        outcome.status !== "completed" ||
        outcome.transferredAmount.minorUnits <= 0
      )
        continue;
      const key = `${organizationId}|${outcome.transferredAmount.currency}`;
      const prior = owed.get(key);
      owed.set(key, {
        amount: {
          minorUnits:
            (prior?.amount.minorUnits ?? 0) +
            outcome.transferredAmount.minorUnits,
          currency: outcome.transferredAmount.currency,
        },
        payments: (prior?.payments ?? 0) + 1,
      });
    }
  }
  return [...owed.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, row]) => ({
      organizationId: key.slice(0, key.indexOf("|")) as EntityId,
      amount: row.amount,
      payments: row.payments,
    }));
}

/** The state a jurisdiction belongs to, when the World records one. */
function stateOf(world: World, jurisdictionId: EntityId): EntityId | null {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  if (!jurisdiction) return null;
  if (jurisdiction.kind.startsWith("state")) return jurisdiction.id;
  return (
    world.jurisdictionOrder.find((id) => {
      const candidate = world.jurisdictions[id]!;
      return (
        candidate.kind.startsWith("state") &&
        candidate.name === jurisdiction.parentName
      );
    }) ?? null
  );
}

/**
 * The government that receives what a body orders paid: the state whose body
 * heard it, or the United States for the FEC. Owner ruling, 2026-09-22: money
 * found misused goes to the government, not back into the committee, where
 * it could be taken again (in a replay, $34,949 of a $40,571 repayment was
 * withdrawn three days later). What each government then does with forfeited
 * campaign money is not modeled; it is held as general receipts.
 */
function receivingGovernment(
  world: World,
  proceeding: MatterProceedingRecord,
): { readonly organizationId: EntityId; readonly label: string } | null {
  const matter = requirePressRecord(world, "matter", proceeding.matterId);
  const federal = proceeding.procedureKey === "fec-enforcement";
  const stateId =
    !federal && matter.jurisdictionId
      ? stateOf(world, matter.jurisdictionId)
      : null;
  if (!federal && !stateId) return null;
  const key = federal ? US_TREASURY_KEY : publicOrganizationKey(stateId!);
  const organization = world.history.organizations.find(
    (row) => row.stableKey === key && row.formedAt <= world.currentDate,
  );
  if (!organization) return null;
  return {
    organizationId: organization.id,
    label: federal
      ? "United States Treasury"
      : `state of ${world.jurisdictions[stateId!]!.name}`,
  };
}

const US_TREASURY_KEY = "public-government:united-states:treasury";

export function applyFindingRestitution(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
  step: ProceedingStepRecord,
): World {
  let next = world;
  const misused = misusedCampaignMoney(next, proceeding, respondentId);
  for (const owed of misused) {
    const name = personName(next.people[respondentId]!);
    const dollars = formatDollars(owed.amount);
    const government = receivingGovernment(next, proceeding);
    if (!government) continue;
    const governmentName = government.label;
    next = orderPayment(next, proceeding, respondentId, {
      key: `${step.stableKey}:restitution:${respondentId}:${owed.organizationId}`,
      recipientOrganizationId: government.organizationId,
      amount: owed.amount,
      eventType: "matter.restitution-ordered",
      consequenceTag: "matter.consequence:restitution",
      basisKind: "custom:ethics-restitution",
      restrictionKind: "purpose:general",
      paidSummary: `${name} paid ${dollars}, the campaign money found misused, to the ${governmentName}, as the ${proceeding.institutionLabel} required.`,
      unpaidSummary: `The ${proceeding.institutionLabel} required ${name} to pay ${dollars}, the campaign money found misused, to the ${governmentName}; the debt stands unpaid.`,
      motivation:
        "Forfeiture of the misused amount itself, ordered with the finding.",
    });
  }
  return proceeding.procedureKey === "generated-state-oversight" &&
    step.outcome === "finding"
    ? civilPenaltyConsequence(next, proceeding, respondentId, step, misused)
    : next;
}

/**
 * A state oversight body's civil penalty: the per-payment amount every state
 * uses until its own is read, estimated from the FEC's average
 * (`generated-state-oversight.ts`), times the payments found, paid to the
 * state. Researched bodies impose none here, because nothing researched says
 * what they may impose; the FEC's conciliation penalties are not modeled, so
 * a federal finding orders restitution only.
 */
function civilPenaltyConsequence(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
  step: ProceedingStepRecord,
  misused: readonly MisusedMoney[],
): World {
  const matter = requirePressRecord(world, "matter", proceeding.matterId);
  const body = generatedStateOversightBody(world, matter.jurisdictionId);
  const payments = misused.reduce((sum, row) => sum + row.payments, 0);
  if (!body || payments === 0) return world;
  const state = world.history.organizations.find(
    (row) =>
      row.stableKey === publicOrganizationKey(body.stateJurisdictionId) &&
      row.formedAt <= world.currentDate,
  );
  if (!state) return world;
  let next = world;
  const prior = priorAdverseFindings(world, respondentId, step).length;
  const amount: MoneyAmount = {
    minorUnits: Math.round(
      body.civilPenaltyPerPaymentMinorUnits *
        payments *
        repeatOffenseMultiplier(prior, "civil-penalty"),
    ),
    currency: misused[0]!.amount.currency,
  };
  const name = personName(next.people[respondentId]!);
  const dollars = formatDollars(amount);
  const count = `${payments === 1 ? "one payment" : `${payments} payments`}${prior > 0 ? `, raised because ${name} had been found against before` : ""}`;
  next = orderPayment(next, proceeding, respondentId, {
    key: `${step.stableKey}:civil-penalty:${respondentId}`,
    recipientOrganizationId: state.id,
    amount,
    eventType: "matter.civil-penalty-imposed",
    consequenceTag: "matter.consequence:civil-penalty",
    basisKind: "custom:civil-penalty",
    restrictionKind: "purpose:general",
    paidSummary: `The ${proceeding.institutionLabel} fined ${name} ${dollars} for ${count} of campaign money used for personal expenses, and ${name} paid it.`,
    unpaidSummary: `The ${proceeding.institutionLabel} fined ${name} ${dollars} for ${count} of campaign money used for personal expenses; the fine stands unpaid.`,
    motivation:
      prior > 0
        ? "A civil penalty for each payment found, raised for a repeat offense."
        : "A civil penalty for each payment found.",
  });
  return next;
}

function formatDollars(amount: MoneyAmount): string {
  return `$${(amount.minorUnits / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface PaymentOrder {
  readonly key: string;
  readonly recipientOrganizationId: EntityId;
  readonly amount: MoneyAmount;
  readonly eventType: `${string}.${string}`;
  readonly consequenceTag: string;
  readonly basisKind: `custom:${string}`;
  readonly restrictionKind: "purpose:campaign" | "purpose:general";
  readonly paidSummary: string;
  readonly unpaidSummary: string;
  readonly motivation: string;
}

/**
 * Records the order in public, then the respondent's payment through the
 * existing money writers. An unpaid order becomes an outstanding obligation;
 * missing cash leaves settlement unsupported, not the liability. Recorded
 * insufficient cash keeps a blocked outcome. Tracked positions never overdraw.
 */
function orderPayment(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
  order: PaymentOrder,
): World {
  // An actual order survives missing payer cash. Settlement needs recorded cash.
  const payer = { kind: "person" as const, personId: respondentId };
  const position = resourcePositionAt(world, payer, order.amount.currency);
  const recipient = world.history.organizations.find(
    (row) =>
      row.id === order.recipientOrganizationId &&
      row.formedAt <= world.currentDate,
  );
  if (!recipient) return world;
  let next = world;
  const paid =
    position !== undefined &&
    position.liquidBalance.minorUnits >= order.amount.minorUnits;
  next = recordWorldEvent(next, {
    stableKey: `${order.key}:event`,
    type: order.eventType,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: requirePressRecord(next, "matter", proceeding.matterId)
      .jurisdictionId,
    involvedEntityIds: sortedUnique([
      respondentId,
      order.recipientOrganizationId,
      proceeding.id,
    ]),
    participants: [
      {
        personId: respondentId,
        role: "focus:respondent",
        detail: paid ? "Paid as ordered" : "Payment remains outstanding",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      PRESS_CONTRACT_VERSION,
      `${PRESS_MATTER_TAG}${proceeding.matterId}`,
      order.consequenceTag,
    ],
    summary: paid ? order.paidSummary : order.unpaidSummary,
    context: {
      location: null,
      socialContext: proceeding.institutionLabel,
      pressure: null,
      choice: null,
      motivation: order.motivation,
      immediateReaction: null,
    },
  });
  const orderEvent = next.history.events.at(-1)!;
  next = createResourceFlow(next, {
    stableKey: `${order.key}:flow`,
    source: payer,
    recipient: {
      kind: "organization",
      organizationId: order.recipientOrganizationId,
    },
    startsAt: next.currentDate,
    amount: order.amount,
    cadenceKind: "schedule:one-time",
    basisKind: order.basisKind,
    basisReference: { kind: "general" },
    restrictionKind: order.restrictionKind,
    jurisdictionId: orderEvent.jurisdictionId,
    provenance: { kind: "simulated-event", eventId: orderEvent.id },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  if (!paid)
    next = createResourceObligation(next, {
      stableKey: `${order.key}:obligation`,
      resourceFlowId: flow.id,
      establishedAt: next.currentDate,
      basisKind: order.basisKind,
      principal: order.amount,
      careResponsibilityId: null,
      housingTenureId: null,
      provenance: { kind: "simulated-event", eventId: orderEvent.id },
    });
  if (position)
    next = recordResourceTransferOutcome(next, {
      stableKey: `${order.key}:transfer`,
      resourceFlowId: flow.id,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      attemptedAmount: order.amount,
      transferredAmount: paid
        ? order.amount
        : { minorUnits: 0, currency: order.amount.currency },
      status: paid ? "completed" : "blocked",
      reasonKind: paid ? null : "capacity:restitution-unavailable",
      note: paid
        ? "Paid as ordered."
        : position
          ? "Insufficient funds to pay."
          : "No account to pay from.",
      provenance: { kind: "simulated-event", eventId: orderEvent.id },
    });
  return recordEventKnowledge(next, {
    stableKey: `${order.key}:respondent-knows`,
    personId: respondentId,
    eventId: orderEvent.id,
    learnedAt: next.currentDate,
    believedSummary: orderEvent.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}
