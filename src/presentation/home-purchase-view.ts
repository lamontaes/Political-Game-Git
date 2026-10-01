import { ageOnDate } from "../simulation/dates";
import { loanTermsAt } from "../simulation/household-loans";
import {
  HOME_BUYING_AGE,
  HOME_PURCHASE_PLACEHOLDER,
  MORTGAGE_BASIS,
  homePurchaseReason,
  homePurchaseTerms,
  moneyIsTracked,
  ownedHomeFor,
  type HomeMortgageInput,
} from "../simulation/home-purchase";
import { householdMembershipsAt } from "../simulation/life-queries";
import { outstandingDebtAt } from "../simulation/resource-queries";
import type { EntityId, World } from "../simulation/types";
import { dollars } from "./campaign-life-surface";
import { money } from "../simulation/resources";

export type HomePurchaseView =
  | {
      readonly kind: "owns";
      readonly headline: string;
      readonly mortgageLine: string | null;
    }
  | {
      readonly kind: "can-buy" | "cannot-buy";
      readonly headline: string;
      readonly terms: string;
      readonly reason: string | null;
    };

/**
 * What the Money and property section says about a home. A read: it writes
 * nothing and spends no time.
 */
export function projectHomePurchase(
  world: World,
  personId: EntityId,
  mortgage?: HomeMortgageInput,
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
        (record.basisKind === MORTGAGE_BASIS ||
          record.basisKind === "debt:mortgage"),
    );
    const owed = obligation ? outstandingDebtAt(world, obligation.id) : null;
    return {
      kind: "owns",
      headline: "Your household owns its home.",
      mortgageLine:
        owed === null
          ? null
          : owed.minorUnits > 0
            ? loanTermsAt(world, obligation!.id, world.currentDate)
              ? `${dollars(owed)} is left on the mortgage.`
              : `${dollars(owed)} is left on the mortgage. Its payment terms are not available.`
            : "The mortgage is paid off.",
    };
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
  const currency = HOME_PURCHASE_PLACEHOLDER.currency;
  const terms = homePurchaseTerms(world, person.homeJurisdictionId, mortgage);
  const reason = homePurchaseReason(world, personId, mortgage);
  return {
    kind: reason ? "cannot-buy" : "can-buy",
    headline: "Buy a home",
    terms: terms.financingSupported
      ? `A house costs ${dollars(money(terms.priceMinor, currency))}. You pay ${dollars(money(terms.downPaymentMinor, currency))} down, then ${dollars(money(terms.monthlyPaymentMinor, currency))} a month on the mortgage instead of rent.`
      : `A house costs ${dollars(money(terms.priceMinor, currency))}. Financing terms are not available for this purchase.`,
    reason,
  };
}
