import { applyLawConsequences } from "./enacted-law-effects";
import { makeIsoDate } from "./dates";
import type { FutureDueItem, FutureTransitionHandlerResult } from "./types";
import {
  PROPERTY_ASSESSMENT_TRANSITION_KEY,
  isTypedPropertyTax,
  schedulePropertyAssessmentDay,
} from "./property-tax-schedule";
import { effectiveTaxPolicy } from "./tax-policy";
import { ageOnDate } from "./dates";
import { householdMembershipsAt } from "./life-queries";
import {
  bedroomsForHousehold,
  hudRentRowFor,
  marketRentMinor,
} from "./living-world/town-rent";
import { homePurchaseTerms } from "./home-purchase";
import { countyGeoidsForPlace, governmentUnit } from "./government-units";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  activeHousingTenuresAt,
  resourceFlowTermsAt,
} from "./resource-queries";
import { money } from "./resources";
import { recordTaxBase } from "./tax-policy";
import type { EntityId, World } from "./types";
import { placeStateKey } from "./state-jurisdiction-id";
import type { TaxProposalRecord } from "./tax-types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

export const PROPERTY_BASE_KEY = "tax-base:property-value";

/** Whether a dwelling's place lies in the government's jurisdiction: the town
 * itself for a city, any place with a part in the county for a county. */
export function placeInGovernment(
  dwellingJurisdictionId: EntityId,
  governmentKey: string,
  governmentJurisdictionId: EntityId,
): boolean {
  if (dwellingJurisdictionId === governmentJurisdictionId) return true;
  const unit = governmentUnit(governmentKey);
  if (unit?.unitType !== "county" || !unit.countyGeoid) return false;
  const place = lifePlaceByJurisdictionId(dwellingJurisdictionId);
  return (
    !!place?.sourceGeoid &&
    countyGeoidsForPlace(place.sourceGeoid).includes(unit.countyGeoid)
  );
}

/** Whether a typed property or payroll tax of any level reaches a place: a
 * city or county by its own bounds, a state's by the state the place lies in. */
export function taxReachesPlace(
  world: World,
  proposal: TaxProposalRecord,
  placeJurisdictionId: EntityId,
): boolean {
  const identity = proposal.publicGovernmentIdentity;
  if (identity?.kind === "local-government")
    return placeInGovernment(
      placeJurisdictionId,
      identity.governmentKey,
      identity.jurisdictionId,
    );
  return (
    proposal.power?.level === "STATE" &&
    placeStateKey(world, placeJurisdictionId) === proposal.power.jurisdictionKey
  );
}

/**
 * Records one property tax base for each household home this local tax reaches,
 * on the day the owner or renter is assessed. An owner's base is the home's
 * price at the place's current level; a renter's is a year of the rent they
 * pay. The payer is whoever pays the mortgage or the rent. Each household is
 * assessed once a year, and reading this changes nothing.
 */
export function recordPropertyTaxBases(
  world: World,
  proposalId: EntityId,
): World {
  const proposal = world.history.taxProposals?.find(
    (row) => row.id === proposalId,
  );
  if (!proposal || !isTypedPropertyTax(proposal)) return world;
  const year = world.currentDate.slice(0, 4);
  const h = world.history;
  const flows = new Map(h.resourceFlows.map((flow) => [flow.id, flow]));
  const dwellings = new Map(h.dwellings.map((row) => [row.id, row]));
  const payers = new Map<EntityId, EntityId>();
  for (const obligation of h.resourceObligations) {
    const flow = flows.get(obligation.resourceFlowId);
    if (obligation.housingTenureId && flow?.source.kind === "person")
      payers.set(obligation.housingTenureId, flow.source.personId);
  }
  /** The oldest adult living in the household: whoever the bill goes to when
   * no mortgage or lease names a payer. */
  const residentPayer = (householdId: EntityId): EntityId | null => {
    const residents = h.householdMemberships
      .filter((row) => row.householdId === householdId)
      .map((row) => row.personId)
      .filter(
        (personId, index, all) =>
          all.indexOf(personId) === index &&
          world.people[personId] &&
          householdMembershipsAt(world, personId).some(
            (active) =>
              active.membership.householdId === householdId &&
              active.state.residenceRole === "primary",
          ),
      );
    return (
      residents
        .filter(
          (personId) =>
            ageOnDate(world.people[personId]!.birthDate, world.currentDate) >=
            18,
        )
        .sort(
          (a, b) =>
            world.people[a]!.birthDate.localeCompare(
              world.people[b]!.birthDate,
            ) || a.localeCompare(b),
        )[0] ?? null
    );
  };
  let next = world;
  for (const tenure of activeHousingTenuresAt(world)) {
    const dwelling = dwellings.get(tenure.dwellingId);
    if (!dwelling || tenure.holder.kind !== "household") continue;
    const householdId = tenure.holder.householdId;
    const payerId = payers.get(tenure.id) ?? residentPayer(householdId);
    if (!payerId || !taxReachesPlace(world, proposal, dwelling.jurisdictionId))
      continue;
    const owner = tenure.kind.startsWith("ownership");
    const rent = h.resourceObligations
      .filter((row) => row.housingTenureId === tenure.id)
      .map(
        (row) =>
          resourceFlowTermsAt(world, row.resourceFlowId)?.amount.minorUnits ??
          0,
      );
    const rentRow = owner ? null : hudRentRowFor(dwelling.jurisdictionId);
    const recordedRent = (rent[0] ?? 0) * 12;
    const estimatedRent =
      recordedRent === 0 && rentRow
        ? marketRentMinor(
            world,
            dwelling.jurisdictionId,
            rentRow,
            bedroomsForHousehold(
              Math.max(
                1,
                h.householdMemberships.filter(
                  (row) => row.householdId === householdId,
                ).length,
              ),
            ),
            world.currentDate,
          ) * 12
        : 0;
    const amountMinor = owner
      ? homePurchaseTerms(world, dwelling.jurisdictionId, payerId).priceMinor
      : recordedRent || estimatedRent;
    const stableKey = `property-base:${proposal.id}:${tenure.id}:${year}`;
    if (
      (next.history.taxBases ?? []).some((row) => row.stableKey === stableKey)
    )
      continue;
    if (amountMinor <= 0) continue;
    next = recordWorldEvent(next, {
      stableKey: `event:${stableKey}`,
      type: "tax.property-assessed",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: proposal.jurisdictionId,
      involvedEntityIds: [payerId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["tax"],
      summary: owner
        ? "The household's home was assessed at its value for the local property tax."
        : "The household's rent for the year was assessed for the local property tax.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    next = recordTaxBase(next, {
      stableKey,
      sourceEventId: next.history.events.at(-1)!.id,
      jurisdictionId: proposal.jurisdictionId,
      payer: { kind: "person", personId: payerId },
      baseKey: PROPERTY_BASE_KEY,
      occurredAt: next.currentDate,
      amount: money(amountMinor, proposal.terms.currency),
      assumptionNote: owner
        ? "ESTIMATED FROM AVERAGE: the home's price at the place's current level, not a county appraisal."
        : recordedRent
          ? "A year of the rent recorded on the household's lease."
          : "ESTIMATED FROM AVERAGE: a year of the market rent for a home of this household's size in this place, because no lease amount is recorded.",
    });
  }
  if (next !== world) assertWorldIntegrity(next);
  return next;
}

/**
 * One assessment day: while this property tax is the series' effective policy,
 * every household home it reaches is assessed once, the saved law is applied
 * to each named payer, and the next day is set a year on. A repealed or
 * replaced tax stops here: no later day is scheduled.
 */
export function propertyAssessmentDayHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const proposal = world.history.taxProposals?.find(
    (row) => row.id === dueItem.entityIds[0],
  );
  const done = (
    next: World,
    context: string,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  });
  if (!proposal) return done(world, "No saved property tax matches.");
  const today = world.currentDate;
  const policy = effectiveTaxPolicy(
    world,
    proposal.jurisdictionId,
    proposal.terms.seriesKey,
    today,
  );
  if (!policy || policy.proposalId !== proposal.id)
    return done(world, "This property tax is no longer the policy in force.");
  const prefix = `property-base:${proposal.id}:`;
  const before = new Set((world.history.taxBases ?? []).map((row) => row.id));
  let next = recordPropertyTaxBases(world, proposal.id);
  for (const base of next.history.taxBases ?? []) {
    if (before.has(base.id) || !base.stableKey.startsWith(prefix)) continue;
    if (base.payer.kind !== "person") continue;
    next = applyLawConsequences(next, {
      onDate: today,
      activity: "assessment",
      activityId: base.id,
      subjectIds: [base.payer.personId],
      governingLawId: proposal.measureId,
    });
  }
  const following = makeIsoDate(
    `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`,
  );
  next = schedulePropertyAssessmentDay(
    next,
    proposal.id,
    following,
    proposal.jurisdictionId,
  );
  return done(next, "The year's households were assessed.");
}

export function propertyTaxHandlers() {
  return [
    [PROPERTY_ASSESSMENT_TRANSITION_KEY, propertyAssessmentDayHandler],
  ] as const;
}
