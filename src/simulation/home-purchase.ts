import { ageOnDate } from "./dates";
import { openHouseholdLoan } from "./household-loans";
import type { OpenHouseholdLoanInput } from "./household-loans";
import {
  amortizedMonthlyPaymentMinor,
  cappedAnnualRateBasisPoints,
} from "./public-benefit-formulas";
import { moneyText } from "./money-text";
import {
  activeAuthoritiesHeldByPersonAt,
  activePartnershipsAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  createHousehold,
  createOrganization,
  recordHouseholdLocation,
  recordHouseholdMembershipState,
  startHouseholdMembership,
} from "./life";
import { GROWN_UP_PRESENTATION_AGE_PLACEHOLDER } from "./age-of-majority";
import { homeValueForJurisdiction } from "./county-home-value";
import { homePriceLevel, homePriceLevels } from "./living-world/housing-market";
import { personName } from "./people";
import {
  createDwelling,
  createHousingTenure,
  createResourceFlow,
  money,
  recordDwellingOccupancyState,
  recordResourceTransferOutcome,
  startDwellingOccupancy,
} from "./resources";
import {
  activeDwellingOccupanciesAt,
  activeHousingTenuresAt,
  dwellingOccupancyStateHistory,
  resourcePositionAt,
  sameEndpoint,
} from "./resource-queries";
import { recordWorldEvent } from "./world";
import { recordEventKnowledge } from "./records";
import {
  macroConditionsAt,
  macroMonthHistory,
  macroScopeForJurisdiction,
} from "./macro-economy/readers";
import type { EntityId, HousingTenure, IsoDate, World } from "./types";

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
 * The price is the county's median home value (Census ACS, 2020-2024,
 * `county-home-value.ts`). The rest is still a PLACEHOLDER(research:
 * what-it-takes-to-buy-a-home): nobody has researched down payments by
 * buyer age, mortgage terms or interest. The two amounts below are the old
 * national figures, retained for the town's legacy housing estimate. They
 * cannot originate a purchase. Purchases require complete supplied loan
 * terms and use the shared loan writer and interest-bearing servicer.
 */
export const HOME_PURCHASE_PLACEHOLDER = {
  downPaymentMinor: 5_000_000,
  monthlyPaymentMinor: 120_000,
  currency: "USD",
  researchQuestionId: "what-it-takes-to-buy-a-home",
} as const;

export interface HomePurchaseTerms {
  readonly priceMinor: number;
  readonly downPaymentMinor: number;
  readonly monthlyPaymentMinor: number;
  readonly financingSupported: boolean;
}

function roundTo(minor: number, step: number): number {
  return Math.max(step, Math.round(minor / step) * step);
}

/**
 * The terms in today's prices.
 *
 * The price is the county's median home value read as the world's first-month
 * price. Since then the world has its own price level, and rent on the same
 * screen already moves with it, so a house that never moved read as a bargain
 * within a few years. The purchase price uses the housing market's home-price
 * level, the town's own where it has one and the nation's before that. The
 * legacy down payment and monthly payment retain their consumer-price adjustment. What a
 * down payment and a monthly payment are for a price is still the research
 * question's to answer.
 */
export function homePurchaseTerms(
  world: World,
  jurisdictionId: EntityId | null,
  mortgage?: HomeMortgageInput,
): HomePurchaseTerms {
  const today = world.currentDate;
  const now =
    (jurisdictionId
      ? macroConditionsAt(
          world,
          macroScopeForJurisdiction(jurisdictionId),
          today,
        )
      : null) ?? macroConditionsAt(world, "national", today);
  const first = macroMonthHistory(world, "national", today)[0] ?? null;
  const legacyPaymentFactor =
    now && first && first.priceIndex > 0
      ? now.priceIndex / first.priceIndex
      : 1;
  const openingPriceMinor =
    homeValueForJurisdiction(jurisdictionId).dollars * 100;
  const housingFactor = jurisdictionId
    ? homePriceLevel(world, jurisdictionId, today)
    : (homePriceLevels(macroMonthHistory(world, "national", today)).at(-1)
        ?.level ?? 1);
  const priceMinor = roundTo(openingPriceMinor * housingFactor, 100_000);
  if (
    mortgage &&
    !mortgageUnsupported(mortgage) &&
    mortgage.repayment.kind === "installment" &&
    mortgage.principal.currency === "USD" &&
    Number.isSafeInteger(mortgage.principal.minorUnits) &&
    mortgage.principal.minorUnits > 0 &&
    mortgage.principal.minorUnits <= priceMinor
  ) {
    const rate = cappedAnnualRateBasisPoints(
      mortgage.marketAnnualRateBasisPoints,
      mortgage.rateCap?.capBasisPoints ?? null,
    );
    return {
      priceMinor,
      downPaymentMinor: priceMinor - mortgage.principal.minorUnits,
      monthlyPaymentMinor: amortizedMonthlyPaymentMinor(
        mortgage.principal.minorUnits,
        rate,
        mortgage.repayment.termMonths,
      ),
      financingSupported: true,
    };
  }
  return {
    priceMinor,
    financingSupported: false,
    downPaymentMinor: roundTo(
      HOME_PURCHASE_PLACEHOLDER.downPaymentMinor * legacyPaymentFactor,
      100_000,
    ),
    monthlyPaymentMinor: roundTo(
      HOME_PURCHASE_PLACEHOLDER.monthlyPaymentMinor * legacyPaymentFactor,
      1_000,
    ),
  };
}

export const MORTGAGE_BASIS = "housing:mortgage" as const;
/** The age of majority, below which a person cannot sign a deed or a loan.
 * Eighteen in most states; the few exceptions are part of the same research
 * question. */
export const HOME_BUYING_AGE = 18;
export const MISSED_MORTGAGE_TAG = "life.mortgage-missed";

/** Complete recorded financing supplied by the existing contract owner. */
export type HomeMortgageInput = Pick<
  OpenHouseholdLoanInput,
  | "principal"
  | "marketAnnualRateBasisPoints"
  | "rateCap"
  | "repayment"
  | "lateFee"
  | "missedPaymentsToDefault"
  | "missedPaymentsToCollections"
  | "lenderOrganizationId"
  | "lenderKind"
  | "provenance"
>;

function mortgageUnsupported(
  input: HomeMortgageInput | undefined,
): string | null {
  if (
    !input ||
    !input.principal ||
    !input.provenance ||
    !input.lenderKind ||
    !Object.hasOwn(input, "lenderOrganizationId") ||
    input.lenderOrganizationId === undefined ||
    !Object.hasOwn(input, "rateCap") ||
    input.rateCap === undefined ||
    !Object.hasOwn(input, "lateFee") ||
    input.lateFee === undefined ||
    !Number.isSafeInteger(input.missedPaymentsToDefault) ||
    input.missedPaymentsToDefault < 1 ||
    !Number.isSafeInteger(input.missedPaymentsToCollections) ||
    input.missedPaymentsToCollections < input.missedPaymentsToDefault
  )
    return "No complete recorded mortgage contract is available.";
  if (
    input.repayment?.kind !== "installment" ||
    !Number.isSafeInteger(input.repayment.termMonths) ||
    input.repayment.termMonths < 1 ||
    !Number.isFinite(input.marketAnnualRateBasisPoints) ||
    input.marketAnnualRateBasisPoints < 0
  )
    return "The recorded mortgage needs a valid rate and installment term.";
  return null;
}

export type HomePurchaseResult =
  | { readonly status: "bought"; readonly world: World }
  | {
      readonly status: "not-bought";
      readonly world: World;
      readonly reason: string;
    };

function dollars(minor: number): string {
  return moneyText({ minorUnits: minor, currency: "USD" });
}

function primaryHouseholdId(world: World, personId: EntityId): EntityId | null {
  const homes = householdMembershipsAt(world, personId).filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  return homes.length === 1 ? homes[0]!.household.id : null;
}

/**
 * Whether buying a home means this person moves out of the home they grew up
 * in, rather than buying it for everybody there.
 *
 * True for an adult whose household includes somebody who holds, or ever
 * held, authority over them as a child: a parent or guardian. Buying used to
 * buy for whatever household the buyer lived in, so a grown daughter still at
 * home bought the house for her guardian too, and her profile went on listing
 * "your guardian" in the house she owned.
 */
function movesOutToBuy(
  world: World,
  personId: EntityId,
  householdId: EntityId,
): boolean {
  const person = world.people[personId];
  if (!person) return false;
  // PLACEHOLDER(research: age-of-majority-by-state). Leaving home to buy one
  // reads the same threshold the labels do. It does not wait for the
  // authority to end, and whether it has ended is not asked.
  if (
    ageOnDate(person.birthDate, world.currentDate) <
    GROWN_UP_PRESENTATION_AGE_PLACEHOLDER
  )
    return false;
  const residents = new Set(peopleInHouseholdAt(world, householdId));
  return world.history.childAuthorities.some(
    (authority) =>
      authority.childPersonId === personId &&
      authority.holder.kind === "person" &&
      authority.holder.personId !== personId &&
      residents.has(authority.holder.personId),
  );
}

/**
 * Who goes with a buyer leaving home: the buyer, a partner they have on
 * record, and children they are raising, each only if they live there now.
 * Everybody else in the house stays where they are.
 */
function peopleMovingWith(
  world: World,
  personId: EntityId,
  householdId: EntityId,
): readonly EntityId[] {
  const residents = new Set(peopleInHouseholdAt(world, householdId));
  const moving: EntityId[] = [personId];
  const add = (id: EntityId) => {
    if (residents.has(id) && !moving.includes(id)) moving.push(id);
  };
  for (const partnership of activePartnershipsAt(world, personId))
    for (const id of partnership.personIds) add(id);
  for (const { authority } of activeAuthoritiesHeldByPersonAt(world, personId))
    add(authority.childPersonId);
  return moving;
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

/** Whether the game keeps this person's money. Unknown is not zero. */
export function moneyIsTracked(world: World, personId: EntityId): boolean {
  return balance(world, personId) !== null;
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
  mortgage?: HomeMortgageInput,
): string | null {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return "Only the person you are playing can buy a home.";
  const person = world.people[personId];
  if (!person) return "This person is not in the world.";
  if (ageOnDate(person.birthDate, world.currentDate) < HOME_BUYING_AGE)
    return `You have to be ${HOME_BUYING_AGE} to buy a home.`;
  if (!lifePlaceByJurisdictionId(person.homeJurisdictionId))
    return "The game does not know which town you live in.";
  const householdId = primaryHouseholdId(world, personId);
  if (!householdId) return "You need one home household to buy a home for.";
  if (ownedHomeFor(world, householdId))
    return "Your household already owns its home.";
  const have = balance(world, personId);
  if (have === null) return "The game is not tracking your money.";
  const unsupported = mortgageUnsupported(mortgage);
  if (unsupported || !mortgage) return unsupported;
  const priceMinor = homePurchaseTerms(
    world,
    person.homeJurisdictionId,
  ).priceMinor;
  if (
    mortgage.principal.currency !== "USD" ||
    !Number.isSafeInteger(mortgage.principal.minorUnits) ||
    mortgage.principal.minorUnits <= 0 ||
    mortgage.principal.minorUnits > priceMinor
  )
    return "The recorded mortgage does not fit this purchase price.";
  const downPaymentMinor = priceMinor - mortgage.principal.minorUnits;
  if (have < downPaymentMinor)
    return `The down payment is ${dollars(downPaymentMinor)}. You have ${dollars(have)}.`;
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
 *
 * A grown child still living with a parent or guardian does not buy the
 * house for them: they found a household of their own and move into the new
 * home, with a partner and their own children if those live with them, and
 * the parent stays where they were. See `movesOutToBuy`.
 */
export function buyHome(
  world: World,
  personId: EntityId,
  mortgage?: HomeMortgageInput,
): HomePurchaseResult {
  const unsupported = mortgageUnsupported(mortgage);
  if (unsupported || !mortgage)
    return { status: "not-bought", world, reason: unsupported! };
  const reason = homePurchaseReason(world, personId, mortgage);
  if (reason) return { status: "not-bought", world, reason };
  const person = world.people[personId]!;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId)!;
  const jurisdictionId = place.context.jurisdiction.id;
  const householdId = primaryHouseholdId(world, personId)!;
  const today = world.currentDate;
  const key = `home-purchase:${householdId}:${today}`;
  const currency = money(0, HOME_PURCHASE_PLACEHOLDER.currency).currency;
  const terms = homePurchaseTerms(world, person.homeJurisdictionId, mortgage);
  if (!terms.financingSupported)
    return {
      status: "not-bought",
      world,
      reason: "No complete recorded mortgage contract is available.",
    };
  const price = money(terms.priceMinor, currency);
  const principal = mortgage.principal;
  const down = money(terms.downPaymentMinor, currency);
  const monthly = money(terms.monthlyPaymentMinor, currency);
  const provenanceNote =
    "Home purchase under the supplied recorded mortgage contract.";

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

  // A household of their own, when the buyer is leaving the one that raised
  // them. The old household keeps its home and everybody who stays in it.
  let buyingHouseholdId = householdId;
  if (movesOutToBuy(world, personId, householdId)) {
    const householdKey = `${key}:household`;
    next = createHousehold(next, {
      stableKey: householdKey,
      formedAt: today,
      label: `${personName(person)}'s household`,
      provenance,
    });
    buyingHouseholdId = next.history.households.at(-1)!.id;
    next = recordHouseholdLocation(next, {
      stableKey: `${householdKey}:location`,
      householdId: buyingHouseholdId,
      effectiveAt: today,
      jurisdictionId,
      label: place.displayName,
      kind: "residence:home",
      provenance,
      supersedesLocationId: null,
    });
    for (const moverId of peopleMovingWith(world, personId, householdId)) {
      const entry = householdMembershipsAt(next, moverId).find(
        (candidate) => candidate.household.id === householdId,
      )!;
      next = recordHouseholdMembershipState(next, {
        stableKey: `${key}:left-home:${entry.membership.id}`,
        membershipId: entry.membership.id,
        effectiveAt: today,
        status: "ended",
        residenceRole: entry.state.residenceRole,
        kind: entry.state.kind,
        provenance,
        supersedesStateId: entry.state.id,
      });
      next = startHouseholdMembership(next, {
        stableKey: `${householdKey}:member:${moverId}`,
        personId: moverId,
        householdId: buyingHouseholdId,
        startedAt: today,
        residenceRole: "primary",
        // The buyer is nobody's child in their own home.
        kind: moverId === personId ? "resident:member" : entry.state.kind,
        provenance,
      });
    }
  }

  // Moving out of wherever the household was recorded living, if anywhere.
  // A new household was not recorded living anywhere yet.
  const cutoff = {
    asOfDate: today,
    historySequenceExclusive: next.history.nextSequence,
  };
  for (const occupancy of activeDwellingOccupanciesAt(next, cutoff)) {
    if (
      occupancy.occupant.kind !== "household" ||
      occupancy.occupant.householdId !== buyingHouseholdId
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
    holder: { kind: "household", householdId: buyingHouseholdId },
    dwellingId,
    startedAt: today,
    kind: "ownership:mortgaged",
    context: null,
    provenance,
  });
  const tenureId = next.history.housingTenures.at(-1)!.id;
  next = startDwellingOccupancy(next, {
    stableKey: `${key}:moved-in`,
    occupant: { kind: "household", householdId: buyingHouseholdId },
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

  next = openHouseholdLoan(next, {
    ...mortgage,
    stableKey: `${key}:mortgage`,
    borrower: { kind: "person", personId },
    kind: "mortgage",
    principal,
    jurisdictionId,
    housingTenureId: tenureId,
  });
  return { status: "bought", world: next };
}
