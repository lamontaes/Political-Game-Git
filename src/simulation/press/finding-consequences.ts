import { campaigns, campaignState } from "../campaign-queries";
import { recordSupportLoss } from "../campaign-support";
import { electionContestStatus } from "../election-contests";
import { personName } from "../people";
import { recordEventKnowledge } from "../records";
import { resourcePositionAt } from "../resource-queries";
import {
  createResourceFlow,
  recordResourceTransferOutcome,
} from "../resources";
import type { EntityId, HistoricalEvent, MoneyAmount, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  isAdversePublicStep,
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
import { PRESS_MATTER_TAG, sortedUnique } from "./shared";
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
    next = socialConsequence(next, proceeding, respondentId, event);
  }
  return next;
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
      lossBasisPoints:
        UNRESEARCHED_FINDING_EFFECTS.supportLossBasisPoints[outcome],
      sourceEntityIds: [event.id],
    }).world;
  }
  return next;
}

/** Money the respondent actually took from a committee, per flow. */
function misusedCampaignMoney(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
): readonly {
  readonly organizationId: EntityId;
  readonly amount: MoneyAmount;
}[] {
  const matter = requirePressRecord(world, "matter", proceeding.matterId);
  if (matter.family !== "M1" || matter.occurrenceId === null) return [];
  const occurrence = pressRecordsOfKind(world, "financial-occurrence").find(
    (record) => record.id === matter.occurrenceId,
  );
  if (!occurrence || !occurrence.actorPersonIds.includes(respondentId))
    return [];
  const owed = new Map<string, MoneyAmount>();
  for (const flowId of occurrence.resourceFlowIds) {
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
      if (outcome.resourceFlowId !== flow.id || outcome.status !== "completed")
        continue;
      const key = `${organizationId}|${outcome.transferredAmount.currency}`;
      const prior = owed.get(key);
      owed.set(key, {
        minorUnits:
          (prior?.minorUnits ?? 0) + outcome.transferredAmount.minorUnits,
        currency: outcome.transferredAmount.currency,
      });
    }
  }
  return [...owed.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, amount]) => ({
      organizationId: key.slice(0, key.indexOf("|")) as EntityId,
      amount,
    }))
    .filter((row) => row.amount.minorUnits > 0);
}

function restitutionConsequence(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
  step: ProceedingStepRecord,
): World {
  let next = world;
  for (const owed of misusedCampaignMoney(next, proceeding, respondentId)) {
    const key = `${step.stableKey}:restitution:${respondentId}:${owed.organizationId}`;
    const payer = { kind: "person" as const, personId: respondentId };
    const position = resourcePositionAt(next, payer, owed.amount.currency);
    const paid =
      position !== undefined &&
      position.liquidBalance.minorUnits >= owed.amount.minorUnits;
    const name = personName(next.people[respondentId]!);
    const dollars = (owed.amount.minorUnits / 100).toFixed(2);
    next = recordWorldEvent(next, {
      stableKey: `${key}:event`,
      type: "matter.restitution-ordered",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: requirePressRecord(next, "matter", proceeding.matterId)
        .jurisdictionId,
      involvedEntityIds: sortedUnique([
        respondentId,
        owed.organizationId,
        proceeding.id,
      ]),
      participants: [
        {
          personId: respondentId,
          role: "focus:respondent",
          detail: paid ? "Repaid the committee" : "Could not repay in full",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        PRESS_CONTRACT_VERSION,
        `${PRESS_MATTER_TAG}${proceeding.matterId}`,
        "matter.consequence:restitution",
      ],
      summary: paid
        ? `${name} repaid $${dollars} of campaign money to the committee, as the ${proceeding.institutionLabel} required.`
        : `The ${proceeding.institutionLabel} required ${name} to repay $${dollars} of campaign money; ${name} did not have it, and the debt stands unpaid.`,
      context: {
        location: null,
        socialContext: proceeding.institutionLabel,
        pressure: null,
        choice: null,
        motivation:
          "Repayment of the misused amount itself. No penalty schedule has been researched, so no fine is added.",
        immediateReaction: null,
      },
    });
    const orderEvent = next.history.events.at(-1)!;
    next = createResourceFlow(next, {
      stableKey: `${key}:flow`,
      source: payer,
      recipient: { kind: "organization", organizationId: owed.organizationId },
      startsAt: next.currentDate,
      amount: owed.amount,
      cadenceKind: "schedule:one-time",
      basisKind: "custom:ethics-restitution",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:campaign",
      jurisdictionId: orderEvent.jurisdictionId,
      provenance: { kind: "simulated-event", eventId: orderEvent.id },
    });
    const flow = next.history.resourceFlows.at(-1)!;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${key}:transfer`,
      resourceFlowId: flow.id,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      attemptedAmount: owed.amount,
      transferredAmount: paid
        ? owed.amount
        : { minorUnits: 0, currency: owed.amount.currency },
      status: paid ? "completed" : "blocked",
      reasonKind: paid ? null : "capacity:restitution-unavailable",
      note: paid
        ? "Repaid as ordered."
        : position
          ? "Insufficient funds to repay."
          : "No account to repay from.",
      provenance: { kind: "simulated-event", eventId: orderEvent.id },
    });
    next = recordEventKnowledge(next, {
      stableKey: `${key}:respondent-knows`,
      personId: respondentId,
      eventId: orderEvent.id,
      learnedAt: next.currentDate,
      believedSummary: orderEvent.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  return next;
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
