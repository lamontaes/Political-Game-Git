import { describe, expect, it } from "vitest";
import { initialPrivacyComplianceEstimate } from "./federal-data-privacy-law";

describe("approved initial privacy compliance estimate", () => {
  it("reads the SRIA bands and keeps their disclosed boundary choices", () => {
    const cases = [
      [1, 50_000],
      [19, 50_000],
      [20, 100_000],
      [100, 100_000],
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

  it("does not turn an absent, zero or invalid count into a cost", () => {
    for (const count of [0, -1, 1.5, NaN, Infinity])
      expect(initialPrivacyComplianceEstimate(count)).toBeNull();
  });
});
