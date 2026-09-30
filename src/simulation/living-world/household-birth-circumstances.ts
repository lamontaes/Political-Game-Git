import { ageOnDate } from "../dates";
import {
  activePartnershipsAt,
  currentLifeCutoff,
  householdLocationAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import { outcomeFactor, type OutcomeReading } from "../outcome-web";
import { childrenOf } from "../people-family";
import { familyPlans, type FamilyPlan } from "../people-family-plan";
import {
  activeDwellingOccupanciesAt,
  dwellingOccupancyStateAt,
} from "../resource-queries";
import type { EntityId, IsoDate, World } from "../types";
import { isPersonAliveAt } from "../vitality-integrity";
import { householdHousingFacts } from "./town-rent";

/** Evidence for a household decision, not a fertility rate or birth choice. */
export interface HouseholdBirthCircumstances {
  readonly householdId: EntityId;
  readonly readAt: IsoDate;
  readonly adults: readonly {
    readonly personId: EntityId;
    readonly age: number;
    readonly membershipId: EntityId;
    readonly membershipStateId: EntityId;
    readonly partnershipIds: readonly EntityId[];
    readonly childPersonIds: readonly EntityId[];
  }[];
  /** Explicit requests and answers; an agreement is not a pregnancy. */
  readonly plans: readonly FamilyPlan[];
  readonly primaryOccupancyIds: readonly EntityId[];
  readonly dwellingIds: readonly EntityId[];
  /** Current compensation terms, not observed take-home pay or all income. */
  readonly monthlyPayTermsMinor: number | null;
  readonly monthlyRentTermsMinor: number | null;
  readonly policyPressure: OutcomeReading;
  readonly missing: readonly string[];
}

/** Pure current-date reader. Missing desire, capacity and timing stay unknown. */
export function householdBirthCircumstances(
  world: World,
  householdId: EntityId,
  town: EntityId,
): HouseholdBirthCircumstances {
  if (!world.history.households.some((row) => row.id === householdId))
    throw new Error("Birth circumstances require a recorded household.");
  const cutoff = currentLifeCutoff(world);
  if (householdLocationAt(world, householdId, cutoff)?.jurisdictionId !== town)
    throw new Error("Birth pressure requires the household's recorded place.");
  const adults = peopleInHouseholdAt(world, householdId, cutoff).flatMap(
    (personId) => {
      if (!isPersonAliveAt(world, personId, cutoff)) return [];
      const person = world.people[personId]!;
      const age = ageOnDate(person.birthDate, world.currentDate);
      if (age < 18) return [];
      const membership = householdMembershipsAt(world, personId, cutoff).find(
        (row) =>
          row.household.id === householdId &&
          row.state.residenceRole === "primary",
      );
      if (!membership) return [];
      return [
        {
          personId,
          age,
          membershipId: membership.membership.id,
          membershipStateId: membership.state.id,
          partnershipIds: activePartnershipsAt(world, personId, cutoff).map(
            (row) => row.id,
          ),
          childPersonIds: childrenOf(world, personId),
        },
      ];
    },
  );
  const adultIds = new Set(adults.map((row) => row.personId));
  const plans = [
    ...new Map(
      adults
        .flatMap((row) => familyPlans(world, row.personId))
        .filter(
          (plan) =>
            plan.kind === "birth" &&
            plan.personIds.every((id) => adultIds.has(id)),
        )
        .map((plan) => [plan.eventId, plan]),
    ).values(),
  ];
  const primary = activeDwellingOccupanciesAt(world, cutoff).filter(
    (row) =>
      row.occupant.kind === "household" &&
      row.occupant.householdId === householdId &&
      dwellingOccupancyStateAt(world, row.id, cutoff)?.residenceRole ===
        "primary",
  );
  const terms = householdHousingFacts(world, world.currentDate).get(
    householdId,
  );
  return {
    householdId,
    readAt: world.currentDate,
    adults,
    plans,
    primaryOccupancyIds: primary.map((row) => row.id),
    dwellingIds: primary.map((row) => row.dwellingId),
    monthlyPayTermsMinor: terms?.payMinor ?? null,
    monthlyRentTermsMinor: terms?.rentMinor ?? null,
    policyPressure: outcomeFactor(
      world,
      town,
      "births.rate",
      world.currentDate,
    ),
    missing: [
      ...(plans.every((plan) => plan.childPersonId !== null)
        ? ["recorded-child-intention"]
        : []),
      ...(primary.length === 0 ? ["recorded-primary-home"] : []),
      ...(terms?.payMinor == null ? ["recorded-pay-terms"] : []),
      "reproductive-capacity",
      "intention-to-birth-timing",
      "household-policy-pressure-response",
    ],
  };
}
