import { addDays } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import {
  hasPersonDiscoveredEvidence,
  recordEvidenceArtifact,
  recordEvidenceDiscovery,
} from "../evidence";
import { scheduleFutureDueItem } from "../future-transitions";
import { ensureLifePathPersonalPosition } from "../life-paths2-resources";
import { activeWorkRelationshipsAt } from "../life-queries";
import { personName } from "../people";
import { publicProgramRecords } from "../public-program-integrity";
import { currentHistoricalCutoff } from "../queries";
import { recordEventKnowledge } from "../records";
import { resourcePositionAt } from "../resource-queries";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  PublicProgramAppropriationRecord,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  outsideMandateOfficeHeld,
  outsideMandatePayerRole,
  outsideMandatePayments,
  recordOutsideMandatePublicPayment,
} from "./governing-adapter";
import { fileComplaint, openMatter, procedureForSubject } from "./matters";
import {
  MISCONDUCT_FAMILY_LABELS,
  PRESS_CONTRACT_VERSION,
  type FinancialOccurrenceRecord,
  type ProcedureKey,
} from "./records";
import { PRESS_MATTER_TAG, sortedUnique } from "./shared";
import { appendPressRecord, pressRecordsOfKind } from "./store";

/**
 * M7 — public money spent outside its authorized purpose, as something a
 * player can actually do and somebody can actually find.
 *
 * GOVERNING's writer (`outside-mandate-payment.ts`) moves the money and
 * records the private occurrence. This file is the rest of the route: the
 * clearly labeled choice on an appropriation the officeholder can reach, the
 * restricted ledger entry the payment leaves behind, and a review of the
 * account by the people who work alongside the payer. What a reviewer does is
 * their own decision: stay quiet, ask about it inside the office, or, having
 * asked once and seen it happen again, file a complaint. A complaint opens a
 * proceeding, and its public steps are what the press can report.
 *
 * With nobody working beside the payer, nobody reviews the account and the
 * payment stays unknown. The review interval is authored, not researched.
 */

export const PUBLIC_LEDGER_REVIEW_TRANSITION_KEY = "press:public-ledger-review";
const REVIEW_KEY_PREFIX = "press46:public-ledger-review:";
/** Authored interval between a payment and the account's review. */
export const PUBLIC_LEDGER_REVIEW_DAYS = 30;
const CONCERN_TAG = "public-funds:concern";

export const OUTSIDE_PURPOSE_LABEL =
  "Paying yourself from this appropriation for anything it does not cover is spending public money outside its purpose.";

function appropriationOf(
  world: World,
  appropriationId: EntityId,
): PublicProgramAppropriationRecord | null {
  return (
    publicProgramRecords(world).find(
      (record): record is PublicProgramAppropriationRecord =>
        record.id === appropriationId && record.kind === "appropriation",
    ) ?? null
  );
}

export interface PublicFundsMisuseAvailability {
  readonly available: boolean;
  readonly reason: string;
  /** Cash the account holds now, which bounds what could be taken. */
  readonly balanceMinorUnits: number;
}

/** Whether this person could pay themselves from this appropriation. */
export function publicFundsMisuseAvailability(
  world: World,
  personId: EntityId,
  appropriationId: EntityId,
): PublicFundsMisuseAvailability {
  const appropriation = appropriationOf(world, appropriationId);
  if (!appropriation)
    return {
      available: false,
      reason: "No such appropriation.",
      balanceMinorUnits: 0,
    };
  if (
    !outsideMandatePayerRole(world, personId, appropriationId) &&
    !outsideMandateOfficeHeld(world, personId, appropriationId)
  )
    return {
      available: false,
      reason: "You hold no position with access to this public account.",
      balanceMinorUnits: 0,
    };
  const balance =
    resourcePositionAt(
      world,
      {
        kind: "organization",
        organizationId: appropriation.accountOrganizationId,
      },
      appropriation.amount.currency,
    )?.liquidBalance.minorUnits ?? 0;
  return balance > 0
    ? {
        available: true,
        reason: OUTSIDE_PURPOSE_LABEL,
        balanceMinorUnits: balance,
      }
    : {
        available: false,
        reason: "The public account holds no cash to take.",
        balanceMinorUnits: 0,
      };
}

export interface PublicFundsMisuseInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly appropriationId: EntityId;
  readonly amountMinorUnits: number;
  /** What the money actually paid for, in the player's own words. */
  readonly purpose: string;
}

/**
 * The deliberate M7 choice: money leaves the public account for the payer,
 * once, through GOVERNING's writer. It leaves a restricted ledger entry, and
 * the account is reviewed a month later.
 */
export function spendPublicFundsOutsidePurpose(
  world: World,
  input: PublicFundsMisuseInput,
): { readonly world: World; readonly occurrence: FinancialOccurrenceRecord } {
  const availability = publicFundsMisuseAvailability(
    world,
    input.personId,
    input.appropriationId,
  );
  if (!availability.available) throw new Error(availability.reason);
  const appropriation = appropriationOf(world, input.appropriationId)!;
  const purpose = input.purpose.trim();
  if (!purpose) throw new Error("Say what the money paid for.");
  if (
    !Number.isSafeInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0 ||
    input.amountMinorUnits > availability.balanceMinorUnits
  )
    throw new Error(
      "The amount must be positive and within what the account holds.",
    );
  // The money lands in the payer's own account, so it reaches somebody.
  let next = ensureLifePathPersonalPosition(
    world,
    input.personId,
    appropriation.amount.currency,
  );
  const paid = recordOutsideMandatePublicPayment(next, {
    stableKey: input.stableKey,
    payerPersonId: input.personId,
    payerWorkRoleId: outsideMandatePayerRole(
      next,
      input.personId,
      input.appropriationId,
    ),
    fundingId: appropriation.id,
    operationKey: input.stableKey,
    purposeUsed: purpose,
    amountMinorUnits: input.amountMinorUnits,
    recipient: { kind: "person", personId: input.personId },
    intent: "deliberate-outside-mandate",
  });
  next = recordEvidenceArtifact(paid.world, {
    stableKey: `${input.stableKey}:ledger`,
    evidenceKind: "record:public-account-ledger-entry",
    createdAt: paid.world.currentDate,
    recordedAt: paid.world.currentDate,
    relatedEntityIds: [paid.occurrenceEventId],
    access: "restricted",
    description: `Public account ledger entry: a payment to ${personName(paid.world.people[input.personId]!)} for ${purpose}, charged to an appropriation that does not cover it.`,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [paid.occurrenceEventId],
    },
  });
  const ledger = next.history.evidenceArtifacts.at(-1)!;
  const appended = appendPressRecord(next, "financial-occurrence", {
    stableKey: input.stableKey,
    family: "M7",
    actorPersonIds: [input.personId],
    occurrenceEventId: paid.occurrenceEventId,
    resourceFlowIds: [paid.resourceFlowId],
    recordEvidenceArtifactIds: [ledger.id],
    dutyReference: null,
    intentional: true,
    occurredAt: next.currentDate,
    jurisdictionId: appropriation.jurisdictionId,
  });
  next = scheduleFutureDueItem(appended.world, {
    stableKey: `${REVIEW_KEY_PREFIX}${appended.record.id}`,
    dueAt: addDays(next.currentDate, PUBLIC_LEDGER_REVIEW_DAYS),
    transitionKey: PUBLIC_LEDGER_REVIEW_TRANSITION_KEY,
    entityIds: sortedUnique([paid.occurrenceEventId, input.personId]),
    jurisdictionId: appropriation.jurisdictionId,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [paid.occurrenceEventId],
    },
  });
  return { world: next, occurrence: appended.record };
}

/** The appropriation an M7 occurrence's payment was charged to. */
function fundingOf(
  world: World,
  occurrence: FinancialOccurrenceRecord,
): EntityId | null {
  const event = world.history.events.find(
    (row) => row.id === occurrence.occurrenceEventId,
  );
  const tag = event?.tags.find((row) => row.startsWith("funding:"));
  return tag ? (tag.slice("funding:".length) as EntityId) : null;
}

/**
 * Who reviews the account: somebody else working now for the payer's own
 * employer, the office the payer holds, or the account's organization, first
 * in the World's order.
 */
function reviewerFor(
  world: World,
  actor: EntityId,
  appropriation: PublicProgramAppropriationRecord,
): EntityId | null {
  const organizations = new Set<EntityId>([
    appropriation.accountOrganizationId,
  ]);
  const roleId = outsideMandatePayerRole(world, actor, appropriation.id);
  const role = world.history.workRoles.find((row) => row.id === roleId);
  const relationship = world.history.workRelationships.find(
    (row) => row.id === role?.workRelationshipId,
  );
  if (relationship?.organizationId)
    organizations.add(relationship.organizationId);
  const office = outsideMandateOfficeHeld(world, actor, appropriation.id);
  if (office) organizations.add(office.organizationId);
  return (
    world.personOrder.find(
      (personId) =>
        personId !== actor &&
        activeWorkRelationshipsAt(world, personId).some(
          ({ relationship: row }) =>
            row.organizationId !== null &&
            organizations.has(row.organizationId),
        ),
    ) ?? null
  );
}

/**
 * The body that hears it: a legislator's researched state ethics body, where
 * there is one. Nobody has researched who investigates public money spent
 * outside its purpose by anyone else (filed as
 * `public-funds-misuse-oversight`), and the generated body stands in for a
 * campaign-finance regulator, which does not hear this; so everything else
 * goes to the simulated inquiry, which says plainly it cannot sanction.
 */
function publicFundsProcedure(world: World, actor: EntityId): ProcedureKey {
  const key = procedureForSubject(world, actor, null);
  return key === "generated-state-oversight" || key === "fec-enforcement"
    ? "simulated-inquiry"
    : key;
}

function raisedBefore(
  world: World,
  reviewer: EntityId,
  actor: EntityId,
): boolean {
  return world.history.events.some(
    (event) =>
      event.type === "matter.internal-concern-raised" &&
      event.tags.includes(CONCERN_TAG) &&
      event.participants.some(
        (entry) =>
          entry.personId === reviewer &&
          entry.role === "agency:concerned-staff",
      ) &&
      event.participants.some((entry) => entry.personId === actor),
  );
}

export function publicLedgerReviewHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PUBLIC_LEDGER_REVIEW_TRANSITION_KEY)
    throw new Error(
      "The public ledger review handler received another transition.",
    );
  const done = (
    reasonKey: `${string}:${string}`,
    next = world,
    eventId: EntityId | null = null,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: eventId ? "resolved" : "cancelled",
    reasonKey,
    context: null,
    outcomeEventId: eventId,
  });
  const occurrenceId = dueItem.stableKey.slice(
    REVIEW_KEY_PREFIX.length,
  ) as EntityId;
  const occurrence = pressRecordsOfKind(world, "financial-occurrence").find(
    (record) => record.id === occurrenceId && record.family === "M7",
  );
  if (!occurrence) return done("press:occurrence-missing");
  const fundingId = fundingOf(world, occurrence);
  const appropriation = fundingId ? appropriationOf(world, fundingId) : null;
  if (!appropriation) return done("press:appropriation-missing");
  const actor = occurrence.actorPersonIds[0]!;
  const reviewer = reviewerFor(world, actor, appropriation);
  if (!reviewer) return done("press:no-one-reviewed-the-account");

  // The review reads every payment charged to this appropriation outside its
  // purpose, and finds the ledger entries of this payer's among them.
  const paymentEvents = new Set(
    outsideMandatePayments(world, appropriation.id).map((row) => row.eventId),
  );
  const found = pressRecordsOfKind(world, "financial-occurrence").filter(
    (record) =>
      record.family === "M7" &&
      record.actorPersonIds.includes(actor) &&
      paymentEvents.has(record.occurrenceEventId),
  );
  let next = world;
  for (const record of found) {
    record.recordEvidenceArtifactIds.forEach((artifactId, index) => {
      if (
        hasPersonDiscoveredEvidence(
          next,
          reviewer,
          artifactId,
          currentHistoricalCutoff(next),
        )
      )
        return;
      next = recordEvidenceDiscovery(next, {
        stableKey: `${dueItem.stableKey}:found:${record.id}:${index}`,
        personId: reviewer,
        evidenceArtifactId: artifactId,
        discoveredAt: next.currentDate,
        recordedAt: next.currentDate,
        methodKey: "work:account-review",
        provenance: {
          kind: "simulated",
          sourceEntityIds: sortedUnique([artifactId, record.occurrenceEventId]),
        },
      });
    });
  }
  // Entries an earlier review already read are not news: a second payment
  // in the same month was found by the first review, and decided on there.
  if (next === world) return done("press:nothing-new-in-the-account");
  const discovery = next.history.events.at(-1)!;
  const reporting = raisedBefore(next, reviewer, actor);
  const evaluation = evaluateDecision(next, {
    stableKey: `${dueItem.stableKey}:decision`,
    decisionType: reporting
      ? "press.public-account-report"
      : "press.public-account-concern",
    actorPersonId: reviewer,
    cutoff: currentHistoricalCutoff(next),
    subject: {
      kind: "context:ledger-entry",
      key: occurrence.stableKey,
      entityId: discovery.id,
    },
    options: [
      reporting
        ? {
            key: "report-outside",
            label: "Report it outside the office",
            description:
              "File a complaint about the payments from the public account.",
          }
        : {
            key: "raise-internally",
            label: "Ask about it",
            description: "Ask the official about the entry privately.",
          },
      {
        key: "say-nothing",
        label: "Say nothing",
        description: "Leave the entry alone.",
      },
    ],
    constraints: [],
    considerations: [
      reporting
        ? {
            stableKey: "press:raised-before-and-it-continued",
            optionKey: "report-outside",
            sourceType: "context:professional-role",
            direction: "supports",
            importance: "strong",
            confidence: "high",
            explanation:
              "They already asked about a payment like this, and the payments continued.",
            sourceRefs: [],
          }
        : {
            stableKey: "press:public-account-duty",
            optionKey: "raise-internally",
            sourceType: "context:professional-role",
            direction: "supports",
            importance: "moderate",
            confidence: "high",
            explanation:
              "The entry pays the official from public money set aside for something else.",
            sourceRefs: [],
          },
      {
        stableKey: "press:employment-dependence",
        optionKey: "say-nothing",
        sourceType: "context:professional-role",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation: "The reviewer works alongside the official.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, evaluation);
  if (evaluation.selectedOptionKey === "say-nothing")
    return done("press:reviewer-stayed-silent", next, discovery.id);

  const opened = openMatter(next, {
    stableKey: `press46:matter:${occurrence.id}`,
    family: "M7",
    subjectPersonIds: occurrence.actorPersonIds,
    occurrenceId: occurrence.id,
    originEventId: discovery.id,
    jurisdictionId: occurrence.jurisdictionId,
  });
  next = opened.world;
  if (reporting) {
    next = fileComplaint(next, {
      stableKey: `${dueItem.stableKey}:complaint`,
      matterId: opened.matter.id,
      complainantPersonId: reviewer,
      procedureKey: publicFundsProcedure(next, actor),
    }).world;
    return done(
      "press:reviewer-reported-outside",
      next,
      next.history.events.at(-1)!.id,
    );
  }
  next = recordWorldEvent(next, {
    stableKey: `${dueItem.stableKey}:concern`,
    type: "matter.internal-concern-raised",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: occurrence.jurisdictionId,
    involvedEntityIds: sortedUnique([reviewer, actor, opened.matter.id]),
    participants: [
      {
        personId: reviewer,
        role: "agency:concerned-staff",
        detail: "Asked about a public account entry",
      },
      {
        personId: actor,
        role: "focus:asked",
        detail: "Was asked about the entry",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      PRESS_CONTRACT_VERSION,
      CONCERN_TAG,
      `${PRESS_MATTER_TAG}${opened.matter.id}`,
    ],
    summary: `${personName(next.people[reviewer]!)} asked about a payment from public money to ${personName(next.people[actor]!)} that the appropriation does not cover.`,
    context: {
      location: null,
      socialContext: MISCONDUCT_FAMILY_LABELS.M7,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const concern = next.history.events.at(-1)!;
  for (const personId of [reviewer, actor]) {
    next = recordEventKnowledge(next, {
      stableKey: `${concern.stableKey}:known:${personId}`,
      personId,
      eventId: concern.id,
      learnedAt: next.currentDate,
      believedSummary: concern.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  return done("press:reviewer-raised-concern", next, concern.id);
}
