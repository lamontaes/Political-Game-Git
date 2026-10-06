import { requireCampaign } from "./campaign-queries";
import { addCampaignHelper } from "./campaign-helpers";
import { evaluateDecision } from "./decisions";
import { requireElectionContest } from "./election-contests";
import { homePartyChapters } from "./living-world/party-chapters";
import { peopleKnownTo } from "./living-world/official-views";
import {
  workRelationshipHistoryForPerson,
  workRoleHistory,
  workStatusHistory,
} from "./life-queries";
import { recordWorldEvent } from "./world";
import { resourcePositionAt } from "./resource-queries";
import { createResourceFlow } from "./resources";
import { payRecordedCampaignOperatingBill } from "./campaign-operating-costs";
import { ensurePeopleTraits } from "./people-traits";
import type {
  DecisionConsideration,
  EntityId,
  MoneyAmount,
  World,
} from "./types";

/** Estimated monthly manager pay, sourced from the ranges in assignment B02.
 * Replace these rows with researched local postings without changing the rules.
 */
export const CAMPAIGN_MANAGER_PAY = {
  version: "campaign-manager-pay-estimated-v1",
  basis: "estimated",
  monthlyMinorUnits: 300_000,
  sources: [
    "jobs.arena.run state legislative campaign postings (assignment B02 summary)",
    "climbtheladder.com campaign manager pay summary (assignment B02 summary)",
  ],
} as const;

export function campaignWorkDays(world: World, personId: EntityId): number {
  let days = 0;
  for (const work of workRelationshipHistoryForPerson(world, personId)) {
    const role = workRoleHistory(world, work.id).find((row) =>
      row.occupationClassification?.startsWith("service:campaign-"),
    );
    if (!role) continue;
    const ended = workStatusHistory(world, work.id).find(
      (row) => row.status === "ended" && row.effectiveAt >= role.effectiveAt,
    );
    const end = ended?.effectiveAt ?? world.currentDate;
    if (end > role.effectiveAt)
      days += Math.floor(
        (Date.parse(`${end}T00:00:00Z`) -
          Date.parse(`${role.effectiveAt}T00:00:00Z`)) /
          86_400_000,
      );
  }
  return days;
}

export function campaignManagerCandidates(
  world: World,
  campaignId: EntityId,
): readonly { personId: EntityId; campaignWorkDays: number }[] {
  const campaign = requireCampaign(world, campaignId);
  const known = new Set(peopleKnownTo(world, campaign.candidatePersonId));
  for (const chapter of homePartyChapters(world)) {
    if (!chapter.organizerPersonId) continue;
    for (const personId of peopleKnownTo(world, chapter.organizerPersonId))
      known.add(personId);
  }
  return [...known]
    .filter((personId) => personId !== campaign.candidatePersonId)
    .map((personId) => ({
      personId,
      campaignWorkDays: campaignWorkDays(world, personId),
    }))
    .filter((row) => row.campaignWorkDays > 0)
    .sort(
      (a, b) =>
        b.campaignWorkDays - a.campaignWorkDays ||
        a.personId.localeCompare(b.personId),
    );
}

export interface CampaignManagerOffer {
  readonly personId: EntityId;
  readonly salary: MoneyAmount;
  readonly monthsThroughElection: number;
  readonly totalCost: MoneyAmount;
  readonly affordable: boolean;
  readonly estimated: true;
}

export function campaignManagerOffer(
  world: World,
  campaignId: EntityId,
  personId: EntityId,
): CampaignManagerOffer | null {
  const campaign = requireCampaign(world, campaignId);
  if (
    !campaignManagerCandidates(world, campaignId).some(
      (row) => row.personId === personId,
    )
  )
    return null;
  if (
    campaign.staffWorkRelationshipIds.some(
      (id) =>
        world.history.workRelationships.find((row) => row.id === id)
          ?.personId === personId,
    )
  )
    return null;
  const contest = requireElectionContest(world, campaign.contestId);
  const days = Math.max(
    0,
    Math.floor(
      (Date.parse(`${contest.electionDate}T00:00:00Z`) -
        Date.parse(`${world.currentDate}T00:00:00Z`)) /
        86_400_000,
    ),
  );
  const months = Math.max(1, Math.ceil(days / 30));
  const salary = {
    minorUnits: CAMPAIGN_MANAGER_PAY.monthlyMinorUnits,
    currency: campaign.treasuryCurrency,
  } as MoneyAmount;
  const totalCost = { ...salary, minorUnits: salary.minorUnits * months };
  const position = resourcePositionAt(
    world,
    { kind: "organization", organizationId: campaign.organizationId },
    campaign.treasuryCurrency,
  );
  const balance = position?.liquidBalance.minorUnits ?? 0;
  return {
    personId,
    salary,
    monthsThroughElection: months,
    totalCost,
    affordable: balance >= totalCost.minorUnits,
    estimated: true,
  };
}

export function offerCampaignManager(
  world: World,
  campaignId: EntityId,
  personId: EntityId,
): { world: World; accepted: boolean; reasons: readonly string[] } {
  const campaign = requireCampaign(world, campaignId);
  const offer = campaignManagerOffer(world, campaignId, personId);
  if (!offer || !offer.affordable)
    throw new Error(
      "The campaign cannot cover a manager's salary through election day.",
    );
  const key = `${campaign.stableKey}:manager-offer:${personId}`;
  if (world.history.events.some((row) => row.stableKey === `${key}:event`))
    throw new Error("This manager has already answered.");
  const experience: DecisionConsideration = {
    stableKey: `${key}:experience`,
    optionKey: "accept",
    sourceType: "context:campaign-experience",
    direction: "supports",
    importance: offer.salary.minorUnits >= 500_000 ? "strong" : "moderate",
    confidence: "high",
    explanation: "They have worked on campaigns before.",
    sourceRefs: [],
  };
  const decisionWorld = ensurePeopleTraits(world, [personId]);
  const evaluation = evaluateDecision(decisionWorld, {
    stableKey: key,
    decisionType: "campaign.manager-offer",
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "entity:campaign",
      key: campaign.id,
      entityId: campaign.id,
    },
    options: [
      {
        key: "accept",
        label: "Accept",
        description: "Take the campaign manager job.",
      },
      {
        key: "decline",
        label: "Decline",
        description: "Turn down the campaign manager job.",
      },
    ],
    considerations: [experience],
    constraints: [],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const accepted = evaluation.selectedOptionKey === "accept";
  let next = world;
  if (accepted)
    next = addCampaignHelper(next, {
      campaignId,
      personId,
      role: "manager",
      pay: offer.salary,
    });
  next = recordWorldEvent(next, {
    stableKey: `${key}:event`,
    type: "campaign.manager-offer-decided",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [campaign.id, campaign.candidatePersonId, personId],
    participants: [
      {
        personId: campaign.candidatePersonId,
        role: "agency:campaign-candidate",
        detail: "Offered a campaign manager job.",
      },
      {
        personId,
        role: "agency:campaign-manager-candidate",
        detail: accepted
          ? "Accepted the campaign manager job."
          : "Declined the campaign manager job.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["campaign:manager-offer"],
    summary: `${world.people[personId]!.givenName ?? "The candidate"} ${accepted ? "accepted" : "declined"} a campaign manager offer.`,
    context: {
      location: null,
      socialContext: "Campaign hiring",
      pressure: null,
      choice: accepted ? "accept" : "decline",
      motivation: null,
      immediateReaction: null,
    },
  });
  if (accepted) {
    const eventId = next.history.events.at(-1)!.id;
    next = createResourceFlow(next, {
      stableKey: `${key}:payroll`,
      source: { kind: "organization", organizationId: campaign.organizationId },
      recipient: { kind: "person", personId },
      startsAt: next.currentDate,
      initialStatus: "active",
      amount: offer.totalCost,
      cadenceKind: "schedule:one-time",
      basisKind: "custom:campaign-expenditure",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:campaign",
      jurisdictionId: campaign.jurisdictionId,
      provenance: { kind: "simulated-event", eventId },
    });
    const payroll = next.history.resourceFlows.at(-1)!;
    next = payRecordedCampaignOperatingBill(next, payroll.id);
  }
  return { world: next, accepted, reasons: [experience.explanation] };
}
