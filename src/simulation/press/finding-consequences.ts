import { campaigns, campaignState } from "../campaign-queries";
import { recordSupportLoss } from "../campaign-support";
import { recheckRoutedClaims } from "../claim-contradictions";
import { claimStancesBy } from "../claim-stances";
import { electionContestStatus } from "../election-contests";
import { ensureLifePathPersonalPosition } from "../life-paths2-resources";
import { personName } from "../people";
import { createOrganization } from "../life";
import { recordEventKnowledge } from "../records";
import { resourcePositionAt } from "../resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
} from "../resources";
import { ensureTaxPublicAccount, publicOrganizationKey } from "../tax-policy";
import type { EntityId, HistoricalEvent, MoneyAmount, World } from "../types";
import { recordWorldEvent } from "../world";
import { referForProsecution, regulatorRefers } from "../justice/prosecution";
import { generatedStateOversightBody } from "./generated-state-oversight";
import {
  isAdversePublicStep,
  priorAdverseFindings,
  repeatOffenseMultiplier,
  UNRESEARCHED_FINDING_EFFECTS,
  type AdversePublicOutcome,
} from "./findings";
import {
  PRESS_CONTRACT_VERSION,
  type MatterProceedingRecord,
  type ProceedingStepRecord,
} from "./records";
import {
  closeContactsOf,
  colleaguesOf,
  partyContactsForSubject,
  produceMatterResponses,
} from "./responses";
import {
  DISBURSEMENT_RECORD_KEY_PREFIX,
  PRESS_MATTER_TAG,
  sortedUnique,
} from "./shared";
import { pressRecordsOfKind, requirePressRecord } from "./store";

/**
 * What a public adverse outcome does to the person it names, beyond the
 * record itself. Before this, a finding was an event tag that nothing in
 * election, money, relationship or party code read.
 *
 * - Votes: every open contest the respondent is a candidate in loses them
 *   support, handed to the rest of the field (`recordSupportLoss`). The size
 *   is an UNRESEARCHED blanket rule (`UNRESEARCHED_FINDING_EFFECTS`).
 * - Money: a finding or conciliation about campaign money the respondent
 *   took for themselves (M1) orders it repaid to the committee it came from.
 *   The amount is the recorded misuse itself, not a fine: no researched
 *   penalty schedule exists for any body here, so none is invented. A
 *   simulated inquiry has no sanction power and orders nothing.
 * - Relationships and party: kin, household, colleagues and the party
 *   chapter organizers learn of the public outcome from the public record,
 *   then each decides how to react through the existing matter-response
 *   decision (`responses.ts`), which strains a relationship when they keep
 *   their distance. The chapter's later decisions about helping a campaign
 *   read the same finding (`findings.ts`).
 *
 * Nothing here is automatic guilt for somebody not named, and nothing here
 * removes anyone from office.
 */
export function applyFindingConsequences(
  world: World,
  proceeding: MatterProceedingRecord,
  step: ProceedingStepRecord,
  event: HistoricalEvent,
): World {
  if (!isAdversePublicStep(step)) return world;
  const outcome = step.outcome as AdversePublicOutcome;
  let next = world;
  for (const respondentId of proceeding.respondentPersonIds) {
    if (!next.people[respondentId]) continue;
    next = supportConsequence(next, respondentId, outcome, step, event);
    if (outcome === "finding" || outcome === "conciliation") {
      next = restitutionConsequence(next, proceeding, respondentId, step);
    }
    if (outcome === "finding") {
      next = referralConsequence(next, proceeding, respondentId, step, event);
    }
    next = socialConsequence(next, proceeding, respondentId, event);
    next = deniedToConsequence(next, proceeding, respondentId, event);
  }
  return next;
}

/**
 * A finding that somebody took campaign money for themselves may go to
 * prosecutors (`justice/prosecution.ts`): a chance, likelier with each
 * finding that stands against them. The payments are on the committee's own
 * filed reports, so the evidence is documentary. When a regulator refers,
 * and everything after, is an UNRESEARCHED placeholder.
 */
function referralConsequence(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
  step: ProceedingStepRecord,
  event: HistoricalEvent,
): World {
  const matter = requirePressRecord(world, "matter", proceeding.matterId);
  if (matter.family !== "M1") return world;
  const standing = priorAdverseFindings(world, respondentId, step).length + 1;
  const key = `${step.stableKey}:${respondentId}`;
  if (!regulatorRefers(world, key, standing)) return world;
  return referForProsecution(world, {
    stableKey: key,
    subjectPersonId: respondentId,
    jurisdictionId: matter.jurisdictionId,
    offenseKey: "campaign-funds-personal-use",
    referredBy: {
      kind: "regulator",
      label: proceeding.institutionLabel,
      personId: null,
    },
    basisEventIds: [event.id],
    evidence: "documentary",
    standingFindings: standing,
  }).world;
}

/**
 * Whoever the respondent denied this matter to, a reporter asking about it,
 * follows it and reads the finding when it is published; the denial is then
 * checked against it at once. Before this a lie told with "Deny it" was
 * checked once, before any finding existed, and never again.
 */
function deniedToConsequence(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
  event: HistoricalEvent,
): World {
  const propositionKey = `matter:${proceeding.matterId}`;
  const askers = sortedUnique(
    claimStancesBy(world, respondentId)
      .filter(({ stance }) => stance.propositionKey === propositionKey)
      .flatMap(({ stance }) => stance.recipientPersonIds),
  ).filter((personId) => personId !== respondentId && world.people[personId]);
  if (askers.length === 0) return world;
  let next = world;
  for (const personId of askers) {
    if (
      next.history.knowledge.some(
        (record) => record.personId === personId && record.eventId === event.id,
      )
    )
      continue;
    next = recordEventKnowledge(next, {
      stableKey: `${event.stableKey}:followed-by:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: proceeding.institutionLabel },
    });
  }
  return recheckRoutedClaims(next, respondentId, propositionKey);
}

function supportConsequence(
  world: World,
  respondentId: EntityId,
  outcome: AdversePublicOutcome,
  step: ProceedingStepRecord,
  event: HistoricalEvent,
): World {
  let next = world;
  for (const campaign of campaigns(next)) {
    if (
      !campaign.candidateSupportScopes.some(
        (scope) => scope.candidatePersonId === respondentId,
      ) ||
      campaign.candidateSupportScopes.length < 2 ||
      campaignState(next, campaign.id).status !== "active" ||
      electionContestStatus(next, campaign.contestId) !== "pending"
    )
      continue;
    next = recordSupportLoss(next, campaign, {
      stableKeyBase: `${step.stableKey}:finding-support:${campaign.id}:${respondentId}`,
      loserPersonId: respondentId,
      lossBasisPoints: Math.round(
        UNRESEARCHED_FINDING_EFFECTS.supportLossBasisPoints[outcome] *
          repeatOffenseMultiplier(
            priorAdverseFindings(next, respondentId, step).length,
            "support-loss",
          ),
      ),
      sourceEntityIds: [event.id],
    }).world;
  }
  return next;
}

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
): {
  readonly world: World;
  readonly organizationId: EntityId;
  readonly label: string;
} {
  const matter = requirePressRecord(world, "matter", proceeding.matterId);
  const stateId =
    proceeding.procedureKey === "fec-enforcement"
      ? null
      : matter.jurisdictionId && stateOf(world, matter.jurisdictionId);
  if (stateId) {
    const next = ensureTaxPublicAccount(world, stateId);
    return {
      world: next,
      organizationId: next.history.organizations.find(
        (row) => row.stableKey === publicOrganizationKey(stateId),
      )!.id,
      label: `state of ${next.jurisdictions[stateId]!.name}`,
    };
  }
  return {
    ...ensureUnitedStatesTreasury(world),
    label: "United States Treasury",
  };
}

const US_TREASURY_KEY = "public-government:united-states:treasury";

function ensureUnitedStatesTreasury(world: World): {
  readonly world: World;
  readonly organizationId: EntityId;
} {
  let next = world;
  let organization = next.history.organizations.find(
    (row) => row.stableKey === US_TREASURY_KEY,
  );
  if (!organization) {
    next = createOrganization(next, {
      stableKey: US_TREASURY_KEY,
      formedAt: next.currentDate,
      provenance: {
        kind: "authored",
        note: "Sparse federal receipts account for money federal bodies order paid; no factual treasury cash is asserted.",
      },
      initialProfile: {
        name: "United States Treasury",
        classification: "sector:government",
        locationJurisdictionId: null,
      },
    });
    organization = next.history.organizations.find(
      (row) => row.stableKey === US_TREASURY_KEY,
    )!;
    next = createResourcePosition(next, {
      stableKey: `${US_TREASURY_KEY}:modeled-receipts:USD`,
      owner: { kind: "organization", organizationId: organization.id },
      openedAt: next.currentDate,
      openingBalance: {
        minorUnits: 0,
        currency: "USD" as MoneyAmount["currency"],
      },
      provenance: {
        kind: "authored",
        note: "Known zero opening of the modeled receipts account.",
      },
    });
  }
  return { world: next, organizationId: organization.id };
}

function restitutionConsequence(
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
    next = government.world;
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
      unpaidSummary: `The ${proceeding.institutionLabel} required ${name} to pay ${dollars}, the campaign money found misused, to the ${governmentName}; ${name} did not have it, and the debt stands unpaid.`,
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
 * A generated state body's civil penalty: its UNRESEARCHED per-payment scale
 * (`generated-state-oversight.ts`) times the payments found, paid to the
 * state. Researched bodies impose none here, because nothing researched says
 * what they may impose; the FEC's conciliation penalties are unresearched too.
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
  let next = ensureTaxPublicAccount(world, body.stateJurisdictionId);
  const state = next.history.organizations.find(
    (row) => row.stableKey === publicOrganizationKey(body.stateJurisdictionId),
  )!;
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
    unpaidSummary: `The ${proceeding.institutionLabel} fined ${name} ${dollars} for ${count} of campaign money used for personal expenses; ${name} did not have it, and the fine stands unpaid.`,
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
 * existing money writers: completed when they hold the money, blocked (the
 * debt stands) when they do not. Tracked positions never overdraw.
 */
function orderPayment(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
  order: PaymentOrder,
): World {
  // Money the respondent took is on their own account; a life that has none
  // tracked yet gets its checkpoint first, carrying what it already received.
  let next = ensureLifePathPersonalPosition(
    world,
    respondentId,
    order.amount.currency,
  );
  const payer = { kind: "person" as const, personId: respondentId };
  const position = resourcePositionAt(next, payer, order.amount.currency);
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
        detail: paid ? "Paid as ordered" : "Could not pay in full",
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

/**
 * The people around the respondent read the public outcome, then decide for
 * themselves what to do about it through the existing response decision.
 */
function socialConsequence(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
  event: HistoricalEvent,
): World {
  let next = world;
  const readers = sortedUnique([
    ...partyContactsForSubject(next, respondentId),
    ...colleaguesOf(next, respondentId),
    ...closeContactsOf(next, respondentId),
  ]).filter((personId) => personId !== respondentId && next.people[personId]);
  for (const personId of readers) {
    if (
      next.history.knowledge.some(
        (record) => record.personId === personId && record.eventId === event.id,
      )
    )
      continue;
    next = recordEventKnowledge(next, {
      stableKey: `${event.stableKey}:read-by:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "public-record", reference: proceeding.institutionLabel },
    });
  }
  return produceMatterResponses(next, proceeding.matterId, event);
}
