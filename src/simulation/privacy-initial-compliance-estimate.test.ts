import { describe, expect, it } from "vitest";
import { initialPrivacyComplianceEstimate } from "./federal-data-privacy-law";

describe("approved initial privacy compliance estimate", () => {
  it("reads unambiguous SRIA bands, including 500 employees", () => {
    const cases = [
      [1, 50_000],
      [19, 50_000],
      [20, 100_000],
      [100, 450_000],
      [101, 450_000],
      [500, 450_000],
      [501, 2_000_000],
    ] as const;
    for (const [employees, initialDollars] of cases)
      expect(initialPrivacyComplianceEstimate(employees)).toMatchObject({
        initialDollars,
        timing: "one-time-initial",
        sourcePage: 11,
        bandSource: expect.stringContaining("territory_naics_2022.xlsx"),
      });
    expect(initialPrivacyComplianceEstimate(19)?.sourceLimit).toContain(
      "overestimating the compliance costs for smaller firms",
    );
  });

  it("uses the explicit CTO 100/500 convention without inventing a SUSB quote", () => {
    expect(initialPrivacyComplianceEstimate(100)?.initialDollars).toBe(450_000);
    expect(initialPrivacyComplianceEstimate(500)?.initialDollars).toBe(450_000);
    expect(initialPrivacyComplianceEstimate(500)?.boundaryConvention).toContain(
      "explicit boundary convention",
    );
    expect(initialPrivacyComplianceEstimate(100)?.boundaryConvention).toContain(
      "exactly 100",
    );
  });

  it("does not turn an absent, zero or invalid count into a cost", () => {
    for (const count of [0, -1, 1.5, NaN, Infinity])
      expect(initialPrivacyComplianceEstimate(count)).toBeNull();
  });
});
