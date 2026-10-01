import type { applyFindingRestitution } from "../governing/finding-restitution";
import { campaigns, campaignState } from "../campaign-queries";
import { recordSupportLoss } from "../campaign-support";
import { recheckRoutedClaims } from "../claim-contradictions";
import { claimStancesBy } from "../claim-stances";
import { electionContestStatus } from "../election-contests";
import { recordEventKnowledge } from "../records";
import type { EntityId, HistoricalEvent, World } from "../types";
import { referForProsecution, regulatorRefers } from "../justice/prosecution";
import {
  isAdversePublicStep,
  priorAdverseFindings,
  repeatOffenseMultiplier,
  UNRESEARCHED_FINDING_EFFECTS,
  type AdversePublicOutcome,
} from "./findings";
import {
  type MatterProceedingRecord,
  type ProceedingStepRecord,
} from "./records";
import {
  closeContactsOf,
  colleaguesOf,
  partyContactsForSubject,
  produceMatterResponses,
} from "./responses";
import { sortedUnique } from "./shared";
import { requirePressRecord } from "./store";

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
  restitution?: typeof applyFindingRestitution,
): World {
  if (!isAdversePublicStep(step)) return world;
  const outcome = step.outcome as AdversePublicOutcome;
  let next = world;
  for (const respondentId of proceeding.respondentPersonIds) {
    if (!next.people[respondentId]) continue;
    next = supportConsequence(next, respondentId, outcome, step, event);
    if (restitution && (outcome === "finding" || outcome === "conciliation")) {
      // The saved institutional caller supplies its governing writer here,
      // in the original slot. Press alone does not issue a monetary order.
      next = restitution(next, proceeding, respondentId, step);
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
 * A finding that somebody took campaign money for themselves goes to
 * prosecutors (`justice/prosecution.ts`) when the record shows the violation
 * was knowing and willful: an earlier finding for the same thing stands, or
 * the person denied what this finding established (`regulatorRefers`). The
 * payments are on the committee's own filed reports, so the evidence is
 * documentary.
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
  const deniedIt = claimStancesBy(world, respondentId).some(
    ({ stance }) =>
      stance.propositionKey === `matter:${proceeding.matterId}` &&
      stance.asserted === "denies",
  );
  if (!regulatorRefers({ standingFindings: standing, deniedIt })) return world;
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
