import { ageOnDate } from "../simulation/dates";
import {
  HOME_BUYING_AGE,
  HOME_PURCHASE_CURRENCY,
  MORTGAGE_BASIS,
  homePurchaseReason,
  homePurchaseTerms,
  moneyIsTracked,
  ownedHomeFor,
} from "../simulation/home-purchase";
import { householdMembershipsAt } from "../simulation/life-queries";
import { outstandingDebtAt } from "../simulation/resource-queries";
import type { EntityId, MoneyAmount, World } from "../simulation/types";
import { money } from "../simulation/resources";

export type HomePurchaseView =
  | {
      readonly kind: "owns";
      readonly mortgageLeft: MoneyAmount | null;
    }
  | {
      readonly kind: "can-buy" | "cannot-buy";
      readonly price: MoneyAmount;
      readonly downPayment: MoneyAmount;
      /** Null when the economy has no recorded mortgage rate yet. */
      readonly monthlyPayment: MoneyAmount | null;
    };

/**
 * What the Money and property section says about a home. A read: it writes
 * nothing and spends no time.
 */
export function projectHomePurchase(
  world: World,
  personId: EntityId,
): HomePurchaseView | null {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  const homes = householdMembershipsAt(world, personId).filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  const householdId = homes.length === 1 ? homes[0]!.household.id : null;
  const owned = householdId ? ownedHomeFor(world, householdId) : null;
  if (owned) {
    const obligation = world.history.resourceObligations.find(
      (record) =>
        record.housingTenureId === owned.id &&
        record.basisKind === MORTGAGE_BASIS,
    );
    const owed = obligation ? outstandingDebtAt(world, obligation.id) : null;
    return { kind: "owns", mortgageLeft: owed };
  }
  const person = world.people[personId];
  // Nothing to offer a child, or anyone whose money the game does not hold:
  // an offer with no balance behind it is not a choice.
  if (
    !person ||
    ageOnDate(person.birthDate, world.currentDate) < HOME_BUYING_AGE
  )
    return null;
  if (!moneyIsTracked(world, personId)) return null;
  const currency = HOME_PURCHASE_CURRENCY;
  const terms = homePurchaseTerms(world, person.homeJurisdictionId);
  const reason = homePurchaseReason(world, personId);
  return {
    kind: reason ? "cannot-buy" : "can-buy",
    price: money(terms.priceMinor, currency),
    downPayment: money(terms.downPaymentMinor, currency),
    monthlyPayment:
      terms.monthlyPaymentMinor === null
        ? null
        : money(terms.monthlyPaymentMinor, currency),
  };
}
