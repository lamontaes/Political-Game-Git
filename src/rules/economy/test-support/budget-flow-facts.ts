/** Raw same-World records plus separately owned account identity, parked custody and recorded law-cost receipts. No budget totals or peer choice is selected here. */
import { publicTaxAccountForIdentity } from "../../../simulation/tax-policy";
import {
  publicGovernmentIdentityForRecord,
  publicGovernmentIdentityKey,
} from "../../laws/public-identity";
import { heldCashBailMinorUnits } from "../../../simulation/justice/cash-bail";
import { publicProgramCostsForMonth } from "../../../simulation/federal-cost-ledger";
import { governmentUnit } from "../../../simulation/government-units";
import { municipalGovernmentByKey } from "../../../simulation/municipal-government";
import {
  GOVERNMENT_BUDGET_CATEGORIES,
  type PublicBudgetStore,
} from "../../../simulation/public-budgets/store";
import { FEDERAL_EMPLOYMENT_RULES } from "../../../simulation/statutory-tax-rules";
import { FEDERAL_INCOME_TAX_KEY } from "../../../simulation/statutory-tax";
import { makeIsoDate } from "../../../simulation/dates";
import type {
  World,
  PublicGovernmentIdentity,
} from "../../../simulation/types";
import type { BudgetFlowFacts } from "../budget-flows";
export function budgetFlowFacts(
  world: World,
  store: PublicBudgetStore,
): BudgetFlowFacts {
  const governments = [
    ...store.governments,
    ...(store.federalGovernment ? [store.federalGovernment] : []),
  ];
  const accounts: BudgetFlowFacts["accounts"] extends ReadonlyMap<
    string,
    infer V
  >
    ? Map<string, V>
    : never = new Map();
  const add = (identity: PublicGovernmentIdentity) => {
    accounts.set(
      publicGovernmentIdentityKey(identity),
      publicTaxAccountForIdentity(world, identity),
    );
  };
  for (const government of governments)
    add(publicGovernmentIdentityForRecord(government));
  const units: BudgetFlowFacts["units"] extends ReadonlyMap<string, infer V>
    ? Map<string, V>
    : never = new Map();
  const municipalities: BudgetFlowFacts["municipalities"] extends ReadonlyMap<
    string,
    infer V
  >
    ? Map<string, V>
    : never = new Map();
  for (const row of world.history.organizations) {
    if (!row.stableKey.startsWith("public-government:local:")) continue;
    const governmentKey = decodeURIComponent(
      row.stableKey.slice("public-government:local:".length),
    );
    units.set(governmentKey, governmentUnit(governmentKey));
    municipalities.set(governmentKey, municipalGovernmentByKey(governmentKey));
    for (const government of governments)
      add({
        kind: "local-government",
        governmentKey,
        jurisdictionId: government.jurisdictionId,
      });
  }
  const dates = [
    ...new Set(
      world.history.resourceTransferOutcomes
        .slice(store.cursor.outcomes)
        .map((row) => makeIsoDate(row.occurredAt.slice(0, 7) + "-01")),
    ),
  ];
  return {
    records: world.history,
    cash: { id: world.id, onDate: world.currentDate, records: world.history },
    accounts,
    heldCashBail: new Map(
      world.history.organizations.map((row) => [
        row.id,
        heldCashBailMinorUnits(world, row.id),
      ]),
    ),
    costs: new Map(
      dates.map((month) => [month, publicProgramCostsForMonth(world, month)]),
    ),
    units,
    municipalities,
    categories: GOVERNMENT_BUDGET_CATEGORIES,
    employmentRules: FEDERAL_EMPLOYMENT_RULES,
    incomeTaxKey: FEDERAL_INCOME_TAX_KEY,
  };
}
