import {
  campaignActionResult,
  campaignActions,
  campaignOpponentRecords,
  campaignResultsFor,
  campaigns as campaignRecords,
  campaignState,
} from "./campaign-queries";
import { addDays } from "./dates";
import {
  electionContestStatus,
  requireElectionContest,
} from "./election-contests";
import { scheduleFutureDueItem } from "./future-transitions";
import { createOrganization } from "./life";
import { positionOwnerEndpoint, resourcePositionAt } from "./resource-queries";
import { createResourceFlow, recordResourceTransferOutcome } from "./resources";
import { SeededRng } from "./rng";
import { scheduledActivityState } from "./time-work";
import type {
  CampaignRecord,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  MoneyAmount,
  OrganizationClassification,
  ResourceTransferOutcome,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * What a campaign committee spends its money on besides advertising.
 *
 * Before this a committee only ever paid for advertising (and, when somebody
 * took it, paid money to the candidate), so a governor's race could end with
 * most of what it raised untouched and a report with two kinds of line on it
 * (Maine playtest, 2026-09-22: $38,380.77 left over). Real committees pay for
 * an office, printing, postage, travel, events, phones and bank fees, on the
 * days the bills come due, and that is what a reporter reads through.
 */

/**
 * UNRESEARCHED. Which kinds of cost a committee pays, how often, and how much
 * of its available money each takes. A game rule, not any jurisdiction's
 * spending categories or any real campaign's budget; filed with the research
 * queue as `campaign-operating-spending`. A researched table replaces this one
 * under a new version, and the version string travels on every payment note so
 * an old save still says which rule wrote its lines.
 */
export const UNRESEARCHED_OPERATING_COSTS = {
  version: "campaign-operating-costs-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  /** How many days in each week a committee pays a bill: from, to inclusive. */
  paymentDaysPerWeek: [2, 4] as const,
  /** Below this much money it can spend, a committee pays nothing that day. */
  minimumSpendableMinorUnits: 5_000,
  /** No payment is smaller than this. */
  minimumPaymentMinorUnits: 1_500,
  /**
   * Each kind of cost: how likely it is to be the day's bill (weight), and
   * the share of the money the committee can spend that it takes, in basis
   * points (from, to inclusive). A bank fee is a flat amount instead.
   */
  categories: {
    office: { weight: 3, shareBasisPoints: [300, 600] },
    printing: { weight: 4, shareBasisPoints: [200, 800] },
    postage: { weight: 3, shareBasisPoints: [200, 600] },
    travel: { weight: 4, shareBasisPoints: [100, 300] },
    events: { weight: 3, shareBasisPoints: [200, 500] },
    "phones-and-software": { weight: 2, shareBasisPoints: [100, 200] },
    food: { weight: 2, shareBasisPoints: [50, 200] },
    "bank-fees": { weight: 1, flatMinorUnits: [500, 3_501] },
  },
} as const;

export type OperatingCategory =
  keyof typeof UNRESEARCHED_OPERATING_COSTS.categories;

export const OPERATING_CATEGORIES = Object.keys(
  UNRESEARCHED_OPERATING_COSTS.categories,
) as readonly OperatingCategory[];

export const CAMPAIGN_OPERATING_PAYMENT_KEY = "campaign:operating-payment";
export const CAMPAIGN_OPERATING_PAYMENT_EVENT =
  "campaign-finance.operating-payment";

const VENDOR_CLASSIFICATION_PREFIX = "enterprise:campaign-vendor-";

/**
 * The payee a committee pays for each kind of cost. PLACEHOLDER names: generic
 * local businesses named after the place, never a real company.
 */
const VENDOR_NAMES: Readonly<
  Record<OperatingCategory, (place: string) => string>
> = {
  office: (place) => `${place} Office Rentals`,
  printing: (place) => `${place} Print and Sign`,
  postage: (place) => `${place} Mailing Services`,
  travel: (place) => `${place} Fuel and Travel`,
  events: (place) => `${place} Event Hall`,
  "phones-and-software": () => "Campaign Phone and Software Services",
  food: (place) => `${place} Catering`,
  "bank-fees": (place) => `${place} Community Bank`,
};

const PAYMENT_NOTES: Readonly<Record<OperatingCategory, string>> = {
  office: "Office rent and utilities",
  printing: "Yard signs, flyers and printed literature",
  postage: "Postage for a mailing to voters",
  travel: "Fuel, lodging and travel for the campaign",
  events: "Room rental and setup for a campaign event",
  "phones-and-software": "Phone lines and campaign software",
  food: "Food for volunteers and an event",
  "bank-fees": "Bank and payment processing fees",
};

/** The kind of cost a payee is paid for, read from its record. Pure. */
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

/**
 * A committee still in the race: its candidate is alive and still on the
 * ballot. A rival who died or left the contest runs up no more bills.
 */
function stillRunning(world: World, committee: OperatingCommittee): boolean {
  if (
    world.history.personDeaths.some(
      (death) => death.personId === committee.candidatePersonId,
    )
  )
    return false;
  return requireElectionContest(
    world,
    committee.campaign.contestId,
  ).candidatePersonIds.includes(committee.candidatePersonId);
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

function paymentKey(organizationId: EntityId, date: IsoDate): string {
  return `campaign-operating:${organizationId}:${date}`;
}

/**
 * Puts the next week's bills on the calendar for the campaign's committee and
 * each committee running against it: a few days in the week, each a day a
 * bill is paid. Which bill and how much is settled on the day, from what the
 * committee has then. Called from the weekly campaign boundary, so a race
 * nobody is running in pays nothing. UNRESEARCHED: the player's committee
 * pays bills only in a week after one in which the candidate did campaign
 * work; filed under `campaign-operating-spending`. Idempotent.
 */
export function planCampaignOperatingWeek(
  world: World,
  campaign: CampaignRecord,
  weekStart: IsoDate,
): World {
  const contest = requireElectionContest(world, campaign.contestId);
  const [fewest, most] = UNRESEARCHED_OPERATING_COSTS.paymentDaysPerWeek;
  let next = world;
  const worked = campaignResultsFor(world, campaign.id).some(
    (result) =>
      result.completedAt >= addDays(weekStart, -7) &&
      result.completedAt < weekStart,
  );
  for (const committee of committeesFor(world, campaign)) {
    // Bills follow the work: a committee whose candidate did no campaign work
    // in the week just ended runs up none. A rival acts every week.
    if (committee.own && !worked) continue;
    if (!stillRunning(world, committee)) continue;
    const rng = new SeededRng(world.seed).fork(
      `campaign-operating-week:${committee.organizationId}:${weekStart}`,
    );
    const days = [1, 2, 3, 4, 5, 6, 7];
    const count = rng.integer(fewest, most + 1);
    const picked: number[] = [];
    while (picked.length < count && days.length > 0) {
      picked.push(days.splice(rng.integer(0, days.length), 1)[0]!);
    }
    for (const offset of picked.sort((a, b) => a - b)) {
      const dueAt = addDays(weekStart, offset);
      if (dueAt <= next.currentDate || dueAt >= contest.electionDate) continue;
      const stableKey = paymentKey(committee.organizationId, dueAt);
      if (
        next.history.futureDueItems.some((item) => item.stableKey === stableKey)
      )
        continue;
      next = scheduleFutureDueItem(next, {
        stableKey,
        dueAt,
        transitionKey: CAMPAIGN_OPERATING_PAYMENT_KEY,
        entityIds: [committee.organizationId],
        jurisdictionId: campaign.jurisdictionId,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [campaign.filingEventId],
        },
      });
    }
  }
  return next;
}

/**
 * What the committee can spend today: its balance less any advertising the
 * candidate has already approved and not yet run, so a bill never leaves an
 * approved buy short.
 */
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

function chooseCategory(rng: SeededRng): OperatingCategory {
  const table = UNRESEARCHED_OPERATING_COSTS.categories;
  const total = OPERATING_CATEGORIES.reduce(
    (sum, category) => sum + table[category].weight,
    0,
  );
  let roll = rng.integer(0, total);
  for (const category of OPERATING_CATEGORIES) {
    roll -= table[category].weight;
    if (roll < 0) return category;
  }
  return OPERATING_CATEGORIES[0]!;
}

function paymentAmount(
  rng: SeededRng,
  category: OperatingCategory,
  spendable: number,
): number {
  const rule = UNRESEARCHED_OPERATING_COSTS.categories[category];
  const raw =
    "flatMinorUnits" in rule
      ? rng.integer(rule.flatMinorUnits[0], rule.flatMinorUnits[1])
      : Math.floor(
          (spendable *
            rng.integer(
              rule.shareBasisPoints[0],
              rule.shareBasisPoints[1] + 1,
            )) /
            10_000,
        );
  return Math.min(
    spendable,
    Math.max(UNRESEARCHED_OPERATING_COSTS.minimumPaymentMinorUnits, raw),
  );
}

function placeName(world: World, committee: OperatingCommittee): string {
  return (
    world.jurisdictions[committee.campaign.jurisdictionId]?.name ?? "Local"
  );
}

function dollars(minorUnits: number): string {
  return `$${(minorUnits / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ensureVendor(
  world: World,
  committee: OperatingCommittee,
  category: OperatingCategory,
): { readonly world: World; readonly vendorId: EntityId } {
  const stableKey = `campaign-vendor:${committee.organizationId}:${category}`;
  const existing = world.history.organizations.find(
    (organization) => organization.stableKey === stableKey,
  );
  if (existing) return { world, vendorId: existing.id };
  const place = placeName(world, committee);
  const next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "A business a campaign committee pays. A placeholder payee, not a real company.",
    },
    initialProfile: {
      name: VENDOR_NAMES[category](place),
      classification:
        `${VENDOR_CLASSIFICATION_PREFIX}${category}` as OrganizationClassification,
      locationJurisdictionId: committee.campaign.jurisdictionId,
    },
  });
  return { world: next, vendorId: next.history.organizations.at(-1)!.id };
}

/**
 * A committee pays one of its bills on the day it falls due. A committee that
 * cannot spend enough pays nothing and says so; the race going on without it
 * is not a failure.
 */
export function campaignOperatingPaymentHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const committee = dueItem.entityIds
    .map((id) => committeeByOrganization(world, id))
    .find((row) => row !== null);
  if (!committee) {
    return {
      world,
      status: "cancelled",
      reasonKey: "campaign:committee-missing",
      context: null,
      outcomeEventId: null,
    };
  }
  const { campaign } = committee;
  if (
    campaignState(world, campaign.id).status !== "active" ||
    electionContestStatus(world, campaign.contestId) !== "pending"
  ) {
    return {
      world,
      status: "cancelled",
      reasonKey: "campaign:race-over",
      context: null,
      outcomeEventId: null,
    };
  }
  if (!stillRunning(world, committee)) {
    return {
      world,
      status: "cancelled",
      reasonKey: "campaign:candidate-left-race",
      context: null,
      outcomeEventId: null,
    };
  }
  const spendable = spendableMinorUnits(world, committee);
  if (spendable < UNRESEARCHED_OPERATING_COSTS.minimumSpendableMinorUnits) {
    return {
      world,
      status: "resolved",
      reasonKey: "campaign:no-money-to-spend",
      context: null,
      outcomeEventId: null,
    };
  }
  const rng = new SeededRng(world.seed).fork(
    `campaign-operating-payment:${dueItem.stableKey}`,
  );
  const category = chooseCategory(rng);
  const amount: MoneyAmount = {
    minorUnits: paymentAmount(rng, category, spendable),
    currency: campaign.treasuryCurrency,
  };
  const vendor = ensureVendor(world, committee, category);
  // The payment is an act on the committee's books, so a complaint or an
  // audit can point at it; the public reads it on the monthly report.
  let next = recordWorldEvent(vendor.world, {
    stableKey: `${dueItem.stableKey}:paid`,
    type: CAMPAIGN_OPERATING_PAYMENT_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [committee.organizationId, vendor.vendorId].sort(),
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      UNRESEARCHED_OPERATING_COSTS.version,
      `campaign-finance:operating-${category}`,
      "time-neutral",
    ],
    summary: `${PAYMENT_NOTES[category]}: ${dollars(amount.minorUnits)} paid to ${VENDOR_NAMES[category](placeName(world, committee))}.`,
    context: {
      location: null,
      socialContext: "Campaign committee bill",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const paidEventId = next.history.events.at(-1)!.id;
  next = createResourceFlow(next, {
    stableKey: `${dueItem.stableKey}:flow`,
    source: { kind: "organization", organizationId: committee.organizationId },
    recipient: positionOwnerEndpoint({
      kind: "organization",
      organizationId: vendor.vendorId,
    }),
    startsAt: world.currentDate,
    initialStatus: "active",
    amount,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:campaign-expenditure",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:campaign",
    jurisdictionId: campaign.jurisdictionId,
    provenance: { kind: "simulated-event", eventId: paidEventId },
  });
  const flowId = next.history.resourceFlows.at(-1)!.id;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${dueItem.stableKey}:transfer`,
    resourceFlowId: flowId,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: "completed",
    attemptedAmount: amount,
    transferredAmount: amount,
    reasonKind: null,
    note: `${PAYMENT_NOTES[category]}, paid out of the committee's own account (${UNRESEARCHED_OPERATING_COSTS.version}).`,
    provenance: { kind: "simulated-event", eventId: paidEventId },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: null,
    outcomeEventId: null,
  };
}

/**
 * The ordinary bills a committee has paid, oldest first, with any payment
 * recorded before `afterSequence` left out. Read-only.
 */
export function campaignOperatingPayments(
  world: World,
  organizationId: EntityId,
  afterSequence = 0,
): readonly ResourceTransferOutcome[] {
  const billEvents = new Set(
    world.history.events
      .filter(
        (event) =>
          event.type === CAMPAIGN_OPERATING_PAYMENT_EVENT &&
          event.involvedEntityIds.includes(organizationId),
      )
      .map((event) => event.id),
  );
  if (billEvents.size === 0) return [];
  const flows = new Set(
    world.history.resourceFlows
      .filter(
        (flow) =>
          flow.source.kind === "organization" &&
          flow.source.organizationId === organizationId &&
          flow.provenance.kind === "simulated-event" &&
          billEvents.has(flow.provenance.eventId),
      )
      .map((flow) => flow.id),
  );
  return world.history.resourceTransferOutcomes.filter(
    (outcome) =>
      outcome.status === "completed" &&
      outcome.sequence >= afterSequence &&
      flows.has(outcome.resourceFlowId),
  );
}

/** What those bills came to, in minor units. Read-only. */
export function campaignOperatingSpending(
  world: World,
  organizationId: EntityId,
  afterSequence = 0,
): number {
  return campaignOperatingPayments(world, organizationId, afterSequence).reduce(
    (sum, outcome) => sum + outcome.transferredAmount.minorUnits,
    0,
  );
}
