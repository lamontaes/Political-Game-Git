import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { withOpenedBudgets } from "../../simulation/public-budgets";
import {
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetStore,
} from "../../simulation/public-budgets/store";
import { readMonthFlows as nativeFlows } from "../../simulation/public-budgets/month";
import { estimateLocalOpeningCash as nativeCash } from "../../simulation/public-budgets/opening-government-accounts";
import { budgetCandidates } from "../../simulation/public-budgets/opening";
import { ensureStateJurisdictionForKey } from "../../simulation/nationwide-world/state-executives";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForIdentity,
} from "../../simulation/tax-policy";
import {
  createResourceFlow,
  recordResourceTransferOutcome,
  money,
} from "../../simulation/resources";
import { readMonthFlows } from "./budget-flows";
import { estimateLocalOpeningCash } from "./budget-local-cash";
import { budgetFlowFacts } from "./test-support/budget-flow-facts";
import type { World } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Explicit saved public-account cash and transfer controls, not ordinary tax or expenditure.",
};
function compare(world: World, store: PublicBudgetStore) {
  const facts = budgetFlowFacts(world, store);
  expect(readMonthFlows(facts, store)).toEqual(nativeFlows(world, store));
  for (const candidate of budgetCandidates(world).candidates)
    expect(
      estimateLocalOpeningCash({ store, flows: facts }, candidate),
    ).toEqual(nativeCash({ ...world, publicBudgets: store }, candidate));
}
describe("full monthly resource-flow/cash helper and local peer-stock parent across native public owners", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const fixture = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:budget-flows:" + usps,
      });
      let world = fixture.world;
      const empty: PublicBudgetStore = {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      };
      let store = withOpenedBudgets(world, empty, world.currentDate);
      compare(world, store);
      const stateGovernments = store.governments
        .filter((x) => x.level === "state")
        .slice(0, 3);
      for (const [index, government] of stateGovernments.entries()) {
        world = ensureStateJurisdictionForKey(world, government.stateKey);
        world = ensurePublicGovernmentAccount(
          world,
          { kind: "jurisdiction", jurisdictionId: government.jurisdictionId },
          {
            amountMinorUnits: 100000000 * (index + 1),
            sourceNote: provenance.note,
          },
        );
      }
      world = ensureNationalElectionJurisdiction(world);
      world = ensurePublicGovernmentAccount(
        world,
        {
          kind: "jurisdiction",
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        },
        { amountMinorUnits: 400000000, sourceNote: provenance.note },
      );
      store = withOpenedBudgets(world, store, world.currentDate);
      compare(world, store);
      const identities = [
        ...stateGovernments,
        ...(store.federalGovernment ? [store.federalGovernment] : []),
      ];
      for (const government of identities) {
        const account = publicTaxAccountForIdentity(world, {
          kind: "jurisdiction",
          jurisdictionId: government.jurisdictionId,
        })!;
        expect(account).toBeDefined();
        for (const basisKind of [
          "custom:tax-withholding",
          "custom:tax-collection",
          "custom:public-expense",
        ] as const) {
          const incoming = basisKind !== "custom:public-expense";
          world = createResourceFlow(world, {
            stableKey: "rules2:budget:flow:" + government.key + ":" + basisKind,
            source: incoming
              ? { kind: "person", personId: world.personOrder[0]! }
              : {
                  kind: "organization",
                  organizationId: account.organizationId,
                },
            recipient: incoming
              ? { kind: "organization", organizationId: account.organizationId }
              : { kind: "person", personId: world.personOrder[0]! },
            startsAt: world.currentDate,
            amount: money(12345, "USD"),
            cadenceKind: "schedule:monthly",
            basisKind,
            basisReference: { kind: "general" },
            restrictionKind: null,
            jurisdictionId: government.jurisdictionId,
            provenance,
          });
          world = recordResourceTransferOutcome(world, {
            stableKey:
              "rules2:budget:payment:" + government.key + ":" + basisKind,
            resourceFlowId: world.history.resourceFlows.at(-1)!.id,
            periodStartsAt: world.currentDate,
            periodEndsAt: world.currentDate,
            occurredAt: world.currentDate,
            status: "partial",
            attemptedAmount: money(12345, "USD"),
            transferredAmount: money(6000, "USD"),
            reasonKind: "capacity:insufficient-funds",
            note: provenance.note,
            provenance,
          });
        }
      }
      compare(world, store);
      compare(world, {
        ...store,
        cursor: {
          flows: world.history.resourceFlows.length,
          outcomes: world.history.resourceTransferOutcomes.length,
        },
      });
    });
});
