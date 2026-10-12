import { describe, expect, it } from "vitest";
import { withTopRate as legacyWithTopRate } from "../../simulation/federal-top-income-tax-law";
import { STATES } from "../../simulation/state-reference";
import {
  scheduleWithTopRate,
  type IncomeTaxSchedule,
} from "./income-tax-schedule";

describe("standalone enacted top-rate schedule rule", () => {
  it.each(Object.keys(STATES))(
    "matches the legacy schedule edit for US-%s",
    (usps) => {
      const schedule: IncomeTaxSchedule = {
        taxYear: 2026,
        standardDeductionMinor: 1_500_000,
        sourceUrl: "https://www.irs.gov/",
        brackets: [
          { overMinor: 0, rateBasisPoints: 1000 },
          { overMinor: 2_500_000, rateBasisPoints: 2200 },
          { overMinor: 10_000_000, rateBasisPoints: 3700 },
        ],
      };
      const rate = 3500 + usps.charCodeAt(0);
      expect(scheduleWithTopRate(schedule, rate)).toEqual(
        legacyWithTopRate(schedule, rate),
      );
    },
  );
});
