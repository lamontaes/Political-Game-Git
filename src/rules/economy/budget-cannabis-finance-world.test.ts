import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { lawInForce as nativeLaw } from "../../simulation/governing/law-in-force";
import * as native from "../../simulation/public-budgets/cannabis-sales-revenue";
import { townTaxableSales as nativeSales } from "../../simulation/living-world/town-finances";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
  createMacroMonthlyStepHandler,
  MACRO_MONTHLY_STEP_KEY,
} from "../../simulation/macro-economy/producer";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import { taxLevyText as nativeText } from "../../simulation/tax-policy";
import { createStableId } from "../../simulation/ids";
import { makeCurrencyCode } from "../../simulation/resources";
import {
  cannabisSalesRevenueChange,
  cannabisTaxTermsForLaw,
  cannabisRetailRevenue,
} from "./budget-cannabis";
import { townTaxableSales } from "./finance-readings";
import { CANNABIS_TAX_EFFECT } from "./budget-tax-policy";
import { cannabisBudgetFacts } from "./test-support/cannabis-facts";
import { savedLaw } from "./test-support/saved-law";
import type { World, EntityId } from "../../simulation/types";
import type {
  TaxTerms,
  TaxProposalRecord,
  TaxPolicyRecord,
} from "../../simulation/tax-types";
const dates = ["2026-01-05", "2026-02-01", "2027-01-31", "2027-02-01"].map(
  makeIsoDate,
);
function contract(world: World, id: EntityId): World {
  const saved = savedLaw(
    world,
    CANNABIS_TAX_EFFECT.questionKey,
    id,
    0.07,
    "tax-rate",
    "ratio",
  );
  const measure = saved.history.legislativeMeasures!.at(-1)!;
  const provision = saved.history.legislativeProvisions!.at(-1)!;
  const enacted = saved.history.legislativeEnactments!.at(-1)!;
  const terms: TaxTerms = {
    seriesKey: "fixture-cannabis-excise",
    baseKey: "fixture-legal-retail",
    baseLabel: "authored contract sales",
    rateNumerator: 7,
    rateDenominator: 100,
    exemptBaseKeys: [],
    allowanceMinorUnits: 0,
    currency: makeCurrencyCode("USD"),
    effectiveDelayDays: 0,
    collectionLagDays: 0,
    publicPurpose: "contract comparison",
    assumptionNote: "Labeled source-reader control; no ordinary tax enactment.",
    legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
  };
  const proposal: TaxProposalRecord = {
    id: createStableId("tax-proposal", world.id + ":contract"),
    stableKey: "rules2:contract:proposal",
    sequence: saved.history.nextSequence,
    recordedAt: world.currentDate,
    measureId: measure.id,
    jurisdictionId: id,
    sponsorPersonId: world.personOrder[0]!,
    publicOrganizationId: createStableId(
      "organization",
      world.id + ":contract",
    ),
    power: null,
    terms,
    levyProvisionId: provision.id,
  };
  const policy: TaxPolicyRecord = {
    id: createStableId("tax-policy", world.id + ":contract"),
    stableKey: "rules2:contract:policy",
    sequence: proposal.sequence + 1,
    recordedAt: world.currentDate,
    proposalId: proposal.id,
    enactmentId: enacted.id,
    effectiveAt: world.currentDate,
    supersedesPolicyId: null,
    outcomeEventId: enacted.outcomeEventId,
  };
  return {
    ...saved,
    history: {
      ...saved.history,
      nextSequence: policy.sequence + 1,
      taxProposals: [...(saved.history.taxProposals ?? []), proposal],
      taxPolicies: [...(saved.history.taxPolicies ?? []), policy],
      legislativeProvisions: saved.history.legislativeProvisions!.map((row) =>
        row.id === provision.id
          ? {
              ...row,
              provisionKey: "tax-levy",
              text: nativeText(terms),
              operativeEffect: { kind: "tax-policy" as const },
            }
          : row,
      ),
    },
  };
}
describe("full cannabis budget parents and saved taxable-sales chain across all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          seed: "rules2:economy:budget-cannabis:" + usps,
        });
        const world = fixture.world;
        const id = stateJurisdictionForKey("US-" + usps)!.id;
        const government = {
          level: "state" as const,
          lawJurisdictionId: id,
          population: 12345,
        };
        const question = Object.values(world.policyCatalog.propositions).find(
          (row) => row.stableKey === CANNABIS_TAX_EFFECT.questionKey,
        )!;
        const adopted = contract(world, id);
        const negative = {
          ...adopted,
          history: {
            ...adopted.history,
            taxProposals: adopted.history.taxProposals!.map((row) => ({
              ...row,
              terms: { ...row.terms, allowanceMinorUnits: 1 },
            })),
          },
        };
        for (const saved of [
          world,
          savedLaw(world, CANNABIS_TAX_EFFECT.questionKey, id, null),
          adopted,
          negative,
        ]) {
          const facts = cannabisBudgetFacts(saved, [id], dates);
          for (const date of dates) {
            for (const level of ["state", "county", "city"] as const) {
              const g = { ...government, level };
              expect(cannabisSalesRevenueChange(facts, g, date)).toEqual(
                native.cannabisSalesRevenueChange(saved, g, date),
              );
            }
            const law = nativeLaw(saved, id, question.id, date);
            for (const binding of [
              null,
              adopted.history.taxProposals!.at(-1)!.terms,
              { seriesKey: "other", baseKey: "other" },
            ])
              expect(
                cannabisTaxTermsForLaw(facts, law, id, binding, date),
              ).toEqual(
                native.cannabisTaxTermsForLaw(saved, law, id, binding, date),
              );
          }
        }
        const operative = nativeLaw(
          adopted,
          id,
          question.id,
          world.currentDate,
        );
        expect(
          cannabisTaxTermsForLaw(
            cannabisBudgetFacts(adopted, [id], dates),
            operative,
            id,
            adopted.history.taxProposals!.at(-1)!.terms,
            world.currentDate,
          ).status,
        ).toBe("operative");
        for (const includes of [true, false]) {
          const input = {
            adultResidents: 12345,
            buyerShare: 0.2,
            annualPretaxSpendingPerBuyer: 1200,
            legalMarketShare: 0.8,
            exciseRate: 0.07,
            stateSalesTaxRate: 0.04,
            salesTaxIncludesExcise: includes,
            sources: {
              lawTerms: "authored rate controls",
              adultBuyerBase: "authored denominator",
              spending: "authored spending",
              legalMarketShare: "authored market share",
            },
          };
          expect(cannabisRetailRevenue(input)).toEqual(
            native.cannabisRetailRevenue(input),
          );
        }
        const conditioned = ensureWorldStartingConditions(world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        });
        const initial = ensureMacroEconomyStarted(
          conditioned,
          macroStartForHistory(macroStartingConditions(conditioned)),
        );
        const due = initial.history.futureDueItems.find(
          (row) => row.transitionKey === MACRO_MONTHLY_STEP_KEY,
        )!;
        const source = createMacroMonthlyStepHandler([
          { key: "fixture:source-month", origins: () => [], ends: () => [] },
        ])(
          {
            ...initial,
            currentDate: due.dueAt,
            currentMoment: simulationMomentOnLocalDate(
              initial.currentMoment,
              due.dueAt,
            ),
          },
          due,
        );
        const started = source.world;
        expect(started.macroEconomy!.months.length).toBeGreaterThan(0);
        const town = world.jurisdictionOrder[0]!;
        for (const basePriceIndex of [undefined, 1, 2]) {
          const saved = {
            ...started,
            townFinances: {
              version: "town-finances-v1",
              taxableSales: { [town]: 1200 },
              basePriceIndex,
            },
          } as unknown as World;
          expect(
            townTaxableSales(
              {
                onDate: saved.currentDate,
                macroEconomy: saved.macroEconomy,
                townFinances: saved.townFinances,
              },
              town,
            ),
          ).toEqual(nativeSales(saved, town));
        }
        expect(
          townTaxableSales(
            {
              onDate: world.currentDate,
              macroEconomy: undefined,
              townFinances: undefined,
            },
            town,
          ),
        ).toEqual(nativeSales(world, town));
      },
      30000,
    );
});
