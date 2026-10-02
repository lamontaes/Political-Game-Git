import { describe, expect, it } from "vitest";
import {
  enactedTaxFixture,
  TEST_TAX_TERMS,
} from "../../../tests/fixtures/tax-policy-fixture";
import {
  declarePersonalTaxOccurrence,
  readPublicTaxReceipts,
} from "../../presentation/tax-work";
import { daysBetween } from "../dates";
import { createTaxTransitionHandlerRegistry } from "../tax-policy";
import { advanceWorld } from "../world";
import { INCENTIVE_CAP_QUESTION, TAX_QUESTION_EFFECTS } from "./rules";

describe("recorded tax terms replace one-state fiscal-note factors", () => {
  it.each([
    { name: "taxable occurrence", exempt: false, allowance: 0, expected: 105 },
    { name: "enacted exemption", exempt: true, allowance: 0, expected: 0 },
    { name: "enacted allowance", exempt: false, allowance: 100, expected: 100 },
  ])(
    "$name uses its saved base and enacted terms",
    ({ exempt, allowance, expected }) => {
      // Explicit fictional excise terms exercise the admitted shared engine.
      // They do not invent a grocery-sales or corporate-credit legal binding.
      const terms = {
        ...TEST_TAX_TERMS,
        exemptBaseKeys: exempt ? [TEST_TAX_TERMS.baseKey] : [],
        allowanceMinorUnits: allowance,
      };
      const fixture = enactedTaxFixture(10_000, terms);
      const registry = createTaxTransitionHandlerRegistry();
      let world = advanceWorld(
        fixture.world,
        daysBetween(
          fixture.world.currentDate,
          fixture.world.history.taxPolicies![0]!.effectiveAt,
        ),
        registry,
      );
      world = declarePersonalTaxOccurrence(world, {
        personId: fixture.personId,
        stableKey: "recorded-tax-effects:occurrence",
        proposalId: fixture.proposalId,
        baseKey: terms.baseKey,
        amountMinorUnits: 2_100,
        assumptionNote:
          "Explicit fictional occurrence backed by the existing declaration writer.",
      });
      expect(world.history.taxBases!.at(-1)!.amount.minorUnits).toBe(2_100);
      expect(world.history.taxAssessments!.at(-1)!.taxAmount.minorUnits).toBe(
        expected,
      );
      world = advanceWorld(world, terms.collectionLagDays, registry);
      expect(
        world.history.taxCollections!.at(-1)!.transferredAmount.minorUnits,
      ).toBe(expected);
      expect(
        readPublicTaxReceipts(
          world,
          world.history.taxProposals![0]!.jurisdictionId,
        ).reduce((sum, row) => sum + row.amount.minorUnits, 0),
      ).toBe(expected);
      expect(
        TAX_QUESTION_EFFECTS.some(
          (row) =>
            row.questionKey ===
              "us-policy-positions:fiscal.exempt-groceries-from-sales-tax" ||
            row.questionKey === INCENTIVE_CAP_QUESTION,
        ),
      ).toBe(false);
    },
  );
});
