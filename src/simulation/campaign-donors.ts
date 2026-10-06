import limitResearch from "../../data/research/campaign-reality/campaign-contribution-limits.json" with { type: "json" };
import { peopleKnownTo, viewOfOfficial } from "./living-world/official-views";
import { campaignState, requireCampaign } from "./campaign-queries";
import { campaignCompliancePackFor } from "./campaign-compliance";
import { createStableId } from "./ids";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import {
  activeOrganizationParticipationsAt,
  kinshipRelationshipsAt,
} from "./life-queries";
import { homePartyChapters } from "./living-world/party-chapters";
import { resourcePositionAt } from "./resource-queries";
import { createResourceFlow, recordResourceTransferOutcome } from "./resources";
import { recordWorldEvent } from "./world";
import type {
  CampaignAsk,
  DecisionConsideration,
  EntityId,
  World,
} from "./types";

/** Universal fallback until local limits are compiled; deliberately nonzero. */
export const ESTIMATED_CAMPAIGN_CONTRIBUTION_LIMIT = {
  minorUnits: limitResearch.fallback.amountMinorUnits,
  currency: limitResearch.currency,
  estimated: limitResearch.fallback.estimated,
  basis: limitResearch.fallback.basis,
  source: limitResearch.fallback.source,
} as const;

export interface CampaignContributionLimit {
  readonly minorUnits: number;
  readonly estimated: boolean;
  readonly reason: string;
}

export function assessCampaignContribution(
  world: World,
  campaignId: EntityId,
): CampaignContributionLimit {
  const pack = campaignCompliancePackFor(world, campaignId);
  const value = pack?.contributionLimitMinorUnits;
  if (value?.state === "KNOWN")
    return {
      minorUnits: value.value,
      estimated: false,
      reason: "Recorded state contribution limit.",
    };
  if (value?.state === "NO_REQUIREMENT_FOUND")
    return {
      minorUnits: Number.MAX_SAFE_INTEGER,
      estimated: false,
      reason: "The recorded pack found no contribution limit.",
    };
  return {
    minorUnits: ESTIMATED_CAMPAIGN_CONTRIBUTION_LIMIT.minorUnits,
    estimated: true,
    reason:
      "Estimated from similar states because this place has no accepted contribution-limit pack.",
  };
}

export function campaignDonorCandidates(
  world: World,
  campaignId: EntityId,
): readonly EntityId[] {
  const campaign = requireCampaign(world, campaignId);
  const candidates = new Set(peopleKnownTo(world, campaign.candidatePersonId));
  for (const chapter of homePartyChapters(world)) {
    for (const row of world.history.organizationParticipations) {
      if (row.organizationId !== chapter.organizationId) continue;
      if (
        activeOrganizationParticipationsAt(world, row.personId).some(
          (active) => active.participation.id === row.id,
        )
      )
        candidates.add(row.personId);
    }
  }
  return [...candidates]
    .filter((personId) => personId !== campaign.candidatePersonId)
    .sort();
}

export function campaignAsks(
  world: World,
  campaignId: EntityId,
): readonly CampaignAsk[] {
  const campaign = requireCampaign(world, campaignId);
  return (world.history.campaignAsks ?? []).filter(
    (ask) => ask.candidateId === campaign.candidatePersonId,
  );
}

export interface AskCampaignDonorResult {
  readonly world: World;
  readonly ask: CampaignAsk;
  readonly reasons: readonly string[];
  readonly meansMinorUnits: number | null;
  readonly limit: CampaignContributionLimit;
  readonly view: string;
}

export function askCampaignDonor(
  world: World,
  input: { campaignId: EntityId; personId: EntityId; amountMinorUnits: number },
): AskCampaignDonorResult {
  const campaign = requireCampaign(world, input.campaignId);
  if (campaignState(world, campaign.id).status !== "active")
    throw new Error("A finished campaign cannot ask for contributions.");
  if (!campaignDonorCandidates(world, campaign.id).includes(input.personId))
    throw new Error("Campaigns can ask only people the candidate knows.");
  if (
    !Number.isSafeInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0
  )
    throw new Error("A contribution ask must be a positive amount.");
  const key = `${campaign.stableKey}:donor-ask:${input.personId}:${(world.history.campaignAsks ?? []).filter((ask) => ask.candidateId === campaign.candidatePersonId && ask.residentId === input.personId).length + 1}`;
  const view = viewOfOfficial(
    world,
    input.personId,
    campaign.candidatePersonId,
  );
  const cash = resourcePositionAt(
    world,
    { kind: "person", personId: input.personId },
    campaign.treasuryCurrency,
  );
  const limit = assessCampaignContribution(world, campaign.id);
  const priorGifts = (world.history.campaignAsks ?? [])
    .filter(
      (row) =>
        row.residentId === input.personId &&
        row.candidateId === campaign.candidatePersonId &&
        row.outcome === "gave",
    )
    .reduce((total, row) => total + row.amountMinorUnits, 0);
  const affordable = Math.min(
    input.amountMinorUnits,
    cash?.liquidBalance.minorUnits ?? 0,
    Math.max(0, limit.minorUnits - priorGifts),
  );
  const considerations: DecisionConsideration[] = [];
  if (view.belief)
    considerations.push({
      stableKey: `${key}:view`,
      optionKey: view.belief.position === "support" ? "give" : "decline",
      sourceType: "mind:political-belief" as const,
      direction: "supports" as const,
      importance:
        view.belief.salience === "central"
          ? ("decisive" as const)
          : view.belief.salience === "high"
            ? ("strong" as const)
            : ("moderate" as const),
      confidence: "high" as const,
      explanation:
        view.belief.position === "support"
          ? "They hold a favorable view of the candidate."
          : "They oppose the candidate.",
      sourceRefs: [
        { kind: "private-belief" as const, beliefId: view.belief.id },
      ],
    });
  if (affordable <= 0)
    considerations.push({
      stableKey: `${key}:insufficient-means`,
      optionKey: "decline",
      sourceType: "context:recorded-means",
      direction: "supports",
      importance: "strong",
      confidence: cash ? "high" : "medium",
      explanation: !cash
        ? "No personal funds are recorded for them."
        : priorGifts >= limit.minorUnits
          ? "They have reached the campaign contribution limit for this race."
          : "Their recorded available money cannot cover this ask.",
      sourceRefs: [],
    });
  if (affordable > 0)
    considerations.push({
      stableKey: `${key}:means`,
      optionKey: "give",
      sourceType: "context:recorded-means",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation:
        "Their recorded available money can cover the requested contribution.",
      sourceRefs: [],
    });
  const family = kinshipRelationshipsAt(world, input.personId).some((row) =>
    row.personIds.includes(campaign.candidatePersonId),
  );
  if (family)
    considerations.push({
      stableKey: `${key}:family`,
      optionKey: "give",
      sourceType: "context:family-relationship" as const,
      direction: "supports" as const,
      importance: "strong" as const,
      confidence: "high" as const,
      explanation: "They are family.",
      sourceRefs: [],
    });
  const evaluation = evaluateDecision(world, {
    stableKey: key,
    decisionType: "campaign.donor-ask",
    actorPersonId: input.personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:campaign",
      key: campaign.id,
      entityId: campaign.organizationId,
    },
    options: [
      {
        key: "give",
        label: `Give $${(affordable / 100).toFixed(2)}`,
        description:
          affordable > 0
            ? `Contribute $${(affordable / 100).toFixed(2)}, within their recorded means and the remaining contribution limit.`
            : "Contribute to the campaign if their means and limit permit.",
      },
      { key: "decline", label: "Decline", description: "Keep the money." },
    ],
    constraints:
      affordable > 0
        ? []
        : [
            {
              stableKey: `${key}:means-limit`,
              optionKey: "give",
              kind: "campaign:contribution-limit",
              explanation: cash
                ? "Their recorded available means or remaining legal limit cannot cover this ask."
                : "No personal funds are recorded for this person.",
              sourceRefs: [],
            },
          ],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const gave = evaluation.selectedOptionKey === "give" && affordable > 0;
  const amount = gave ? affordable : 0;
  const id = createStableId("event", `${world.id}:${key}`);
  const ask: CampaignAsk = {
    id,
    candidateId: campaign.candidatePersonId,
    residentId: input.personId,
    askedOn: world.currentDate,
    amountMinorUnits: amount,
    outcome: gave ? "gave" : "declined",
    reasonBeliefId: view.belief?.id ?? null,
  };
  const traced = recordDurableDecisionTrace(world, evaluation);
  let next = recordWorldEvent(traced, {
    stableKey: `${key}:event`,
    type: "campaign.donor-ask-decided",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      campaign.id,
      campaign.candidatePersonId,
      input.personId,
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["campaign:individual-ask"],
    summary: gave
      ? "A named supporter contributed to a campaign after an individual ask."
      : "A named person declined or could not meet an individual campaign ask.",
    context: {
      location: null,
      socialContext: "Campaign fundraising ask",
      pressure: null,
      choice: gave ? "give" : "decline",
      motivation: null,
      immediateReaction: null,
    },
  });
  next = {
    ...next,
    history: {
      ...next.history,
      campaignAsks: [...(next.history.campaignAsks ?? []), ask],
    },
  };
  if (gave) {
    const eventId = next.history.events.at(-1)!.id;
    next = createResourceFlow(next, {
      stableKey: `${key}:flow`,
      source: { kind: "person", personId: input.personId },
      recipient: {
        kind: "organization",
        organizationId: campaign.organizationId,
      },
      startsAt: next.currentDate,
      initialStatus: "active",
      amount: { minorUnits: amount, currency: campaign.treasuryCurrency },
      cadenceKind: "schedule:one-time",
      basisKind: "support:campaign-contribution",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:campaign",
      jurisdictionId: campaign.jurisdictionId,
      provenance: { kind: "simulated-event", eventId },
    });
    const flow = next.history.resourceFlows.at(-1)!;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${key}:transfer`,
      resourceFlowId: flow.id,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      status: "completed",
      attemptedAmount: {
        minorUnits: amount,
        currency: campaign.treasuryCurrency,
      },
      transferredAmount: {
        minorUnits: amount,
        currency: campaign.treasuryCurrency,
      },
      reasonKind: null,
      note: "Named contribution after an individual campaign ask.",
      provenance: { kind: "simulated-event", eventId },
    });
  }
  return {
    world: next,
    ask,
    reasons: considerations
      .filter((row) => row.optionKey === (gave ? "give" : "decline"))
      .map((row) => row.explanation),
    meansMinorUnits: cash?.liquidBalance.minorUnits ?? null,
    limit,
    view: view.belief?.position ?? "No recorded view",
  };
}

/** Process the remaining known people in stable person-id order during call time. */
export function runCampaignCallTime(world: World, campaignId: EntityId): World {
  const asked = new Set(
    campaignAsks(world, campaignId).map((row) => row.residentId),
  );
  let next = world;
  for (const personId of [
    ...campaignDonorCandidates(world, campaignId),
  ].sort()) {
    if (asked.has(personId)) continue;
    next = askCampaignDonor(next, {
      campaignId,
      personId,
      amountMinorUnits: 10_000,
    }).world;
  }
  return next;
}
