import { describe, expect, it } from "vitest";
import { CRUNCH46_PROVISIONAL_POLICY } from "../../simulation/macro-economy/policy";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../../simulation/life-places";
import { mortgageFinancingQuote as legacyMortgageFinancingQuote } from "../../simulation/mortgage-financing";
import { makeIsoDate } from "../../simulation/dates";
import { money } from "../../simulation/resources";
import type { EntityId, World } from "../../simulation/types";
import { mortgageQuoteFromFacts } from "./mortgage-financing";

const effectiveDate = makeIsoDate("2026-01-01");
const referenceRange = CRUNCH46_PROVISIONAL_POLICY.baseline.policyRateRangePct;
const places = lifePlaceStateIdentities();

function openingWorld(): World {
  return {
    currentDate: effectiveDate,
    history: { legislativeEnactments: [] },
    macroEconomy: {
      start: { effectiveDate },
      months: [],
      centralBank: null,
      policyVersion: "test-opening-policy",
    },
  } as unknown as World;
}

describe("standalone mortgage quote rule", () => {
  it.each(places)(
    "matches the legacy opening-rate quote in $jurisdictionKey",
    (identity) => {
      const key = identity.jurisdictionKey;
      const place = stateJurisdictionForKey(key)!;
      const world = openingWorld();
      const cap = { capBasisPoints: 400, measureId: "measure:cap" as EntityId };
      const legacy = legacyMortgageFinancingQuote(world, {
        principal: money(12_000_000, "USD"),
        jurisdictionId: place.id,
        rateCap: cap,
      });
      const lifted = mortgageQuoteFromFacts({
        macroStarted: true,
        principalMinor: 12_000_000,
        rateCapBasisPoints: cap.capBasisPoints,
        policyLowerPercent: referenceRange.lower,
        policyUpperPercent: referenceRange.upper,
        macroMonthKey: null,
        rateReferenceKey: "test-opening-policy",
        rateBasis: "opening-game-reference",
        scope: "national",
        recordedAt: effectiveDate,
      });
      expect(lifted, key).toEqual(legacy);
    },
  );

  it("refuses absent macro start, invalid principal, and impossible policy ranges", () => {
    const valid = {
      macroStarted: true,
      principalMinor: 100_000,
      rateCapBasisPoints: null,
      policyLowerPercent: 3.5,
      policyUpperPercent: 3.75,
      macroMonthKey: null,
      rateReferenceKey: "opening",
      rateBasis: "opening-game-reference" as const,
      scope: "national",
      recordedAt: effectiveDate,
    };
    expect(
      mortgageQuoteFromFacts({ ...valid, macroStarted: false }),
    ).toBeNull();
    expect(mortgageQuoteFromFacts({ ...valid, principalMinor: -1 })).toBeNull();
    expect(
      mortgageQuoteFromFacts({
        ...valid,
        policyLowerPercent: 5,
        policyUpperPercent: 4,
      }),
    ).toBeNull();
  });
});
