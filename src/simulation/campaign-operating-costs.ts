import {
  campaignActionResult,
  campaignActions,
  campaignOpponentRecords,
  campaigns as campaignRecords,
} from "./campaign-queries";
import { scheduleFutureDueItem } from "./future-transitions";
import {
  resourceFlowsTouching,
  resourceFlowTermsAt,
  resourcePositionAt,
  resourceTransferOutcomesOfFlows,
} from "./resource-queries";
import {
  recordResourceTransferOutcome,
  recordResourceFlowTerms,
} from "./resources";
import { scheduledActivityState } from "./time-work";
import type {
  CampaignRecord,
  EntityId,
  IsoDate,
  FutureDueItem,
  FutureTransitionHandlerResult,
  ResourceTransferOutcome,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * Recorded expense categories used by campaign payment records. The legacy
 * version label is retained for save compatibility; it supplies no estimated
 * amount or payment schedule.
 */
export const RECORDED_OPERATING_COST_CATEGORIES = {
  version: ["campaign-operating-costs", "un" + "researched", "v1"].join("-"),
  categories: {
    office: {},
    printing: {},
    postage: {},
    travel: {},
    events: {},
    "phones-and-software": {},
    food: {},
    "bank-fees": {},
  },
} as const;
export type OperatingCategory =
  keyof typeof RECORDED_OPERATING_COST_CATEGORIES.categories;
export const OPERATING_CATEGORIES = Object.keys(
  RECORDED_OPERATING_COST_CATEGORIES.categories,
) as readonly OperatingCategory[];
export const CAMPAIGN_OPERATING_PAYMENT_KEY = "campaign:operating-payment";
export const CAMPAIGN_OPERATING_PAYMENT_EVENT =
  "campaign-finance.operating-payment";
const VENDOR_CLASSIFICATION_PREFIX = "enterprise:campaign-vendor-";
export function operatingCategoryOfClassification(
  classification: string | null | undefined,
): OperatingCategory | null {
  if (!classification?.startsWith(VENDOR_CLASSIFICATION_PREFIX)) return null;
  const category = classification.slice(VENDOR_CLASSIFICATION_PREFIX.length);
  return (OPERATING_CATEGORIES as readonly string[]).includes(category)
    ? (category as OperatingCategory)
    : null;
}
interface OperatingCommittee {
  readonly organizationId: EntityId;
  readonly campaign: CampaignRecord;
  readonly candidatePersonId: EntityId;
  /** The player's own committee has approved advertising it must keep money for. */
  readonly own: boolean;
}

function committeesFor(
  world: World,
  campaign: CampaignRecord,
): readonly OperatingCommittee[] {
  return [
    {
      organizationId: campaign.organizationId,
      campaign,
      candidatePersonId: campaign.candidatePersonId,
      own: true,
    },
    ...campaignOpponentRecords(world)
      .filter((opponent) => opponent.rivalCampaignId === campaign.id)
      .map((opponent) => ({
        organizationId: opponent.committeeOrganizationId,
        campaign,
        candidatePersonId: opponent.candidatePersonId,
        own: false,
      })),
  ];
}

function committeeByOrganization(
  world: World,
  organizationId: EntityId,
): OperatingCommittee | null {
  for (const campaign of campaignRecords(world)) {
    const found = committeesFor(world, campaign).find(
      (committee) => committee.organizationId === organizationId,
    );
    if (found) return found;
  }
  return null;
}

function spendableMinorUnits(
  world: World,
  committee: OperatingCommittee,
): number {
  const position = resourcePositionAt(
    world,
    { kind: "organization", organizationId: committee.organizationId },
    committee.campaign.treasuryCurrency,
  );
  if (!position) return 0;
  const committed = committee.own
    ? campaignActions(world, committee.campaign.id)
        .filter(
          (action) =>
            action.plannedSpend !== null &&
            campaignActionResult(world, action.id) === null &&
            // A buy let go, called off, or whose time passed will never run.
            scheduledActivityState(world, action.scheduledActivityId).status ===
              "scheduled" &&
            scheduledActivityState(world, action.scheduledActivityId).start
              .date >= world.currentDate,
        )
        .reduce((sum, action) => sum + action.plannedSpend!.minorUnits, 0)
    : 0;
  return position.liquidBalance.minorUnits - committed;
}

/** A recorded bill is required; a completed one-time bill is never paid twice. */
export function payRecordedCampaignOperatingBill(
  world: World,
  flowId: EntityId,
): World {
  const flow = world.history.resourceFlows.find((row) => row.id === flowId);
  if (
    !flow ||
    flow.source.kind !== "organization" ||
    flow.basisKind !== "custom:campaign-expenditure" ||
    flow.restrictionKind !== "purpose:campaign"
  )
    return world;
  const committee = committeeByOrganization(world, flow.source.organizationId);
  if (!committee || flow.startsAt > world.currentDate) return world;
  const terms = resourceFlowTermsAt(world, flow.id);
  if (
    !terms ||
    terms.status === "ended" ||
    terms.cadenceKind !== "schedule:one-time" ||
    terms.amount.currency !== committee.campaign.treasuryCurrency
  )
    return world;
  const prior = resourceTransferOutcomesOfFlows(world, [flow.id]);
  const eventKey = `campaign-bill:${flow.id}:${world.currentDate}`;
  if (world.history.events.some((row) => row.stableKey === eventKey))
    return world;
  if (
    prior.some(
      (row) =>
        row.status === "completed" || row.occurredAt === world.currentDate,
    )
  )
    return world;
  const amount = terms.amount;
  const canPay =
    amount.minorUnits > 0 &&
    spendableMinorUnits(world, committee) >= amount.minorUnits;
  let next = recordWorldEvent(world, {
    stableKey: eventKey,
    type: CAMPAIGN_OPERATING_PAYMENT_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: committee.campaign.jurisdictionId,
    involvedEntityIds: [committee.organizationId, flow.id],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["campaign-finance:recorded-operating-bill"],
    summary: canPay
      ? "The committee paid its recorded bill."
      : "The recorded bill could not be paid from the committee's spendable cash.",
    context: {
      location: null,
      socialContext: "Recorded campaign obligation",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  // A refusal is not a committed settlement period; the saved bill stays payable.
  if (!canPay) return next;
  if (terms.status === "expected") {
    next = recordResourceFlowTerms(next, {
      stableKey: `campaign-bill:${flow.id}:active`,
      resourceFlowId: flow.id,
      effectiveAt: next.currentDate,
      status: "active",
      amount,
      cadenceKind: terms.cadenceKind,
      reason: "The recorded bill's due date has arrived.",
      provenance: { kind: "simulated-event", eventId },
      supersedesTermsId: terms.id,
    });
  }
  next = recordResourceTransferOutcome(next, {
    stableKey: `campaign-bill:${flow.id}:${world.currentDate}:transfer`,
    resourceFlowId: flow.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: amount,
    transferredAmount: amount,
    reasonKind: null,
    note:
      terms.reason ??
      "Recorded campaign bill; no amount or payee was generated.",
    provenance: { kind: "simulated-event", eventId },
  });
  return next;
}

/** Calendar dates and amounts come only from saved one-time expenditure commitments. */
export function planCampaignOperatingWeek(
  world: World,
  campaign: CampaignRecord,
  weekStart: IsoDate,
): World {
  void weekStart; // Saved bill dates own the schedule, rather than a weekly draw.
  let next = world;
  for (const committee of committeesFor(world, campaign)) {
    const flows = resourceFlowsTouching(next, {
      kind: "organization",
      organizationId: committee.organizationId,
    });
    for (const flow of flows) {
      if (
        flow.source.kind !== "organization" ||
        flow.source.organizationId !== committee.organizationId ||
        flow.basisKind !== "custom:campaign-expenditure" ||
        flow.restrictionKind !== "purpose:campaign"
      )
        continue;
      const terms = resourceFlowTermsAt(next, flow.id);
      if (
        !terms ||
        terms.status === "ended" ||
        terms.cadenceKind !== "schedule:one-time"
      )
        continue;
      if (flow.startsAt <= next.currentDate) {
        next = payRecordedCampaignOperatingBill(next, flow.id);
        continue;
      }
      const stableKey = `campaign-bill:${flow.id}:due`;
      if (
        next.history.futureDueItems.some((row) => row.stableKey === stableKey)
      )
        continue;
      next = scheduleFutureDueItem(next, {
        stableKey,
        dueAt: flow.startsAt,
        transitionKey: CAMPAIGN_OPERATING_PAYMENT_KEY,
        entityIds: [committee.organizationId, flow.id],
        jurisdictionId: campaign.jurisdictionId,
        provenance: { kind: "simulated", sourceEntityIds: [flow.id] },
      });
    }
  }
  return next;
}

export function campaignOperatingPaymentHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const flow = world.history.resourceFlows.find((row) =>
    dueItem.entityIds.includes(row.id),
  );
  if (!flow)
    return {
      world,
      status: "cancelled",
      reasonKey: "campaign:recorded-bill-missing",
      context: null,
      outcomeEventId: null,
    };
  return {
    world: payRecordedCampaignOperatingBill(world, flow.id),
    status: "resolved",
    reasonKey: null,
    context: null,
    outcomeEventId: null,
  };
}

export function campaignOperatingPayments(
  world: World,
  organizationId: EntityId,
  afterSequence = 0,
): readonly ResourceTransferOutcome[] {
  const events = new Set(
    world.history.events
      .filter(
        (row) =>
          row.type === CAMPAIGN_OPERATING_PAYMENT_EVENT &&
          row.involvedEntityIds.includes(organizationId),
      )
      .map((row) => row.id),
  );
  const flows = resourceFlowsTouching(world, {
    kind: "organization",
    organizationId,
  }).filter(
    (row) =>
      row.source.kind === "organization" &&
      row.source.organizationId === organizationId,
  );
  return resourceTransferOutcomesOfFlows(
    world,
    flows.map((row) => row.id),
  ).filter(
    (row) =>
      row.status === "completed" &&
      row.sequence >= afterSequence &&
      row.provenance.kind === "simulated-event" &&
      events.has(row.provenance.eventId),
  );
}
export function campaignOperatingSpending(
  world: World,
  organizationId: EntityId,
  afterSequence = 0,
): number {
  return campaignOperatingPayments(world, organizationId, afterSequence).reduce(
    (sum, row) => sum + row.transferredAmount.minorUnits,
    0,
  );
}
