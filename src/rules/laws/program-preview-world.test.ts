import { createStableId } from "../../simulation/ids";
import type {
  TaxProposalRecord,
  TaxPolicyRecord,
} from "../../simulation/tax-types";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
  previewTax as oldPreview,
  effectiveTaxPolicy as oldPolicy,
} from "../../simulation/tax-policy";
import {
  declareProgramCapacity,
  recordProgramAppropriation,
  programAppropriations,
  forecastProgramAlternative as oldForecast,
  dollars as oldDollars,
} from "../../simulation/governing/public-program";
import { resourcePositionAt } from "../../simulation/resource-queries";
import { money, makeCurrencyCode } from "../../simulation/resources";
import { addDays, makeIsoDate } from "../../simulation/dates";
import {
  DRAFT_A,
  DRAFT_B,
  NO_ACTION,
  FIXTURE,
  TRANSIT,
} from "../../../tests/fixtures/public-program-fixture";
import {
  forecastProgramAlternative,
  dollars,
  type ProgramForecastFacts,
} from "./program-forecast";
import { previewTax, effectiveTaxPolicy } from "./tax-preview";
import type { TaxTerms } from "../../simulation/tax-types";
function result(call: () => unknown) {
  try {
    return { value: call() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
describe("laws: public forecast, exact preview and validation closures", () => {
  it.each(Object.keys(STATES))(
    "matches the same generated place and declared capacity in %s",
    (usps) => {
      const base = smallWorld({
        place: `US-${usps}`,
        seed: `rules2-law-program:${usps}`,
      });
      let world = ensureTaxPublicAccount(base.world, base.jurisdictionId);
      const account = publicTaxAccountForJurisdiction(
        world,
        base.jurisdictionId,
      )!;
      world = declareProgramCapacity(world, {
        edition: "rules2-golden",
        programKey: TRANSIT,
        jurisdictionId: base.jurisdictionId,
        serviceLabel: "Authored service capacity",
        unitLabel: "vehicles",
        unitsTotal: 10,
        unitsOperational: 8,
        monthlyOperatingNeed: money(20000000, "USD"),
        completedPermille: 600,
        restorationCostPerUnit: money(15000000, "USD"),
        basis: FIXTURE,
      }).world;
      world = recordProgramAppropriation(world, {
        edition: "rules2-golden",
        programKey: TRANSIT,
        jurisdictionId: base.jurisdictionId,
        accountOrganizationId: account.organizationId,
        amount: money(200000000, "USD"),
        availableFrom: world.currentDate,
        availableThrough: addDays(world.currentDate, 364),
        basis: FIXTURE,
      }).world;
      const appropriation = programAppropriations(world, TRANSIT)[0]!;
      const position = resourcePositionAt(
        world,
        { kind: "organization", organizationId: account.organizationId },
        makeCurrencyCode("USD"),
      );
      const facts: ProgramForecastFacts = {
        onDate: world.currentDate,
        nextSequence: world.history.nextSequence,
        records: world.history.publicProgramRecords ?? [],
        flows: world.history.resourceFlows,
        transfers: world.history.resourceTransferOutcomes,
        positions: new Map(
          position
            ? [[JSON.stringify([account.organizationId, "USD"]), position]]
            : [],
        ),
      };
      for (const alternative of [DRAFT_A, DRAFT_B, NO_ACTION])
        expect(
          forecastProgramAlternative(facts, appropriation, alternative),
        ).toEqual(oldForecast(world, appropriation, alternative));
      for (const amount of [0, 1, 100, 199, 100000])
        expect(dollars(money(amount, "USD"))).toEqual(
          oldDollars(money(amount, "USD")),
        );
      const terms: TaxTerms = {
        seriesKey: "fixture:tax",
        baseKey: "fixture:wages",
        baseLabel: "Authored wage occurrence",
        currency: makeCurrencyCode("USD"),
        rateNumerator: 1,
        rateDenominator: 10,
        allowanceMinorUnits: 100,
        exemptBaseKeys: [],
        collectionLagDays: 1,
        legalBaselineAssumption: "authored-state-game-profile",
        publicPurpose: "Authored test public purpose",
        assumptionNote: "Exact authored tax control, not statutory research.",
      };
      for (const rate of [0, 1, 2, 10, 11])
        for (const amount of [
          null,
          money(0, "USD"),
          money(101, "USD"),
          money(20000, "USD"),
        ])
          for (const key of ["fixture:wages", "fixture:other"]) {
            const selected = { ...terms, rateNumerator: rate };
            expect(result(() => previewTax(selected, key, amount))).toEqual(
              result(() => oldPreview(selected, key, amount)),
            );
          }
      for (const termsControl of [
        { ...terms, currency: makeCurrencyCode("EUR") },
        { ...terms, rateDenominator: 0 },
        { ...terms, allowanceMinorUnits: -1 },
        { ...terms, exemptBaseKeys: ["fixture:z", "fixture:a"] },
        { ...terms, collectionLagDays: 0 },
      ])
        expect(
          result(() => previewTax(termsControl, terms.baseKey, null)),
        ).toEqual(result(() => oldPreview(termsControl, terms.baseKey, null)));
      // Authored saved policy/proposal chronology controls, on this generated World.
      const proposal = {
        id: createStableId("tax-proposal", world.id + ":saved-proposal"),
        stableKey: "fixture:saved-proposal",
        sequence: world.history.nextSequence,
        recordedAt: world.currentDate,
        jurisdictionId: base.jurisdictionId,
        terms,
      } as unknown as TaxProposalRecord;
      const rows = [0, 1, 2].map((i) => ({
        id: createStableId("tax-policy", world.id + ":saved-policy:" + i),
        stableKey: "fixture:saved-policy:" + i,
        sequence: world.history.nextSequence + 1 + i,
        recordedAt: i === 2 ? addDays(world.currentDate, 1) : world.currentDate,
        proposalId: proposal.id,
        effectiveAt: world.currentDate,
        supersedesPolicyId: null,
      })) as unknown as TaxPolicyRecord[];
      const saved = {
        ...world,
        history: {
          ...world.history,
          taxProposals: [proposal],
          taxPolicies: rows,
        },
      };
      for (const at of [
        addDays(world.currentDate, -1),
        world.currentDate,
        addDays(world.currentDate, 1),
      ])
        for (const series of [terms.seriesKey, "fixture:other"]) {
          const facts = {
            onDate: saved.currentDate,
            policies: rows,
            proposals: [proposal],
          };
          expect(
            effectiveTaxPolicy(facts, base.jurisdictionId, series, at),
          ).toEqual(oldPolicy(saved, base.jurisdictionId, series, at));
        }
      expect(
        effectiveTaxPolicy(
          { onDate: world.currentDate, policies: rows, proposals: [proposal] },
          base.jurisdictionId,
          terms.seriesKey,
          world.currentDate,
        )?.id,
      ).toBe(rows[1]!.id);
      const policies = {
        onDate: world.currentDate,
        policies: world.history.taxPolicies ?? [],
        proposals: world.history.taxProposals ?? [],
      };
      expect(
        effectiveTaxPolicy(
          policies,
          base.jurisdictionId,
          "fixture:tax",
          makeIsoDate("2026-07-01"),
        ),
      ).toEqual(
        oldPolicy(
          world,
          base.jurisdictionId,
          "fixture:tax",
          makeIsoDate("2026-07-01"),
        ),
      );
    },
  );
});
