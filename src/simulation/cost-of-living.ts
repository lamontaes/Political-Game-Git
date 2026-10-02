import { createOrganization } from "./life";
import {
  LIVING_COSTS_CATEGORY_DATA,
  LIVING_COSTS_CATEGORY_SOURCES,
} from "./living-costs-category-data";
import { makeIsoDate } from "./dates";
import {
  householdMembershipsAt,
  householdLocationAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import { recordEventKnowledge } from "./records";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceFlowTerms,
  recordResourceTransferOutcome,
} from "./resources";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
  sameEndpoint,
} from "./resource-queries";
import { MORTGAGE_BASIS } from "./home-purchase";
import {
  LIVING_COSTS_SOURCE,
  REPRESENTATIVE_LIVING_COSTS,
  livingCostsRegionForState,
  estimatedMonthlyHouseholdLivingCosts,
} from "./living-costs-data";
import { townLeases } from "./living-world/town-rent";
import { recordWorldEvent } from "./world";
import { drawnLinkSize } from "./outcome-web";
import type { EntityId, IsoDate, ResourceFlow, World } from "./types";

/**
 * Monthly nonhousing costs belong to the actual primary household. Saved provider
 * bills retain their amounts and payees. Missing sellers use the admitted one-per-
 * place outside-sellers account and a labeled size/region CES estimate.
 * Recorded household cash limits payment; personal money is never pooled or spent.
 * Housing keeps its existing separate contract writers. Old payments are immutable.
 */

/**
 * Interpret the rent-included label on old authored charge records only.
 * This is not an amount used to open or migrate a charge. New terms use the
 * representative BLS basket; actual lease/mortgage writers settle housing.
 */
const LEGACY_RENT_INCLUDED_MINIMUM_MINOR = 150_000;

export const LIVING_COSTS_BASIS = "custom:living-costs" as const;
export const HOUSEHOLD_SHORTFALL_TAG = "life.opportunity:household-shortfall";
const SHORTFALL_ANSWER = "adult.household-money-shortfall";

/** The most months one transition will settle, so a corrupt date cannot spin. */
const CATCH_UP_LIMIT_MONTHS = 240;

function flowKey(personId: EntityId): string {
  return `living-costs:${personId}`;
}

export function livingCostsFlowFor(
  world: World,
  personId: EntityId,
): ResourceFlow | null {
  const householdId = primaryHouseholdId(world, personId);
  const bills = householdBills(world, personId);
  return (
    bills.find(
      (flow) =>
        flow.stableKey.startsWith(`${householdFlowKey(householdId)}:`) &&
        resourceFlowTermsAt(world, flow.id)?.status === "active",
    ) ??
    bills.find(
      (flow) => resourceFlowTermsAt(world, flow.id)?.status === "active",
    ) ??
    bills[0] ??
    world.history.resourceFlows.find(
      (flow) => flow.stableKey === flowKey(personId),
    ) ??
    null
  );
}

function primaryHouseholdId(
  world: World,
  personId: EntityId,
  asOfDate = world.currentDate,
): EntityId | null {
  const homes = householdMembershipsAt(world, personId, {
    asOfDate,
    historySequenceExclusive: world.history.nextSequence,
  }).filter((entry) => entry.state.residenceRole === "primary");
  return homes.length === 1 ? homes[0]!.household.id : null;
}

/** Dated membership supplies the actual count, including resident children. */
export function estimatedHouseholdLivingCostsAt(
  world: World,
  personId: EntityId,
  asOfDate = world.currentDate,
) {
  const householdId = primaryHouseholdId(world, personId, asOfDate);
  if (!householdId) return null;
  const cutoff = {
    asOfDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const residents = new Set(
    peopleInHouseholdAt(world, householdId, cutoff).filter(
      (id) =>
        householdMembershipsAt(world, id, cutoff).some(
          (entry) =>
            entry.household.id === householdId &&
            entry.state.residenceRole === "primary",
        ) &&
        !world.history.personDeaths.some(
          (death) => death.personId === id && death.diedAt <= asOfDate,
        ),
    ),
  );
  if (!residents.size) return null;
  const locationId =
    householdLocationAt(world, householdId, cutoff)?.jurisdictionId ??
    world.people[personId]!.homeJurisdictionId;
  const place = lifePlaceByJurisdictionId(locationId);
  const estimate = estimatedMonthlyHouseholdLivingCosts(
    livingCostsRegionForState(place?.stateJurisdictionKey ?? null),
    residents.size,
  );
  const jurisdictionId = place?.context.jurisdiction.id ?? locationId;
  return {
    householdId,
    jurisdictionId,
    ...estimate,
    averageMonthlyMinor: estimate.monthlyMinor,
    // Reuse the world's established estimate spread, never a payment/outcome roll.
    monthlyMinor: Math.round(
      drawnLinkSize(
        world,
        {
          key: `living-costs:household:${householdId}:size:${estimate.sizeColumn}`,
          size: estimate.monthlyMinor,
          evidence: "researched",
        },
        jurisdictionId,
      ),
    ),
  };
}

/**
 * Actual active housing contracts of the person's primary household on a date.
 * Amounts retain their recorded currency/cadence; they are not an invented share.
 */
export function recordedHouseholdHousingBillsAt(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate,
):
  | readonly {
      flow: ResourceFlow;
      terms: NonNullable<ReturnType<typeof resourceFlowTermsAt>>;
    }[]
  | null {
  const householdId = primaryHouseholdId(world, personId, asOfDate);
  if (!householdId) return null;
  const leases = townLeases(world, asOfDate).filter(
    (row) =>
      !row.ended &&
      row.householdId === householdId &&
      row.flow.startsAt <= asOfDate,
  );
  const mortgageFlows = world.history.resourceFlows.filter(
    (flow) =>
      flow.basisKind === MORTGAGE_BASIS &&
      flow.startsAt <= asOfDate &&
      flow.source.kind === "person" &&
      householdMembershipsAt(world, flow.source.personId, {
        asOfDate,
        historySequenceExclusive: world.history.nextSequence,
      }).some(
        (entry) =>
          entry.state.residenceRole === "primary" &&
          entry.household.id === householdId,
      ),
  );
  const bills = [
    ...leases.map((lease) => lease.flow),
    ...mortgageFlows,
  ].flatMap((flow) => {
    const terms = resourceFlowTermsAt(world, flow.id, {
      asOfDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    return terms?.status === "active" ? [{ flow, terms }] : [];
  });
  // No recorded contract means an unknown housing bill, never a $900 estimate or zero.
  return bills.length ? bills : null;
}

const livingCostsProvenance = {
  kind: "source-record" as const,
  reference: `${LIVING_COSTS_CATEGORY_SOURCES["consumer-unit-size"].url}#Table-1400; ${LIVING_COSTS_SOURCE}#Table-1800; 2024 Consumer Expenditure category means; conservative availability cutoff December 31, 2025. ESTIMATED FROM AVERAGE: household size category times regional/national category ratio, existing stable world spread; not observed household purchases. Missing recorded sellers use the R15 outside-sellers counterparty.`,
  asOf: makeIsoDate(REPRESENTATIVE_LIVING_COSTS.sourceAvailableBy),
};

function householdFlowKey(householdId: EntityId | null): string {
  return `living-costs:household:${householdId}`;
}

function dollars(minor: number): string {
  return (minor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function householdBills(
  world: World,
  personId: EntityId,
): readonly ResourceFlow[] {
  const householdId = primaryHouseholdId(world, personId);
  if (!householdId) return [];
  const categoryBases = new Set(
    Object.keys(LIVING_COSTS_CATEGORY_DATA).map(
      (key) => `${LIVING_COSTS_BASIS}.${key.toLowerCase()}`,
    ),
  );
  return world.history.resourceFlows.filter(
    (flow) =>
      flow.source.kind === "household" &&
      flow.source.householdId === householdId &&
      (flow.basisKind === LIVING_COSTS_BASIS ||
        categoryBases.has(flow.basisKind)) &&
      flow.startsAt <= world.currentDate &&
      resourceFlowTermsAt(world, flow.id)?.cadenceKind === "schedule:monthly" &&
      !sameEndpoint(flow.source, flow.recipient),
  );
}

function payerIsControlled(world: World, personId: EntityId): boolean {
  return (
    world.control.kind === "person" &&
    world.control.personId === personId &&
    !!world.people[personId] &&
    !world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  );
}

function endFlow(world: World, flow: ResourceFlow, reason: string): World {
  const terms = resourceFlowTermsAt(world, flow.id);
  if (!terms || terms.status !== "active") return world;
  return recordResourceFlowTerms(world, {
    stableKey: `${flow.stableKey}:cutover:${world.currentDate}`,
    resourceFlowId: flow.id,
    effectiveAt: world.currentDate,
    status: "ended",
    amount: terms.amount,
    cadenceKind: terms.cadenceKind,
    reason,
    provenance: terms.provenance,
    supersedesTermsId: terms.id,
  });
}

function prepareHouseholdCosts(
  world: World,
  personId: EntityId,
  reprice: boolean,
): World {
  if (!payerIsControlled(world, personId)) return world;
  const estimate = estimatedHouseholdLivingCostsAt(world, personId);
  if (!estimate || world.currentDate < livingCostsProvenance.asOf) return world;
  let next = world;
  // End all replaced personal estimates for this household, retaining old receipts.
  for (const id of peopleInHouseholdAt(world, estimate.householdId)) {
    if (primaryHouseholdId(world, id) !== estimate.householdId) continue;
    const legacy = world.history.resourceFlows.find(
      (flow) => flow.stableKey === flowKey(id),
    );
    if (legacy)
      next = endFlow(
        next,
        legacy,
        "Household bills replace the personal nonhousing estimate prospectively.",
      );
  }
  const jurisdictionId = estimate.jurisdictionId;
  const fallbackPrefix = `${householdFlowKey(estimate.householdId)}:`;
  const fallbackKey = `${fallbackPrefix}${jurisdictionId}`;
  for (const flow of householdBills(next, personId))
    if (
      flow.stableKey.startsWith(fallbackPrefix) &&
      flow.stableKey !== fallbackKey
    )
      next = endFlow(
        next,
        flow,
        "Household moved; outside-seller spending follows its current place prospectively.",
      );
  const existing = next.history.resourceFlows.find(
    (flow) => flow.stableKey === fallbackKey,
  );
  const providers = householdBills(next, personId).filter(
    (flow) =>
      !flow.stableKey.startsWith(fallbackPrefix) &&
      resourceFlowTermsAt(next, flow.id)?.status === "active",
  );
  // A saved whole-basket bill already covers the basket; never charge it again.
  const bundledProvider = providers.some(
    (flow) => flow.basisKind === LIVING_COSTS_BASIS,
  );
  const missing = bundledProvider
    ? []
    : estimate.categories.filter(
        (row) =>
          !providers.some(
            (flow) =>
              flow.basisKind ===
              `${LIVING_COSTS_BASIS}.${row.key.toLowerCase()}`,
          ),
      );
  if (!missing.length)
    return existing
      ? endFlow(
          next,
          existing,
          "Recorded provider bills cover the nonhousing basket.",
        )
      : next;
  const owner = {
    kind: "household" as const,
    householdId: estimate.householdId,
  };
  const currency = money(0, REPRESENTATIVE_LIVING_COSTS.currency).currency;
  if (!resourcePositionAt(next, owner, currency)) return next; // Do not invent household cash.
  const totalAnnual = estimate.categories.reduce(
    (sum, row) => sum + row.annualMeanUsd,
    0,
  );
  const missingAnnual = missing.reduce(
    (sum, row) => sum + row.annualMeanUsd,
    0,
  );
  const amount = money(
    Math.round((estimate.monthlyMinor * missingAnnual) / totalAnnual),
    currency,
  );
  const reason = `ESTIMATED FROM AVERAGE: ${missing.map((row) => row.label).join(", ")}; ${estimate.householdSize} household residents, ${estimate.region}; recorded provider categories are excluded. Housing is paid separately.`;
  if (existing) {
    const terms = resourceFlowTermsAt(next, existing.id);
    // An ended saved charge stays ended; a missing seller never revives a contract.
    if (
      !reprice ||
      !terms ||
      terms.status !== "active" ||
      terms.amount.minorUnits === amount.minorUnits
    )
      return next;
    return recordResourceFlowTerms(next, {
      stableKey: `${fallbackKey}:terms:${next.currentDate}`,
      resourceFlowId: existing.id,
      effectiveAt: next.currentDate,
      status: "active",
      amount,
      cadenceKind: terms.cadenceKind,
      reason,
      provenance: livingCostsProvenance,
      supersedesTermsId: terms.id,
    });
  }
  const sellerKey = `living-costs:outside-sellers:${jurisdictionId}`;
  let seller = next.history.organizations.find(
    (row) => row.stableKey === sellerKey,
  );
  if (!seller) {
    next = createOrganization(next, {
      stableKey: sellerKey,
      formedAt: next.currentDate,
      initialProfile: {
        name: "Sellers outside this town's simulated businesses",
        classification: "custom:outside-sellers",
        locationJurisdictionId: jurisdictionId,
      },
      provenance: {
        kind: "authored",
        note: "CTO R15 Oct 2 06:38: labeled aggregate outside-sellers counterparty for recorded spending leakage; not a named local vendor.",
      },
    });
    seller = next.history.organizations.at(-1)!;
  }
  const recipient = {
    kind: "organization" as const,
    organizationId: seller.id,
  };
  if (!resourcePositionAt(next, recipient, currency))
    next = createResourcePosition(next, {
      stableKey: `${sellerKey}:cash:${currency}`,
      owner: recipient,
      openedAt: next.currentDate,
      openingBalance: money(0, currency),
      provenance: seller.provenance,
    });
  return createResourceFlow(next, {
    stableKey: fallbackKey,
    source: owner,
    recipient,
    startsAt: next.currentDate,
    amount,
    cadenceKind: "schedule:monthly",
    basisKind: LIVING_COSTS_BASIS,
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId,
    provenance: {
      ...livingCostsProvenance,
      reference: `${livingCostsProvenance.reference} ${reason}`,
    },
  });
}

/** Opens a charge now; never backdates payments or reprices a saved contract. */
export function initializeLivingCostsFlow(
  world: World,
  personId: EntityId,
): World {
  return prepareHouseholdCosts(world, personId, false);
}

/** Settle saved household bills in due-date order through the existing cash writer. */
export function settleLivingCosts(world: World, personId: EntityId): World {
  if (!payerIsControlled(world, personId)) return world;
  let next = prepareHouseholdCosts(world, personId, true);
  const bills = householdBills(next, personId);
  const latest = new Map<EntityId, IsoDate>();
  const ids = new Set(bills.map((flow) => flow.id));
  for (const outcome of next.history.resourceTransferOutcomes)
    if (
      ids.has(outcome.resourceFlowId) &&
      (!latest.has(outcome.resourceFlowId) ||
        latest.get(outcome.resourceFlowId)! < outcome.periodStartsAt)
    )
      latest.set(outcome.resourceFlowId, outcome.periodStartsAt);
  const due: { flow: ResourceFlow; on: IsoDate }[] = [];
  for (const flow of bills) {
    let on = firstOfNextMonth(latest.get(flow.id) ?? flow.startsAt);
    for (
      let month = 0;
      month < CATCH_UP_LIMIT_MONTHS && on <= next.currentDate;
      month++
    ) {
      due.push({ flow, on });
      on = firstOfNextMonth(on);
    }
  }
  due.sort(
    (a, b) => a.on.localeCompare(b.on) || a.flow.sequence - b.flow.sequence,
  );
  for (const payment of due)
    next = settleMonth(next, personId, payment.flow, payment.on);
  return next;
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

function settleMonth(
  world: World,
  personId: EntityId,
  flow: ResourceFlow,
  dueOn: IsoDate,
): World {
  const periodTerms = resourceFlowTermsAt(world, flow.id, {
    asOfDate: dueOn,
    historySequenceExclusive: world.history.nextSequence,
  });
  // A current reader cannot revive an ended or suspended bill for an old due day.
  if (!periodTerms || periodTerms.status !== "active") return world;
  const monthly = periodTerms.amount;
  // The old authored $1,500+ basket included housing. A sourced nonhousing
  // basket is never labeled rent merely because its dollar amount is higher.
  const renting =
    flow.source.kind === "person" &&
    periodTerms.provenance.kind === "authored" &&
    monthly.minorUnits >= LEGACY_RENT_INCLUDED_MINIMUM_MINOR;
  // The lowest balance from the day the month fell due to today. A long quiet
  // stretch is settled late, and a charge backdated to its due day must not
  // take money that something dated after it (tuition, say) already spent.
  const owner = flow.source;
  if (
    !resourcePositionAt(world, owner, monthly.currency, {
      asOfDate: dueOn,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    return world; // Missing saved cash is not a zero balance or a missed payment.
  const balanceOn = (asOfDate: IsoDate) =>
    resourcePositionAt(world, owner, monthly.currency, {
      asOfDate,
      historySequenceExclusive: world.history.nextSequence,
    })?.liquidBalance.minorUnits ?? 0;
  const checkpoints = new Set<IsoDate>([dueOn, world.currentDate]);
  for (const outcome of world.history.resourceTransferOutcomes)
    if (outcome.occurredAt > dueOn && outcome.occurredAt < world.currentDate)
      checkpoints.add(outcome.occurredAt);
  const available = Math.max(0, Math.min(...[...checkpoints].map(balanceOn)));
  const paid = Math.min(available, monthly.minorUnits);
  const status =
    paid === monthly.minorUnits ? "completed" : paid > 0 ? "partial" : "missed";
  const next = recordResourceTransferOutcome(world, {
    stableKey: `${flow.stableKey}:${dueOn}`,
    resourceFlowId: flow.id,
    periodStartsAt: dueOn,
    periodEndsAt: dueOn,
    occurredAt: dueOn,
    status,
    attemptedAmount: monthly,
    transferredAmount: money(paid, monthly.currency),
    reasonKind: status === "completed" ? null : "capacity:insufficient-funds",
    note: renting
      ? `Rent, food and bills for ${monthName(dueOn)}.`
      : `Food and bills for ${monthName(dueOn)}.`,
    provenance: periodTerms.provenance,
  });
  return status === "completed"
    ? next
    : recordFirstShortfall(
        next,
        personId,
        monthly.minorUnits,
        paid,
        dueOn,
        renting,
      );
}

/**
 * The first month this life could not cover, as something it now carries.
 *
 * Written once while the moment it opens is unanswered and never after it has
 * been played: the scene happens once in a life, and a second notice nobody
 * could ever answer would sit in the life for good. Later short months are still
 * on the record as short transfers.
 */
function recordFirstShortfall(
  world: World,
  personId: EntityId,
  owedMinor: number,
  paidMinor: number,
  dueOn: IsoDate,
  renting: boolean,
): World {
  const costs = renting ? "rent, food and bills" : "food and bills";
  const already = world.history.events.some(
    (event) =>
      event.involvedEntityIds.includes(personId) &&
      (event.tags.includes(HOUSEHOLD_SHORTFALL_TAG) ||
        event.tags.includes(SHORTFALL_ANSWER)),
  );
  if (already) return world;
  const person = world.people[personId]!;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;
  const summary =
    paidMinor > 0
      ? `${monthName(dueOn)}'s ${costs} came to ${dollars(owedMinor)}, and you had ${dollars(paidMinor)} to put toward them. You are ${dollars(owedMinor - paidMinor)} short.`
      : `${monthName(dueOn)}'s ${costs} came to ${dollars(owedMinor)}, and you had nothing left to put toward them.`;
  const stableKey = `living-costs-shortfall:${personId}:${dueOn}`;
  const next = recordWorldEvent(world, {
    stableKey,
    type: "life.living-costs-short",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "Could not cover the month" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [HOUSEHOLD_SHORTFALL_TAG],
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
