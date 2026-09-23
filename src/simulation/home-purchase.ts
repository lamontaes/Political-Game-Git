import { makeIsoDate } from "./dates";
import { householdMembershipsAt } from "./life-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import { createOrganization } from "./life";
import {
  createDwelling,
  createHousingTenure,
  createResourceFlow,
  createResourceObligation,
  money,
  recordDwellingOccupancyState,
  recordResourceTransferOutcome,
  startDwellingOccupancy,
} from "./resources";
import {
  activeDwellingOccupanciesAt,
  activeHousingTenuresAt,
  dwellingOccupancyStateHistory,
  outstandingDebtAt,
  resourceFlowTermsAt,
  resourcePositionAt,
  sameEndpoint,
} from "./resource-queries";
import { recordEventKnowledge } from "./records";
import { recordWorldEvent } from "./world";
import type {
  EntityId,
  HousingTenure,
  IsoDate,
  MoneyAmount,
  ResourceFlow,
  World,
} from "./types";

/**
 * Buying a home.
 *
 * Money had nothing to buy. The records for a home were already in the engine
 * (a dwelling, who owns it, and a debt tied to that ownership) and nothing in
 * play wrote them. This lets the person being played buy a home for their
 * household with a down payment from their own money and a mortgage paid on
 * the first of each month, through the same records pay and rent use.
 *
 * Owning replaces rent: from the purchase on, the monthly living costs drop
 * the housing share and the mortgage is charged instead.
 */

/**
 * PLACEHOLDER(research: what-it-takes-to-buy-a-home). Nobody has researched
 * any of these numbers. One national price, down payment and monthly payment
 * for every state and town, standing in until prices by state and town size,
 * lending rules and interest are answered. Interest is not modeled: the
 * payments below simply pay down the loan. Replace them; do not tune them.
 */
export const HOME_PURCHASE_PLACEHOLDER = {
  priceMinor: 25_000_000,
  downPaymentMinor: 5_000_000,
  monthlyPaymentMinor: 120_000,
  currency: "USD",
  researchQuestionId: "what-it-takes-to-buy-a-home",
} as const;

export const MORTGAGE_BASIS = "housing:mortgage" as const;
export const MISSED_MORTGAGE_TAG = "life.mortgage-missed";
const CATCH_UP_LIMIT_MONTHS = 480;

export type HomePurchaseResult =
  | { readonly status: "bought"; readonly world: World }
  | {
      readonly status: "not-bought";
      readonly world: World;
      readonly reason: string;
    };

function dollars(minor: number): string {
  return (minor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function primaryHouseholdId(world: World, personId: EntityId): EntityId | null {
  const homes = householdMembershipsAt(world, personId).filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  return homes.length === 1 ? homes[0]!.household.id : null;
}

/** The home this household owns today, if it owns one. */
export function ownedHomeFor(
  world: World,
  householdId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): HousingTenure | null {
  return (
    activeHousingTenuresAt(world, {
      asOfDate,
      historySequenceExclusive: world.history.nextSequence,
    }).find(
      (tenure) =>
        tenure.holder.kind === "household" &&
        tenure.holder.householdId === householdId &&
        tenure.kind.startsWith("ownership:"),
    ) ?? null
  );
}

/** Whether the household the person lives in owns its home on a date. */
export function personOwnsHome(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate = world.currentDate,
): boolean {
  const householdId = primaryHouseholdId(world, personId);
  return (
    householdId !== null && ownedHomeFor(world, householdId, asOfDate) !== null
  );
}

/** The day the person's household came to own its home, or null. */
export function homeOwnedSince(
  world: World,
  personId: EntityId,
): IsoDate | null {
  const householdId = primaryHouseholdId(world, personId);
  return householdId === null
    ? null
    : (ownedHomeFor(world, householdId)?.startedAt ?? null);
}

function balance(world: World, personId: EntityId): number | null {
  const owner = { kind: "person" as const, personId };
  const tracked = world.history.resourcePositions.some(
    (position) =>
      sameEndpoint(position.owner, owner) &&
      position.openingBalance.currency === HOME_PURCHASE_PLACEHOLDER.currency,
  );
  if (!tracked) return null;
  return (
    resourcePositionAt(
      world,
      owner,
      money(0, HOME_PURCHASE_PLACEHOLDER.currency).currency,
    )?.liquidBalance.minorUnits ?? 0
  );
}

/**
 * Why this person cannot buy a home today, or null when they can. A read: it
 * writes nothing, so a screen may ask it freely.
 */
export function homePurchaseReason(
  world: World,
  personId: EntityId,
): string | null {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return "Only the person you are playing can buy a home.";
  const person = world.people[personId];
  if (!person) return "This person is not in the world.";
  if (!lifePlaceByJurisdictionId(person.homeJurisdictionId))
    return "The game does not know which town you live in.";
  const householdId = primaryHouseholdId(world, personId);
  if (!householdId) return "You need one home household to buy a home for.";
  if (ownedHomeFor(world, householdId))
    return "Your household already owns its home.";
  const have = balance(world, personId);
  if (have === null) return "The game is not tracking your money.";
  if (have < HOME_PURCHASE_PLACEHOLDER.downPaymentMinor)
    return `The down payment is ${dollars(HOME_PURCHASE_PLACEHOLDER.downPaymentMinor)}. You have ${dollars(have)}.`;
  return null;
}

function counterparty(
  world: World,
  stableKey: string,
  name: string,
  jurisdictionId: EntityId,
): { world: World; organizationId: EntityId } {
  const existing = world.history.organizations.find(
    (organization) => organization.stableKey === stableKey,
  );
  if (existing) return { world, organizationId: existing.id };
  const next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "An aggregate counterparty for home purchases. The game has no housing market and does not pretend to model one.",
    },
    initialProfile: {
      name,
      classification: "enterprise:housing-finance",
      locationJurisdictionId: jurisdictionId,
    },
  });
  return { world: next, organizationId: next.history.organizations.at(-1)!.id };
}

/**
 * Buys a home for the player's household today, or says why not.
 *
 * Writes the dwelling, the household's ownership of it, the move in, the down
 * payment and a mortgage owed monthly from the first of next month.
 */
export function buyHome(world: World, personId: EntityId): HomePurchaseResult {
  const reason = homePurchaseReason(world, personId);
  if (reason) return { status: "not-bought", world, reason };
  const person = world.people[personId]!;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId)!;
  const jurisdictionId = place.context.jurisdiction.id;
  const householdId = primaryHouseholdId(world, personId)!;
  const today = world.currentDate;
  const key = `home-purchase:${householdId}:${today}`;
  const currency = money(0, HOME_PURCHASE_PLACEHOLDER.currency).currency;
  const price = money(HOME_PURCHASE_PLACEHOLDER.priceMinor, currency);
  const down = money(HOME_PURCHASE_PLACEHOLDER.downPaymentMinor, currency);
  const principal = money(price.minorUnits - down.minorUnits, currency);
  const monthly = money(
    HOME_PURCHASE_PLACEHOLDER.monthlyPaymentMinor,
    currency,
  );
  const provenanceNote = `Placeholder home purchase pending research question ${HOME_PURCHASE_PLACEHOLDER.researchQuestionId}.`;

  const summary = `You bought a home in ${place.displayName} for ${dollars(price.minorUnits)}, putting ${dollars(down.minorUnits)} down. The mortgage is ${dollars(monthly.minorUnits)} a month.`;
  let next = recordWorldEvent(world, {
    stableKey: key,
    type: "life.home-bought",
    occurredAt: today,
    recordedAt: today,
    jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "Bought a home" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.home-bought", "provenance:player-choice"],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "buy-home",
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = recordEventKnowledge(next, {
    stableKey: `${key}:knowledge`,
    personId,
    eventId,
    learnedAt: today,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  const provenance = { kind: "simulated-event" as const, eventId };

  // Moving out of wherever the household was recorded living, if anywhere.
  const cutoff = {
    asOfDate: today,
    historySequenceExclusive: next.history.nextSequence,
  };
  for (const occupancy of activeDwellingOccupanciesAt(next, cutoff)) {
    if (
      occupancy.occupant.kind !== "household" ||
      occupancy.occupant.householdId !== householdId
    )
      continue;
    const latest = dwellingOccupancyStateHistory(next, occupancy.id).at(-1)!;
    if (latest.residenceRole !== "primary") continue;
    next = recordDwellingOccupancyState(next, {
      stableKey: `${key}:moved-out:${occupancy.id}`,
      dwellingOccupancyId: occupancy.id,
      effectiveAt: today,
      status: "ended",
      residenceRole: latest.residenceRole,
      kind: latest.kind,
      reason: "Moved into a home the household bought.",
      provenance,
      supersedesStateId: latest.id,
    });
  }

  next = createDwelling(next, {
    stableKey: `${key}:dwelling`,
    establishedAt: today,
    jurisdictionId,
    locationLabel: `A house in ${place.displayName}`,
    classification: "residential:house",
    provenance: { kind: "authored", note: provenanceNote },
  });
  const dwellingId = next.history.dwellings.at(-1)!.id;
  next = createHousingTenure(next, {
    stableKey: `${key}:ownership`,
    holder: { kind: "household", householdId },
    dwellingId,
    startedAt: today,
    kind: "ownership:mortgaged",
    context: null,
    provenance,
  });
  const tenureId = next.history.housingTenures.at(-1)!.id;
  next = startDwellingOccupancy(next, {
    stableKey: `${key}:moved-in`,
    occupant: { kind: "household", householdId },
    dwellingId,
    startedAt: today,
    residenceRole: "primary",
    kind: "residence:owned-home",
    provenance,
  });

  const seller = counterparty(
    next,
    `home-seller:${jurisdictionId}`,
    "Home seller",
    jurisdictionId,
  );
  next = seller.world;
  next = createResourceFlow(next, {
    stableKey: `${key}:down-payment`,
    source: { kind: "person", personId },
    recipient: { kind: "organization", organizationId: seller.organizationId },
    startsAt: today,
    initialStatus: "active",
    amount: down,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:home-down-payment",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId,
    provenance,
  });
  next = recordResourceTransferOutcome(next, {
    stableKey: `${key}:down-payment:paid`,
    resourceFlowId: next.history.resourceFlows.at(-1)!.id,
    periodStartsAt: today,
    periodEndsAt: today,
    occurredAt: today,
    status: "completed",
    attemptedAmount: down,
    transferredAmount: down,
    reasonKind: null,
    note: "Down payment on the house.",
    provenance,
  });

  const lender = counterparty(
    next,
    `mortgage-lender:${jurisdictionId}`,
    "Mortgage lender",
    jurisdictionId,
  );
  next = lender.world;
  next = createResourceFlow(next, {
    stableKey: `${key}:mortgage`,
    source: { kind: "person", personId },
    recipient: { kind: "organization", organizationId: lender.organizationId },
    startsAt: today,
    amount: monthly,
    cadenceKind: "schedule:monthly",
    basisKind: MORTGAGE_BASIS,
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId,
    provenance: { kind: "authored", note: provenanceNote },
  });
  next = createResourceObligation(next, {
    stableKey: `${key}:mortgage:debt`,
    resourceFlowId: next.history.resourceFlows.at(-1)!.id,
    establishedAt: today,
    basisKind: MORTGAGE_BASIS,
    principal,
    careResponsibilityId: null,
    housingTenureId: tenureId,
    provenance,
  });
  return { status: "bought", world: next };
}

function firstOfNextMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

function monthName(date: IsoDate): string {
  return new Date(`${date}T12:00:00Z`).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

function mortgagesOf(
  world: World,
  personId: EntityId,
): readonly ResourceFlow[] {
  return world.history.resourceFlows.filter(
    (flow) =>
      flow.basisKind === MORTGAGE_BASIS &&
      flow.source.kind === "person" &&
      flow.source.personId === personId,
  );
}

/**
 * Charges every mortgage payment that has come due, on the first of each
 * month, until the loan is paid off. Idempotent in the same way as living
 * costs: each month is keyed by its due day and resumes after the last one.
 *
 * A month that cannot be covered is recorded as short. What a lender then
 * does (late fees, foreclosure) is a research question; nothing is invented
 * for it here beyond noting the first missed payment in the life.
 */
export function settleMortgages(world: World, personId: EntityId): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  let next = world;
  for (const flow of mortgagesOf(world, personId)) {
    const obligation = next.history.resourceObligations.find(
      (record) => record.resourceFlowId === flow.id,
    );
    if (!obligation) continue;
    let latest: IsoDate | null = null;
    for (const outcome of next.history.resourceTransferOutcomes)
      if (
        outcome.resourceFlowId === flow.id &&
        (latest === null || outcome.periodStartsAt > latest)
      )
        latest = outcome.periodStartsAt;
    let dueOn = firstOfNextMonth(latest ?? flow.startsAt);
    for (
      let month = 0;
      month < CATCH_UP_LIMIT_MONTHS && dueOn <= next.currentDate;
      month += 1
    ) {
      const owed = outstandingDebtAt(next, obligation.id, {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      });
      if (!owed || owed.minorUnits <= 0) break;
      next = settleMortgageMonth(next, personId, flow, dueOn, owed);
      dueOn = firstOfNextMonth(dueOn);
    }
  }
  return next;
}

function settleMortgageMonth(
  world: World,
  personId: EntityId,
  flow: ResourceFlow,
  dueOn: IsoDate,
  owed: MoneyAmount,
): World {
  const scheduled = resourceFlowTermsAt(world, flow.id, {
    asOfDate: dueOn,
    historySequenceExclusive: world.history.nextSequence,
  })!.amount;
  const owner = { kind: "person" as const, personId };
  const balanceOn = (asOfDate: IsoDate) =>
    resourcePositionAt(world, owner, scheduled.currency, {
      asOfDate,
      historySequenceExclusive: world.history.nextSequence,
    })?.liquidBalance.minorUnits ?? 0;
  const checkpoints = new Set<IsoDate>([dueOn, world.currentDate]);
  for (const outcome of world.history.resourceTransferOutcomes)
    if (outcome.occurredAt > dueOn && outcome.occurredAt < world.currentDate)
      checkpoints.add(outcome.occurredAt);
  const available = Math.max(0, Math.min(...[...checkpoints].map(balanceOn)));
  // The last payment is only what is left on the loan.
  const due = Math.min(scheduled.minorUnits, owed.minorUnits);
  const paid = Math.min(available, due);
  const status =
    paid === scheduled.minorUnits
      ? "completed"
      : paid > 0
        ? "partial"
        : "missed";
  const next = recordResourceTransferOutcome(world, {
    stableKey: `${flow.stableKey}:${dueOn}`,
    resourceFlowId: flow.id,
    periodStartsAt: dueOn,
    periodEndsAt: dueOn,
    occurredAt: dueOn,
    status,
    attemptedAmount: scheduled,
    transferredAmount: money(paid, scheduled.currency),
    reasonKind:
      status === "completed" || paid === due
        ? null
        : "capacity:insufficient-funds",
    note: `Mortgage for ${monthName(dueOn)}.`,
    provenance: flow.provenance,
  });
  return paid < due
    ? recordFirstMissedPayment(next, personId, due, paid, dueOn)
    : next;
}

function recordFirstMissedPayment(
  world: World,
  personId: EntityId,
  owedMinor: number,
  paidMinor: number,
  dueOn: IsoDate,
): World {
  if (
    world.history.events.some(
      (event) =>
        event.involvedEntityIds.includes(personId) &&
        event.tags.includes(MISSED_MORTGAGE_TAG),
    )
  )
    return world;
  const person = world.people[personId]!;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const summary =
    paidMinor > 0
      ? `${monthName(dueOn)}'s mortgage payment was ${dollars(owedMinor)}, and you could pay ${dollars(paidMinor)} of it.`
      : `${monthName(dueOn)}'s mortgage payment was ${dollars(owedMinor)}, and you could not pay any of it.`;
  const stableKey = `mortgage-missed:${personId}:${dueOn}`;
  const next = recordWorldEvent(world, {
    stableKey,
    type: "life.mortgage-missed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: place?.context.jurisdiction.id ?? null,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "Missed a mortgage payment" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [MISSED_MORTGAGE_TAG],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return recordEventKnowledge(next, {
    stableKey: `${stableKey}:knowledge`,
    personId,
    eventId: next.history.events.at(-1)!.id,
    learnedAt: world.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}
