import {
  activeCampaignForCandidate,
  campaignState,
  campaigns,
} from "./campaign-queries";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { campaignFundraiserPayments } from "./campaign-money-source-queries";
import { viewOfOfficial } from "./official-view-reads";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { positionOwnerEndpoint, resourcePositionAt } from "./resource-queries";
import { createResourceFlow, recordResourceTransferOutcome } from "./resources";
import type { CurrencyCode, EntityId, MoneyAmount, World } from "./types";
import { recordWorldEvent } from "./world";
import leftoverFundsRules from "../../data/research/campaign-reality/leftover-funds-rules.json";
import { lifePlaceByJurisdictionId } from "./life-places";
import { electionContestResult } from "./election-contests";

/**
 * Where a campaign's money can come from.
 *
 * Before this a committee had one source: fundraising afternoons drawing on
 * an aggregate pool of supporters. Real campaigns are also paid for by the
 * candidate's own money, loans, party committees, public financing programs
 * and leftover money from an earlier race, each with its own limits and
 * reporting rules. The research is filed as `how-a-campaign-can-be-paid-for`.
 *
 * Each source is listed here with whether the game has built it. A source not
 * yet built is simply not offered: nobody can use it, and nothing pretends
 * it happened.
 */
export const CAMPAIGN_MONEY_SOURCES = {
  fundraising: {
    status: "built",
    note: "Fundraising afternoons and small fundraisers, from supporters.",
  },
  "own-money": {
    status: "built",
    note: "The candidate puts personal money into their own committee.",
  },
  "candidate-loan": {
    status: "unbuilt",
    note: "The candidate lends money to the committee, to be repaid.",
  },
  "party-committee": {
    status: "unbuilt",
    note: "A party committee gives money or spends in coordination.",
  },
  "public-financing": {
    status: "unbuilt",
    note: "A state or city program matches small contributions, with a spending cap.",
  },
  "bank-loan": {
    status: "unbuilt",
    note: "A bank lends the committee money.",
  },
  "leftover-funds": {
    status: "built",
    note: "Money left from the candidate's earlier campaign carries over.",
  },
  "outside-spending": {
    status: "unbuilt",
    note: "Groups the campaign does not control spend on its behalf.",
  },
} as const;

export type CampaignMoneySource = keyof typeof CAMPAIGN_MONEY_SOURCES;

export type LeftoverFundUse =
  | "keep-for-future-race"
  | "refund-donors"
  | "give-to-charity"
  | "give-to-party/candidate";

export interface LeftoverFundsRule {
  readonly jurisdiction: string;
  readonly allowedUses: readonly LeftoverFundUse[];
  readonly source?: string;
  readonly estimatedFrom?: string;
}

/** Every jurisdiction has an explicit rule; estimates remain labeled as such. */
export function leftoverFundsRuleForState(
  stateJurisdictionKey: string,
): LeftoverFundsRule | null {
  const key = stateJurisdictionKey.replace(/^US-/, "");
  return (
    (leftoverFundsRules.rules as readonly LeftoverFundsRule[]).find(
      (rule) => rule.jurisdiction === key,
    ) ?? null
  );
}

/**
 * A read of the recorded committee account after an election. Closing a race
 * never moves or spends this balance; only an explicit later transfer does.
 */
export function leftoverCampaignBalance(
  world: World,
  campaignId: EntityId,
): MoneyAmount | null {
  const campaign = campaigns(world).find((row) => row.id === campaignId);
  if (
    !campaign ||
    !["won", "lost"].includes(campaignState(world, campaign.id).status)
  )
    return null;
  return (
    resourcePositionAt(
      world,
      { kind: "organization", organizationId: campaign.organizationId },
      campaign.treasuryCurrency,
    )?.liquidBalance ?? null
  );
}

/** Transfer a closed committee's balance only when the player explicitly opts in. */
export function carryForwardLeftoverFunds(
  world: World,
  fromCampaignId: EntityId,
  toCampaignId: EntityId,
): World {
  const from = campaigns(world).find((row) => row.id === fromCampaignId);
  const to = campaigns(world).find((row) => row.id === toCampaignId);
  if (
    !from ||
    !to ||
    from.id === to.id ||
    from.candidatePersonId !== to.candidatePersonId
  )
    throw new Error(
      "Leftover campaign funds can move only between races run by the same candidate.",
    );
  if (!["won", "lost"].includes(campaignState(world, from.id).status))
    throw new Error(
      "Leftover campaign funds are available only after an election.",
    );
  if (campaignState(world, to.id).status !== "active")
    throw new Error(
      "Leftover campaign funds need an active receiving campaign.",
    );
  if (from.treasuryCurrency !== to.treasuryCurrency)
    throw new Error(
      "Campaign accounts with different currencies cannot be combined.",
    );
  const sourcePlace = lifePlaceByJurisdictionId(
    from.jurisdictionId,
  )?.stateJurisdictionKey;
  const rule = sourcePlace ? leftoverFundsRuleForState(sourcePlace) : null;
  if (!rule?.allowedUses.includes("keep-for-future-race"))
    throw new Error(
      "This campaign's recorded rules do not allow keeping funds for a future race.",
    );
  const balance = leftoverCampaignBalance(world, from.id);
  if (!balance || balance.minorUnits <= 0) return world;
  const result = electionContestResult(world, from.contestId);
  if (!result)
    throw new Error("The completed campaign has no election result.");
  const stableKey = `campaign:${from.id}:leftover-to:${to.id}`;
  let next = createResourceFlow(world, {
    stableKey: `${stableKey}:flow`,
    source: { kind: "organization", organizationId: from.organizationId },
    recipient: positionOwnerEndpoint({
      kind: "organization",
      organizationId: to.organizationId,
    }),
    startsAt: world.currentDate,
    initialStatus: "active",
    amount: balance,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:campaign-leftover-funds",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId: to.jurisdictionId,
    provenance: { kind: "simulated-event", eventId: result.outcomeEventId },
  });
  next = recordResourceTransferOutcome(next, {
    stableKey: `${stableKey}:transfer`,
    resourceFlowId: next.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: balance,
    transferredAmount: balance,
    reasonKind: null,
    note: "The candidate chose to keep the remaining committee funds for a later race.",
    provenance: { kind: "simulated-event", eventId: result.outcomeEventId },
  });
  return next;
}

/** Read receipts attributed to this event; never settle a completed gift again.
 * The current activity producers save attendance but no dated monetary ask or
 * contribution-cap law binding. Record that missing basis through the shared
 * evaluator instead of manufacturing a donor, ask, pledge, or payment.
 */
export function recordCampaignFundraiserReceipts(
  world: World,
  input: {
    readonly eventId: EntityId;
    readonly committeeOrganizationId: EntityId;
    readonly candidatePersonId: EntityId;
    readonly currency: CurrencyCode;
  },
): {
  readonly world: World;
  readonly resourceFlowId: EntityId | null;
  readonly resourceOutcomeId: EntityId | null;
  readonly raisedAmount: MoneyAmount | null;
  readonly unavailableBasis: readonly string[];
  readonly note: string;
} {
  const { event, flows, receipts } = campaignFundraiserPayments(world, input);
  const unavailableBasis = ["monetary-ask", "contribution-cap-law-term"];
  let next = world;
  const paidSources = new Set(
    flows
      .filter((flow) => receipts.some((row) => row.resourceFlowId === flow.id))
      .flatMap((flow) =>
        flow.source.kind === "person" ? [flow.source.personId] : [],
      ),
  );
  const attendees = [...new Set(event.participants.map((row) => row.personId))];
  for (const personId of attendees) {
    if (
      personId === input.candidatePersonId ||
      paidSources.has(personId) ||
      (next.control.kind === "person" && next.control.personId === personId)
    )
      continue;
    const stableKey = `campaign-fundraiser:${event.id}:${personId}`;
    if (
      next.history.decisionTraces.some(
        (trace) => trace.context.stableKey === stableKey,
      )
    )
      continue;
    const view = viewOfOfficial(next, personId, input.candidatePersonId);
    const cash = resourcePositionAt(
      next,
      { kind: "person", personId },
      input.currency,
      {
        asOfDate: event.occurredAt,
        historySequenceExclusive: event.sequence + 1,
      },
    );
    const evaluation = evaluateDecision(next, {
      stableKey,
      decisionType: "campaign.fundraiser-contribution",
      actorPersonId: personId,
      cutoff: {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      },
      subject: {
        kind: "context:campaign",
        key: "fundraiser-contribution",
        entityId: input.committeeOrganizationId,
      },
      options: [
        {
          key: "give",
          label: "Give",
          description: "Pay a recorded fundraising ask.",
        },
        {
          key: "not-attempted",
          label: "No payment attempted",
          description: "Report the unavailable payment basis.",
        },
      ],
      constraints: [
        {
          stableKey: `${stableKey}:unavailable-basis`,
          optionKey: "give",
          kind: "campaign:unavailable-contribution-basis",
          explanation: `The dated fundraiser has no admitted monetary ask or contribution-cap law term. ${cash ? `Recorded cash at the event: ${cash.liquidBalance.minorUnits} ${input.currency} minor units.` : "Cash at the event is not recorded."} ${view.belief ? `The attendee's saved candidate view is ${view.belief.position}; it is not an authorization to pay.` : "No saved candidate view is recorded."}`,
          sourceRefs: [
            { kind: "historical-event", eventId: event.id },
            ...(view.belief
              ? [{ kind: "private-belief" as const, beliefId: view.belief.id }]
              : []),
          ],
        },
      ],
      considerations: [],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
  }
  return {
    world: next,
    resourceFlowId: receipts[0]?.resourceFlowId ?? null,
    resourceOutcomeId: receipts[0]?.id ?? null,
    raisedAmount:
      receipts.length > 0
        ? {
            minorUnits: receipts.reduce(
              (sum, row) => sum + row.transferredAmount.minorUnits,
              0,
            ),
            currency: input.currency,
          }
        : null,
    unavailableBasis,
    note: "Completed gifts are reported from the recorded payments. New gifts need a recorded monetary ask and applicable contribution-cap law term; no payment was invented.",
  };
}

/**
 * UNRESEARCHED. How much of their own money a candidate may put into their
 * committee. Federal law sets no limit on a candidate's own money, and this
 * blanket rule follows it everywhere until the per-state answer to
 * `how-a-campaign-can-be-paid-for` lands: the only limit is what the
 * candidate actually has.
 */
export const UNRESEARCHED_OWN_MONEY_RULE = {
  version: "campaign-own-money-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  limitMinorUnits: null,
} as const;

export const CANDIDATE_OWN_MONEY_EVENT = "campaign-finance.candidate-own-money";

/**
 * What the candidate has in their own account, in the committee's currency,
 * or null when the game is not tracking this person's money at all. Unknown
 * is not zero: a life with no recorded money cannot spend any, and the screen
 * says so rather than showing $0. Read-only.
 */
export function candidatePersonalBalance(
  world: World,
  personId: EntityId,
): number | null {
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign) return null;
  const owner = { kind: "person" as const, personId };
  const tracked =
    world.history.resourcePositions.some(
      (position) =>
        position.owner.kind === "person" &&
        position.owner.personId === personId,
    ) ||
    world.history.resourceFlows.some(
      (flow) =>
        (flow.source.kind === "person" && flow.source.personId === personId) ||
        (flow.recipient.kind === "person" &&
          flow.recipient.personId === personId),
    );
  if (!tracked) return null;
  // Recorded money with no account yet still adds up; reading it opens
  // nothing in the saved world.
  const read = ensureLifePathPersonalPosition(
    world,
    personId,
    campaign.treasuryCurrency,
  );
  return (
    resourcePositionAt(read, owner, campaign.treasuryCurrency)?.liquidBalance
      .minorUnits ?? 0
  );
}

/**
 * The candidate moves personal money into their committee. It is a public
 * act: the contribution is on the record, and a reader can see how much of
 * the campaign the candidate paid for.
 */
export function contributeOwnMoneyToCampaign(
  world: World,
  personId: EntityId,
  amountMinorUnits: number,
): World {
  const campaign = activeCampaignForCandidate(world, personId);
  if (!campaign) throw new Error("There is no campaign to put money into.");
  if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits <= 0) {
    throw new Error("The amount has to be more than nothing.");
  }
  let next = ensureLifePathPersonalPosition(
    world,
    personId,
    campaign.treasuryCurrency,
  );
  const have = candidatePersonalBalance(world, personId);
  if (have === null) {
    throw new Error("None of your own money can go into the campaign yet.");
  }
  if (have < amountMinorUnits) {
    throw new Error("You do not have that much of your own money.");
  }
  const amount = {
    minorUnits: amountMinorUnits,
    currency: campaign.treasuryCurrency,
  };
  const ordinal = next.history.events.filter(
    (event) =>
      event.type === CANDIDATE_OWN_MONEY_EVENT &&
      event.involvedEntityIds.includes(campaign.organizationId),
  ).length;
  const stableKey = `${campaign.stableKey}:own-money:${ordinal}`;
  next = recordWorldEvent(next, {
    stableKey,
    type: CANDIDATE_OWN_MONEY_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [personId, campaign.organizationId].sort(),
    participants: [
      {
        personId,
        role: "agency:candidate",
        detail: "Put their own money into the campaign",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      UNRESEARCHED_OWN_MONEY_RULE.version,
      "campaign-finance:own-money",
      "time-neutral",
    ],
    summary: `The candidate put ${dollars(amountMinorUnits)} of their own money into the campaign.`,
    context: {
      location: null,
      socialContext: "Campaign committee receipt",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = createResourceFlow(next, {
    stableKey: `${stableKey}:flow`,
    source: { kind: "person", personId },
    recipient: positionOwnerEndpoint({
      kind: "organization",
      organizationId: campaign.organizationId,
    }),
    startsAt: next.currentDate,
    initialStatus: "active",
    amount,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:candidate-own-money",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId: campaign.jurisdictionId,
    provenance: { kind: "simulated-event", eventId },
  });
  return recordResourceTransferOutcome(next, {
    stableKey: `${stableKey}:transfer`,
    resourceFlowId: next.history.resourceFlows.at(-1)!.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: "completed",
    attemptedAmount: amount,
    transferredAmount: amount,
    reasonKind: null,
    note: "The candidate's own money, received by the committee.",
    provenance: { kind: "simulated-event", eventId },
  });
}

function dollars(minorUnits: number): string {
  return `$${(minorUnits / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
