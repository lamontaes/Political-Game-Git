import { describe, expect, it } from "vitest";
import { ARTICLE_V_STATE_KEYS } from "../simulation/constitutional-process";
import { makeIsoDate } from "../simulation/dates";
import { taxPowerEvidenceFor } from "../simulation/tax-policy";
import { nationwideFundedServiceCoverage } from "./funded-service-capability";

describe("nationwide funded-service inventory", () => {
  it.each(ARTICLE_V_STATE_KEYS)(
    "%s reports acquired tax powers without generating a fictional profile",
    (key) => {
      const onDate = makeIsoDate("2027-02-01");
      const coverage = nationwideFundedServiceCoverage(onDate);
      const state = coverage.states.find((row) => row.jurisdictionKey === key)!;
      const taxPower = state.readings.find((row) => row.field === "tax-power")!;
      expect(taxPower.admitted).toBe(taxPowerEvidenceFor(key) !== null);
      expect(taxPower.basis).not.toContain("fictional tax assumptions");
      if (!taxPowerEvidenceFor(key)) {
        expect(state.supported).toBe(false);
        expect(state.missing).toContain("tax-power");
      }
    },
  );

  it("preserves the loaded state and municipal inventory without creating receipts", () => {
    const coverage = nationwideFundedServiceCoverage(makeIsoDate("2027-02-01"));
    expect(coverage.states.map((row) => row.jurisdictionKey)).toEqual([
      ...ARTICLE_V_STATE_KEYS,
    ]);
    expect(
      coverage.states.find((row) => row.jurisdictionKey === "US-AK")?.supported,
    ).toBe(true);
    expect(coverage.local.governments).toBeGreaterThan(0);
    expect(coverage.local.stateKeys).toBeGreaterThan(0);
    expect(coverage.local.supported).toBe(0);
  });
});
