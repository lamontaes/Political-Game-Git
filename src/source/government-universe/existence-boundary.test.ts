import { describe, expect, it } from "vitest";

import {
  assertNoInferredGovernance,
  describeExistenceOnlyFact,
} from "./existence-boundary.js";
import {
  REPRESENTATIVE_GOVERNMENT_UNITS,
  REPRESENTATIVE_GOVERNMENT_UNITS_COMPLETENESS,
} from "./sample_corpus.js";
import { CENSUS_2022_NATIONAL_SUMMARY } from "./universe_data.js";

describe("government existence is not governance", () => {
  it("states what a Census enumeration does and does not establish", () => {
    const described = describeExistenceOnlyFact({
      censusGovId: "18500067001000",
      governmentClass: "special_district",
      functionCategory: "fire_protection",
    });

    expect(described.establishes.join(" ")).toContain("special_district");
    expect(described.doesNotEstablish.join(" ")).toMatch(
      /elected or appointed/,
    );
    expect(described.doesNotEstablish.join(" ")).toMatch(/tax, legislate/);
  });

  it("rejects a universe record that has grown governance fields", () => {
    expect(() =>
      assertNoInferredGovernance({
        censusGovId: "18500067001000",
        officialName: "Example Fire Protection District",
        selectionMethod: "elected",
        taxingAuthority: true,
      }),
    ).toThrow(/must not carry governance fields/);
  });

  it("accepts a record that stays within existence facts", () => {
    for (const unit of REPRESENTATIVE_GOVERNMENT_UNITS) {
      expect(() => assertNoInferredGovernance(unit)).not.toThrow();
    }
  });

  it("keeps the representative sample distinct from the authoritative counts", () => {
    expect(
      REPRESENTATIVE_GOVERNMENT_UNITS_COMPLETENESS.isNationalUniverse,
    ).toBe(false);

    // The sample is a spread of examples; the Census tables carry the real
    // totals. The gap between them is expected and must not be read as data loss.
    const nationalTotal = Number(
      (CENSUS_2022_NATIONAL_SUMMARY as { totalGovernments?: number })
        .totalGovernments ?? 0,
    );
    if (nationalTotal > 0) {
      expect(REPRESENTATIVE_GOVERNMENT_UNITS.length).toBeLessThan(
        nationalTotal,
      );
    }
  });
});
