import { activeCampaignForCandidate } from "./campaign-queries";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { positionOwnerEndpoint, resourcePositionAt } from "./resource-queries";
import { createResourceFlow, recordResourceTransferOutcome } from "./resources";
import type { EntityId, World } from "./types";
import { recordWorldEvent } from "./world";

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
    status: "unbuilt",
    note: "Money left from the candidate's earlier campaign carries over.",
  },
  "outside-spending": {
    status: "unbuilt",
    note: "Groups the campaign does not control spend on its behalf.",
  },
} as const;

export type CampaignMoneySource = keyof typeof CAMPAIGN_MONEY_SOURCES;

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
    throw new Error(
      "The game is not tracking your own money yet, so none can go in.",
    );
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
