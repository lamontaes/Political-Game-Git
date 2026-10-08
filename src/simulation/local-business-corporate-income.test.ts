import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "./life-places";
import { modeledLocalBusinessOperatingIncomeMinor } from "./local-economy";

describe("local business income estimates", () => {
  it("uses one receipts-after-payroll calculation across all 56 jurisdictions", () => {
    const jurisdictions = lifePlaceStateIdentities();
    const estimates = jurisdictions.map((place) => ({
      jurisdictionKey: place.jurisdictionKey,
      operatingIncomeMinor: modeledLocalBusinessOperatingIncomeMinor(
        100_000,
        60_000,
      ),
    }));

    expect(jurisdictions).toHaveLength(56);
    expect(new Set(estimates.map((row) => row.operatingIncomeMinor))).toEqual(
      new Set([40_000]),
    );
    expect(estimates.map((row) => row.jurisdictionKey)).toHaveLength(56);
  });

  it("does not invent positive operating income when payroll exceeds receipts", () => {
    expect(modeledLocalBusinessOperatingIncomeMinor(20_000, 30_000)).toBe(0);
  });

  it("rejects missing or malformed money records", () => {
    expect(() => modeledLocalBusinessOperatingIncomeMinor(-1, 0)).toThrow();
    expect(() => modeledLocalBusinessOperatingIncomeMinor(1, 0.5)).toThrow();
  });
});
