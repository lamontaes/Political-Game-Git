import scheduleData from "../../../data/research/money/federal-income-tax-schedules.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import {
  FEDERAL_INCOME_TAX_2026,
  federalIncomeTaxScheduleFor as legacyScheduleFor,
  type FilingStatus,
  type IncomeTaxSchedule,
} from "../../simulation/income-tax-withholding";
import { STATES } from "../../simulation/state-reference";
import { federalIncomeTaxScheduleFromFacts } from "./federal-income-tax-schedule";

const statuses: readonly FilingStatus[] = [
  "single",
  "married-filing-jointly",
  "head-of-household",
  "married-filing-separately",
];
const records = scheduleData.records as readonly {
  taxYear: number;
  schedules: Readonly<Partial<Record<FilingStatus, IncomeTaxSchedule>>>;
}[];

const fallbacks = {
  "married-filing-separately": {
    sourceStatus: "single",
    estimatedFrom:
      "Internal Revenue Service, Revenue Procedure 2025-32: married filing separately follows single filer thresholds and standard deduction for tax year 2026",
  },
} as const;

describe("standalone federal income tax schedules", () => {
  it.each(Object.keys(STATES))(
    "matches legacy tax schedules for US-%s",
    (usps) => {
      const year = usps.charCodeAt(0) % 2 === 0 ? 2026 : 2030;
      const paidAt = `${year}-04-15`;
      for (const status of statuses) {
        const schedule = federalIncomeTaxScheduleFromFacts(
          status,
          paidAt,
          records,
          scheduleData.estimate.estimatedFrom,
          fallbacks,
        );
        if (status === "married-filing-separately") {
          expect(schedule).toMatchObject({
            standardDeductionMinor: 1610000,
            brackets: records[0]!.schedules.single!.brackets,
            estimatedFrom: expect.stringContaining(
              fallbacks[status].estimatedFrom,
            ),
          });
        } else {
          expect(schedule).toEqual(legacyScheduleFor(status, paidAt));
        }
      }
    },
  );

  it("uses the recorded baseline schedule for 2026", () => {
    expect(FEDERAL_INCOME_TAX_2026.single).toEqual(
      federalIncomeTaxScheduleFromFacts(
        "single",
        "2026-01-01",
        records,
        scheduleData.estimate.estimatedFrom,
        fallbacks,
      ),
    );
  });
});
