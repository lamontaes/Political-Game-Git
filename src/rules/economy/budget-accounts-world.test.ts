import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  ensureOpeningGovernmentAccounts as native,
  selectLocalOpeningAccount as nativeSelect,
} from "../../simulation/public-budgets/opening-government-accounts";
import { budgetCandidates } from "../../simulation/public-budgets/opening";
import { ensureStateJurisdictionForKey } from "../../simulation/nationwide-world/state-executives";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import { ensureLocalGovernmentOrganization } from "../../simulation/nationwide-world/local-governments";
import { ensurePublicGovernmentAccount } from "../../simulation/tax-policy";
import { ensureWorldStartingConditions } from "../../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import { withOpenedBudgets } from "../../simulation/public-budgets";
import {
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetStore,
} from "../../simulation/public-budgets/store";
import {
  ensureOpeningGovernmentAccounts,
  selectLocalOpeningAccount,
  type OpeningAccountRequest,
} from "./budget-accounts";
import { budgetAccountFacts } from "./test-support/budget-account-facts";
import type { World } from "../../simulation/types";
function apply(world: World, request: OpeningAccountRequest) {
  switch (request.op) {
    case "ensureStateJurisdictionForKey":
      return ensureStateJurisdictionForKey(world, ...request.args);
    case "ensureNationalElectionJurisdiction":
      return ensureNationalElectionJurisdiction(world, ...request.args);
    case "ensureLocalGovernmentOrganization":
      return ensureLocalGovernmentOrganization(world, ...request.args);
    case "ensurePublicGovernmentAccount":
      return ensurePublicGovernmentAccount(world, ...request.args);
  }
}
function compare(world: World): World {
  const expected = native(world);
  const process = ensureOpeningGovernmentAccounts(budgetAccountFacts(world));
  let step = process.next();
  while (!step.done) {
    world = apply(world, step.value);
    step = process.next(budgetAccountFacts(world));
  }
  expect(world).toEqual(expected);
  const facts = budgetAccountFacts(world);
  for (const candidate of budgetCandidates(world).candidates)
    if (candidate.level !== "state")
      expect(selectLocalOpeningAccount(facts, candidate)).toEqual(
        nativeSelect(world, candidate),
      );
  return world;
}
describe("complete opening public-account amount/identity/ordered requests through native public owners", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          seed: "rules2:economy:budget-accounts:" + usps,
        });
        const opened = compare(fixture.world);
        expect(opened.history.resourcePositions.length).toBeGreaterThan(0);
        compare(opened);
        const conditioned = ensureWorldStartingConditions(fixture.world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        });
        const empty: PublicBudgetStore = {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [],
          adjustments: [],
          unknown: [],
        };
        const source = {
          ...conditioned,
          publicBudgets: withOpenedBudgets(
            conditioned,
            empty,
            conditioned.currentDate,
          ),
        };
        const withSaved = compare(source);
        expect(
          withSaved.jurisdictions[NATIONAL_ELECTION_JURISDICTION.id],
        ).toBeDefined();
        compare(withSaved);
      },
      30000,
    );
});
