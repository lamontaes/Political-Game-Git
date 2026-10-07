import unitPriceResearch from "../../data/research/campaign-reality/campaign-unit-prices.json" with { type: "json" };
import placePopulations from "../../data/research/money/place-population-acs-2024.json" with { type: "json" };
import {
  campaignActionResult,
  campaignActions,
  campaignOpponentRecords,
  campaigns as campaignRecords,
} from "./campaign-queries";
import { scheduleFutureDueItem } from "./future-transitions";
import { requireCampaign } from "./campaign-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  resourceFlowsTouching,
  resourceFlowTermsAt,
  resourcePositionAt,
  resourceTransferOutcomesOfFlows,
} from "./resource-queries";
import {
  recordResourceTransferOutcome,
  recordResourceFlowTerms,
  createResourceFlow,
} from "./resources";
import { scheduledActivityState } from "./time-work";
import type {
  CampaignRecord,
  CampaignPurchaseRecord,
  EntityId,
  IsoDate,
  FutureDueItem,
  FutureTransitionHandlerResult,
  ResourceTransferOutcome,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * Recorded expenditure classes used to classify saved campaign bills. Amounts,
 * payees, and due dates come from each bill rather than from estimated costs.
 */
export const OPERATING_COST_CATEGORIES = {
  office: {},
  printing: {},
  postage: {},
  travel: {},
  events: {},
  "phones-and-software": {},
  food: {},
  "bank-fees": {},
} as const;
export type OperatingCategory = keyof typeof OPERATING_COST_CATEGORIES;
export const OPERATING_CATEGORIES = Object.keys(
  OPERATING_COST_CATEGORIES,
) as readonly OperatingCategory[];

export const CAMPAIGN_UNIT_PRICES = unitPriceResearch.prices;
export type CampaignPurchaseKind = keyof typeof CAMPAIGN_UNIT_PRICES;
export interface CampaignPlaceCounts {
  readonly households: number;
  readonly basis: "census-population-estimate" | "recorded-world-households";
  readonly estimated: true;
}

/** Uses place population where the Census place table covers it; otherwise
 * counts recorded households in this world. No household is created here.
 */
export function campaignPlaceCounts(
  world: World,
  campaignId: EntityId,
): CampaignPlaceCounts {
  const campaign = requireCampaign(world, campaignId);
  const place = lifePlaceByJurisdictionId(campaign.jurisdictionId);
  const geoid = place?.sourceGeoid;
  const population = geoid
    ? (placePopulations.places as Record<string, number>)[geoid]
    : undefined;
  if (population !== undefined)
    return {
      households: Math.max(1, Math.ceil(population / 2.5)),
      basis: "census-population-estimate",
      estimated: true,
    };
  const currentLocations = new Map<
    string,
    { date: string; jurisdictionId: EntityId }
  >();
  for (const row of world.history.householdLocations) {
    if (row.effectiveAt > world.currentDate) continue;
    const prior = currentLocations.get(row.householdId);
    if (!prior || row.effectiveAt > prior.date)
      currentLocations.set(row.householdId, {
        date: row.effectiveAt,
        jurisdictionId: row.jurisdictionId,
      });
  }
  const households = [...currentLocations.values()].filter(
    (row) => row.jurisdictionId === campaign.jurisdictionId,
  ).length;
  return { households, basis: "recorded-world-households", estimated: true };
}

export function campaignPurchases(
  world: World,
  campaignId: EntityId,
): readonly CampaignPurchaseRecord[] {
  requireCampaign(world, campaignId);
  return (world.history.campaignPurchases ?? []).filter(
    (row) => row.campaignId === campaignId,
  );
}

export function quoteCampaignPurchase(
  item: CampaignPurchaseKind,
  units: number,
): {
  readonly item: CampaignPurchaseKind;
  readonly units: number;
  readonly unitPriceMinorUnits: number;
  readonly totalMinorUnits: number;
  readonly estimated: boolean;
  readonly derivation: string;
} {
  if (!Number.isSafeInteger(units) || units <= 0)
    throw new Error(
      "A campaign purchase needs a positive whole number of units.",
    );
  const price = CAMPAIGN_UNIT_PRICES[item];
  return {
    item,
    units,
    unitPriceMinorUnits: price.priceMinorUnits,
    totalMinorUnits: price.priceMinorUnits * units,
    estimated: price.estimated,
    derivation: price.derivation,
  };
}

/** Suggested quantities scale with the place. These are estimates, not a campaign target. */
export function suggestedCampaignUnits(
  item: CampaignPurchaseKind,
  households: number,
): number {
  if (!Number.isSafeInteger(households) || households < 0)
    throw new Error("Households must be a non-negative whole number.");
  if (item === "yard-sign") return Math.max(1, Math.ceil(households / 10));
  if (item === "palm-card" || item === "postage")
    return Math.max(1, households);
  return 1;
}

export function buyCampaignUnits(
  world: World,
  input: {
    readonly campaignId: EntityId;
    readonly item: CampaignPurchaseKind;
    readonly units: number;
  },
): World {
  const campaign = requireCampaign(world, input.campaignId);
  const quote = quoteCampaignPurchase(input.item, input.units);
  const ordinal =
    (world.history.campaignPurchases ?? []).filter(
      (row) => row.campaignId === campaign.id && row.item === input.item,
    ).length + 1;
  const eventWorld = recordWorldEvent(world, {
    stableKey: `${campaign.stableKey}:purchase:${input.item}:${ordinal}`,
    type: "campaign.operating-unit-purchase",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      campaign.id,
      campaign.organizationId,
      campaign.advertisingVendorOrganizationId,
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["campaign:operating-purchase"],
    summary: `The campaign purchased ${quote.units} ${CAMPAIGN_UNIT_PRICES[input.item].unit}${quote.units === 1 ? "" : "s"}.`,
    context: {
      location: null,
      socialContext: "Campaign purchase",
      pressure: null,
      choice: input.item,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = eventWorld.history.events.at(-1)!.id;
  let next = createResourceFlow(eventWorld, {
    stableKey: `${campaign.stableKey}:purchase-flow:${input.item}:${ordinal}`,
    source: { kind: "organization", organizationId: campaign.organizationId },
    recipient: {
      kind: "organization",
      organizationId: campaign.advertisingVendorOrganizationId,
    },
    startsAt: world.currentDate,
    initialStatus: "active",
    amount: {
      minorUnits: quote.totalMinorUnits,
      currency: campaign.treasuryCurrency,
    },
    cadenceKind: "schedule:one-time",
    basisKind: "custom:campaign-expenditure",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId: campaign.jurisdictionId,
    provenance: { kind: "simulated-event", eventId },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  const outcomesBefore = next.history.resourceTransferOutcomes.length;
  next = payRecordedCampaignOperatingBill(next, flow.id);
  if (next.history.resourceTransferOutcomes.length === outcomesBefore)
    throw new Error("The campaign treasury cannot cover this purchase.");
  const purchase: CampaignPurchaseRecord = {
    id: flow.id,
    campaignId: campaign.id,
    purchasedOn: world.currentDate,
    item: input.item,
    units: quote.units,
    unitPriceMinorUnits: quote.unitPriceMinorUnits,
    totalMinorUnits: quote.totalMinorUnits,
    flowId: flow.id,
  };
  return {
    ...next,
    history: {
      ...next.history,
      campaignPurchases: [...(next.history.campaignPurchases ?? []), purchase],
    },
  };
}
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
