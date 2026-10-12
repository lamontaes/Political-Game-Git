import { makeIsoDate } from "../../simulation/dates";
import scheduleData from "../../../data/research/money/federal-income-tax-schedules.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import {
  FEDERAL_INCOME_TAX_2026,
  federalIncomeTaxScheduleFor as legacyScheduleFor,
  type FilingStatus,
  type IncomeTaxSchedule,
} from "../../simulation/income-tax-withholding";
import { STATES } from "../../simulation/state-reference";
import { SeededRng } from "../../simulation/rng";
import { federalIncomeTaxScheduleFromFacts } from "./federal-income-tax-schedule";
type TestedStatus = FilingStatus | "married-filing-separately";
const statuses: readonly TestedStatus[] = [
  "single",
  "married-filing-jointly",
  "head-of-household",
  "married-filing-separately",
];
const records = scheduleData.records as readonly {
  taxYear: number;
  schedules: Readonly<Partial<Record<TestedStatus, IncomeTaxSchedule>>>;
}[];
function outcome(run: () => unknown) {
  try {
    return { kind: "returned", value: run() };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { kind: "threw", name: error.name, message: error.message };
  }
}
describe("standalone federal schedules — strict legacy equivalence", () => {
  it.each(Object.keys(STATES))(
    "matches every status/year result, including missing facts, for US-%s",
    () => {
      for (const year of [2026, 2030])
        for (const status of statuses) {
          const paidAt = `${year}-04-15`;
          expect(
            outcome(() =>
              federalIncomeTaxScheduleFromFacts(
                status,
                paidAt,
                records,
                scheduleData.estimate.estimatedFrom,
              ),
            ),
          ).toEqual(
            outcome(() =>
              legacyScheduleFor(status as FilingStatus, makeIsoDate(paidAt)),
            ),
          );
        }
      expect(
        federalIncomeTaxScheduleFromFacts(
          "married-filing-separately",
          "2026-04-15",
          records,
          scheduleData.estimate.estimatedFrom,
        ),
      ).toBeUndefined();
      expect(() =>
        federalIncomeTaxScheduleFromFacts(
          "married-filing-separately",
          "2030-04-15",
          records,
          scheduleData.estimate.estimatedFrom,
        ),
      ).toThrow(TypeError);
    },
  );
  it("uses the recorded baseline and seeded random jurisdiction", () => {
    expect(FEDERAL_INCOME_TAX_2026.single).toEqual(
      federalIncomeTaxScheduleFromFacts(
        "single",
        "2026-01-01",
        records,
        scheduleData.estimate.estimatedFrom,
      ),
    );
    expect(Object.keys(STATES)).toContain(
      new SeededRng("rules2-laws-20261011").pick(Object.keys(STATES)),
    );
  });
});
