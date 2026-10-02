import { makeIsoDate } from "./dates";
import { householdMembershipsAt, peopleInHouseholdAt } from "./life-queries";
import { lifePlaceByJurisdictionId } from "./life-places";
import { recordEventKnowledge } from "./records";
import {
  createResourceFlow,
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
  representativeMonthlyLivingCostsMinor,
  livingCostsRegionForState,
  estimatedMonthlyHouseholdLivingCosts,
} from "./living-costs-data";
import { townLeases } from "./living-world/town-rent";
import { recordWorldEvent } from "./world";
import { drawnLinkSize } from "./outcome-web";
import type { EntityId, IsoDate, ResourceFlow, World } from "./types";

/**
 * What it costs a person to live, charged on the first of each month.
 *
 * Before this nothing was ever spent. Pay arrived after every shift and no
 * rent, food or bill was ever charged, so in the long playthrough Fatima
 * Erickson worked a part-time shop job in Eastport, Maine for three years and
 * had $87,984 saved. Money never forced a choice.
 *
 * The plumbing is real; the nonhousing amount is a sourced representative
 * estimate, not an observed bill. Each month the person being
 * played pays their share of the household's living costs from their own
 * recorded money, through the same flow-and-outcome records pay and tuition
 * already use, so the balance anywhere in the game reads it with no extra
 * code. A month they cannot cover is recorded as short, not as debt, and the
 * first shortfall is written down as something the life now carries, which is
 * what `adult.household-money-shortfall` was withheld for.
 *
 * Two rules keep it honest:
 *
 * - Nobody is charged whose money the game is not tracking. A person with no
 *   recorded position has unknown finances, and unknown is not zero.
 * - Nothing is charged for time before the charge existed. An old save starts
 *   paying from the day it is next opened, not for the years behind it.
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
  return (
    world.history.resourceFlows.find(
      (flow) => flow.stableKey === flowKey(personId),
    ) ?? null
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
  const place = lifePlaceByJurisdictionId(
    world.people[personId]!.homeJurisdictionId,
  );
  const estimate = estimatedMonthlyHouseholdLivingCosts(
    livingCostsRegionForState(place?.stateJurisdictionKey ?? null),
    residents.size,
  );
  const jurisdictionId =
    place?.context.jurisdiction.id ??
    world.people[personId]!.homeJurisdictionId;
  return {
    householdId,
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

/**
 * Only the sourced representative nonhousing basket is charged here. Actual lease and
 * mortgage writers settle housing separately; this flow must not charge it twice.
 */
function monthlyCostMinor(world: World, personId: EntityId): number {
  const place = lifePlaceByJurisdictionId(
    world.people[personId]!.homeJurisdictionId,
  );
  return representativeMonthlyLivingCostsMinor(
    livingCostsRegionForState(place?.stateJurisdictionKey ?? null),
  );
}

const livingCostsProvenance = {
  kind: "source-record" as const,
  reference: `${LIVING_COSTS_SOURCE}#Table-1800; 2024 observation year; A637 gives December 2025 publication, month-end availability cutoff is not an exact publication day; ESTIMATED FROM AVERAGE: selected retained regional annual categories per consumer unit divided by derived adults and 12 months; territories use the national estimate; not an observed bill.`,
  asOf: makeIsoDate(REPRESENTATIVE_LIVING_COSTS.sourceAvailableBy),
};

function dollars(minor: number): string {
  return (minor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function livingCostsPayerContext(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) return null;
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  )
    return null;
  const currency = money(0, REPRESENTATIVE_LIVING_COSTS.currency).currency;
  const owner = { kind: "person" as const, personId };
  const tracked = world.history.resourcePositions.some(
    (position) =>
      sameEndpoint(position.owner, owner) &&
      position.openingBalance.currency === currency,
  );
  if (!tracked) return null;
  const householdId = primaryHouseholdId(world, personId);
  if (!householdId) return null;
  return { person, currency, owner, householdId };
}

function openLivingCostsFlow(
  world: World,
  personId: EntityId,
  context: NonNullable<ReturnType<typeof livingCostsPayerContext>>,
): World {
  if (livingCostsFlowFor(world, personId)) return world;
  if (world.currentDate < livingCostsProvenance.asOf) return world;
  const { person, currency, owner, householdId } = context;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  return createResourceFlow(world, {
    stableKey: flowKey(personId),
    source: owner,
    // Paid to the household, which is what consumes it. No household keeps
    // a balance today; if one ever does, this money is spent, not saved,
    // and must be routed on rather than shown as the household's.
    recipient: { kind: "household", householdId },
    startsAt: world.currentDate,
    amount: money(monthlyCostMinor(world, personId), currency),
    cadenceKind: "schedule:monthly",
    basisKind: LIVING_COSTS_BASIS,
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: place?.context.jurisdiction.id ?? null,
    provenance: livingCostsProvenance,
  });
}

/**
 * Opens the recorded charge at the caller's actual date without making a payment.
 * Opening callers use this before scheduling the next monthly settlement. Old
 * saves open a missing flow now, never retroactively; existing flows are untouched.
 */
export function initializeLivingCostsFlow(
  world: World,
  personId: EntityId,
): World {
  if (recordedProviderBills(world, personId).length)
    return endReplacedPersonalEstimate(world, personId);
  const context = livingCostsPayerContext(world, personId);
  return context ? openLivingCostsFlow(world, personId, context) : world;
}

/**
 * Settles every month of living costs that has come due, and stops.
 *
 * Idempotent: each month is keyed by the first day it is due, so calling this twice,
 * or after a reload, writes nothing new. Called from the same transitions that
 * write the household's next week of errands, and from nothing that only reads.
 */
export function settleLivingCosts(world: World, personId: EntityId): World {
  const providerBills = recordedProviderBills(world, personId);
  if (providerBills.length) {
    let next = endReplacedPersonalEstimate(world, personId);
    const latest = new Map<EntityId, IsoDate>();
    const ids = new Set(providerBills.map((flow) => flow.id));
    for (const outcome of next.history.resourceTransferOutcomes)
      if (
        ids.has(outcome.resourceFlowId) &&
        (!latest.has(outcome.resourceFlowId) ||
          latest.get(outcome.resourceFlowId)! < outcome.periodStartsAt)
      )
        latest.set(outcome.resourceFlowId, outcome.periodStartsAt);
    const due: { flow: ResourceFlow; on: IsoDate }[] = [];
    for (const flow of providerBills) {
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
    // Saved creation order breaks same-day ties; no invented provider priority.
    due.sort(
      (a, b) => a.on.localeCompare(b.on) || a.flow.sequence - b.flow.sequence,
    );
    for (const payment of due)
      next = settleMonth(next, personId, payment.flow, payment.on);
    return next;
  }
  const context = livingCostsPayerContext(world, personId);
  if (!context) return world;
  let next = openLivingCostsFlow(world, personId, context);
  if (next !== world) return next; // First call only opens the charge, as before.
  const existingFlow = livingCostsFlowFor(next, personId);
  if (!existingFlow) return next; // The cited estimate is not available yet.
  let flow = existingFlow;
  const monthly = money(monthlyCostMinor(world, personId), context.currency);

  // Replace legacy estimates prospectively, never rewrite saved old terms/payments.
  const terms = resourceFlowTermsAt(next, flow.id);
  if (
    terms &&
    next.currentDate >= livingCostsProvenance.asOf &&
    terms.status === "active" &&
    terms.amount.minorUnits !== monthly.minorUnits
  ) {
    const effectiveAt = next.currentDate;
    next = recordResourceFlowTerms(next, {
      stableKey: `${flow.stableKey}:terms:${effectiveAt}`,
      resourceFlowId: flow.id,
      effectiveAt,
      status: "active",
      amount: monthly,
      cadenceKind: terms.cadenceKind,
      reason:
        "Representative food, gasoline, vehicle upkeep, drugs, medical supplies, clothing and miscellaneous bills; housing is paid separately. Public transit, health premiums and medical services are outside this retained basket.",
      provenance: livingCostsProvenance,
      supersedesTermsId: terms.id,
    });
  }

  // Rent is paid monthly, so everything is due on the first of the month,
  // starting with the first one after the charge began. Resume after the
  // latest month settled; the limit bounds one transition's catch-up only.
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
    next = settleMonth(next, personId, flow, dueOn);
    flow = livingCostsFlowFor(next, personId)!;
    dueOn = firstOfNextMonth(dueOn);
  }
  return next;
}

/** R9's admitted provider path uses a saved bill, never a guessed merchant. */
function recordedProviderBills(
  world: World,
  personId: EntityId,
): readonly ResourceFlow[] {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  )
    return [];
  const householdId = primaryHouseholdId(world, personId);
  if (!householdId) return [];
  return world.history.resourceFlows.filter(
    (flow) =>
      flow.source.kind === "household" &&
      flow.source.householdId === householdId &&
      flow.basisKind === LIVING_COSTS_BASIS &&
      flow.startsAt <= world.currentDate &&
      resourceFlowTermsAt(world, flow.id)?.cadenceKind === "schedule:monthly" &&
      !sameEndpoint(flow.source, flow.recipient),
  );
}

function endReplacedPersonalEstimate(world: World, personId: EntityId): World {
  const old = livingCostsFlowFor(world, personId);
  if (!old) return world;
  const terms = resourceFlowTermsAt(world, old.id);
  if (!terms || terms.status !== "active") return world;
  return recordResourceFlowTerms(world, {
    stableKey: `${old.stableKey}:recorded-provider-cutover:${world.currentDate}`,
    resourceFlowId: old.id,
    effectiveAt: world.currentDate,
    status: "ended",
    amount: terms.amount,
    cadenceKind: terms.cadenceKind,
    reason:
      "Recorded household provider bills replace the personal nonhousing estimate prospectively.",
    provenance: terms.provenance,
    supersedesTermsId: terms.id,
  });
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
