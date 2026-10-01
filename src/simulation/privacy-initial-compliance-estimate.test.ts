import { describe, expect, it } from "vitest";
import { initialPrivacyComplianceEstimate } from "./federal-data-privacy-law";

describe("approved initial privacy compliance estimate", () => {
  it("reads unambiguous SRIA bands, including 500 employees", () => {
    const cases = [
      [1, 50_000],
      [19, 50_000],
      [20, 100_000],
      [101, 450_000],
      [500, 450_000],
      [501, 2_000_000],
    ] as const;
    for (const [employees, initialDollars] of cases)
      expect(initialPrivacyComplianceEstimate(employees)).toMatchObject({
        initialDollars,
        timing: "one-time-initial",
        sourcePage: 11,
      });
    expect(initialPrivacyComplianceEstimate(19)?.sourceLimit).toContain(
      "overestimating the compliance costs for smaller firms",
    );
  });

  it("leaves exactly 100 employees unresolved between the overlapping printed bands", () => {
    expect(initialPrivacyComplianceEstimate(100)).toBeNull();
  });

  it("does not turn an absent, zero or invalid count into a cost", () => {
    for (const count of [0, -1, 1.5, NaN, Infinity])
      expect(initialPrivacyComplianceEstimate(count)).toBeNull();
  });
});
