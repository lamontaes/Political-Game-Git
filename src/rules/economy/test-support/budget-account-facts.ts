/** Raw budget/life records, static geography views and shared dated account-ownership receipts; the lifted rule makes account and amount decisions. */
import * as units from "../../../simulation/government-units";
import * as municipal from "../../../simulation/municipal-government";
import * as places from "../../../simulation/life-places";
import { publicTaxAccountEvidenceForIdentity } from "../../../simulation/tax-policy";
import { PUBLIC_CASH_OPENING_PROFILE_VERSION } from "../../../simulation/world-setup/types";
import { NATIONAL_ELECTION_JURISDICTION } from "../../../simulation/national-election-geography";
import { budgetCandidates } from "../../../simulation/public-budgets/opening";
import { budgetFacts } from "./budget-facts";
import { budgetFlowFacts } from "./budget-flow-facts";
import {
  accountEvidenceKey,
  type OpeningAccountFacts,
  type AccountGeographyViews,
} from "../budget-accounts";
import type { BudgetGeographyViews } from "../budget-opening";
import type {
  World,
  PublicGovernmentIdentity,
} from "../../../simulation/types";
import {
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetStore,
} from "../../../simulation/public-budgets/store";
const allViews = new WeakMap<BudgetGeographyViews, AccountGeographyViews>();
export function budgetAccountFacts(world: World): OpeningAccountFacts {
  const candidates = budgetCandidates(world).candidates;
  const opening = budgetFacts(
    world,
    candidates.map((x) => x.jurisdictionId),
    [world.currentDate],
  );
  let views = allViews.get(opening.views);
  if (!views) {
    views = {
      budgetViews: opening.views,
      governmentUnit: units.governmentUnit,
      governmentUnitJurisdictionId: units.governmentUnitJurisdictionId,
      governmentUnitsForPlace: units.governmentUnitsForPlace,
      governmentUnitsForState: units.governmentUnitsForState,
      allGovernmentUnits: units.allGovernmentUnits,
      municipalGovernmentByKey: municipal.municipalGovernmentByKey,
      municipalGovernmentForPlaceGeoid:
        municipal.municipalGovernmentForPlaceGeoid,
      municipalGovernments: municipal.municipalGovernments,
      lifePlaceByKey: places.lifePlaceByKey,
      lifePlaceByJurisdictionId: places.lifePlaceByJurisdictionId,
    };
    allViews.set(opening.views, views);
  }
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const evidence: OpeningAccountFacts["evidence"] extends ReadonlyMap<
    string,
    infer V
  >
    ? Map<string, V>
    : never = new Map();
  const add = (identity: PublicGovernmentIdentity) =>
    evidence.set(
      accountEvidenceKey(identity, cutoff),
      publicTaxAccountEvidenceForIdentity(world, identity, cutoff),
    );
  for (const candidate of candidates) {
    add({ kind: "jurisdiction", jurisdictionId: candidate.jurisdictionId });
    for (const row of world.history.organizations) {
      if (!row.stableKey.startsWith("public-government:local:")) continue;
      const governmentKey = decodeURIComponent(
        row.stableKey.slice("public-government:local:".length),
      );
      add({
        kind: "local-government",
        governmentKey,
        jurisdictionId: candidate.jurisdictionId,
      });
    }
  }
  const empty: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  return {
    onDate: world.currentDate,
    jurisdictions: world.jurisdictions,
    records: world.history,
    opening,
    flows: budgetFlowFacts(world, world.publicBudgets ?? empty),
    store: world.publicBudgets,
    evidence,
    views,
    federalId: NATIONAL_ELECTION_JURISDICTION.id,
    profileVersion: PUBLIC_CASH_OPENING_PROFILE_VERSION,
  };
}
