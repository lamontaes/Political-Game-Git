import { describe, expect, it } from "vitest";

import { CORE_EVENT_SOURCE_CONTRACTS } from "./registry.js";
import {
  evaluateEventSourceEligibility,
  isCalibratedForFrequency,
  monthFromIsoDate,
} from "./routing.js";
import type { ExternalEventSourceContract } from "./types.js";

const CONTRACTS = CORE_EVENT_SOURCE_CONTRACTS;

function withCoverage(
  base: ExternalEventSourceContract,
  overrides: {
    states?: readonly string[] | null;
    fips?: readonly string[] | null;
    months?:
      readonly (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12)[] | null;
  },
): ExternalEventSourceContract {
  return {
    ...base,
    geographicCoverage: {
      ...base.geographicCoverage,
      supportedStateCodes:
        overrides.states === undefined
          ? base.geographicCoverage.supportedStateCodes
          : overrides.states,
      supportedFipsPrefixes:
        overrides.fips === undefined
          ? base.geographicCoverage.supportedFipsPrefixes
          : overrides.fips,
    },
    seasonality: {
      ...base.seasonality,
      observedActiveMonths:
        overrides.months === undefined
          ? base.seasonality.observedActiveMonths
          : overrides.months,
    },
  };
}

describe("external event source eligibility routing", () => {
  it("derives the month from an ISO date and rejects malformed input", () => {
    expect(monthFromIsoDate("2024-09-14")).toBe(9);
    expect(monthFromIsoDate("2024-13-01")).toBeUndefined();
    expect(monthFromIsoDate("September 2024")).toBeUndefined();
  });

  it("excludes a provider that does not report on the requested state", () => {
    const coastal = withCoverage(CONTRACTS[0]!, { states: ["FL", "LA", "TX"] });
    const result = evaluateEventSourceEligibility([coastal], {
      stateCode: "KY",
    });

    expect(result.eligibleContractIds).toEqual([]);
    expect(result.exclusions[0]?.reason).toBe("state_not_covered");
  });

  it("matches FIPS coverage by prefix", () => {
    const kentucky = withCoverage(CONTRACTS[0]!, { fips: ["21"] });

    expect(
      evaluateEventSourceEligibility([kentucky], { fipsCode: "21067" })
        .eligibleContractIds,
    ).toEqual([kentucky.contractId]);
    expect(
      evaluateEventSourceEligibility([kentucky], { fipsCode: "48453" })
        .exclusions[0]?.reason,
    ).toBe("fips_not_covered");
  });

  it("treats null coverage as 'provider imposes no restriction', not 'covers nothing'", () => {
    const unrestricted = withCoverage(CONTRACTS[0]!, {
      states: null,
      fips: null,
      months: null,
    });
    const result = evaluateEventSourceEligibility([unrestricted], {
      stateCode: "KY",
      fipsCode: "21067",
      month: 2,
    });

    expect(result.eligibleContractIds).toEqual([unrestricted.contractId]);
    expect(result.exclusions).toEqual([]);
  });

  it("reports a seasonal exclusion separately and never as a prohibition", () => {
    const hurricane = withCoverage(CONTRACTS[0]!, {
      months: [6, 7, 8, 9, 10, 11],
    });
    const result = evaluateEventSourceEligibility([hurricane], {
      date: "2024-02-03",
    });

    expect(result.eligibleContractIds).toEqual([]);
    expect(result.seasonallyExcludedContractIds).toEqual([
      hurricane.contractId,
    ]);
    expect(result.exclusions[0]?.explanation).toMatch(
      /not a prohibition on the hazard/,
    );
    // The contract itself still refuses to claim impossibility.
    expect(hurricane.seasonality.isHardProhibition).toBe(false);
  });

  it("carries no occurrence rates and reports every contract as uncalibrated", () => {
    for (const contract of CONTRACTS) {
      expect(isCalibratedForFrequency(contract)).toBe(false);
      expect(contract.calibration.status).toBe("unresolved_requires_research");
      // An unresolved calibration must say what evidence is missing rather
      // than carrying a placeholder number.
      if (contract.calibration.status === "unresolved_requires_research") {
        expect(contract.calibration.missingEvidence.length).toBeGreaterThan(0);
      }
      expect(JSON.stringify(contract)).not.toContain("annualOccurrenceRate");
    }
  });
});
