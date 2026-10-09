import { describe, expect, it } from "vitest";
import { previewTax as legacyPreviewTax } from "../../simulation/tax-policy";
import { STATES } from "../../simulation/state-reference";
import type { TaxTerms } from "../../simulation/tax-types";
import { taxAssessmentFromFacts } from "./tax-assessment";

describe("standalone taxable-base assessment", () => {
  it.each(Object.keys(STATES))(
    "matches legacy tax amounts for US-%s",
    (usps) => {
      const baseKey = `tax-base:${usps.toLowerCase()}`;
      const rateNumerator = 1500 + usps.charCodeAt(0);
      const terms: TaxTerms = {
        seriesKey: `tax-series:${usps.toLowerCase()}`,
        baseKey,
        baseLabel: "selected taxable base",
        rateNumerator,
        rateDenominator: 10_000,
        exemptBaseKeys: [`tax-base:exempt-${usps.toLowerCase()}`],
        allowanceMinorUnits: 25_000,
        currency: "USD",
        collectionLagDays: 1,
        publicPurpose: "selected program",
        assumptionNote: "test facts",
        legalBaselineAssumption: "authored-state-game-profile",
      };
      const amount = {
        minorUnits: 250_000 + usps.charCodeAt(1) * 100,
        currency: "USD",
      };
      const expected = legacyPreviewTax(terms, baseKey, amount);
      const actual = taxAssessmentFromFacts(terms, baseKey, {
        kind: "money",
        ...amount,
      });
      expect(actual).toEqual(
        expected.status === "unavailable"
          ? { status: "unavailable", reasonCode: "taxable-base-absent" }
          : expected,
      );
    },
  );
});
