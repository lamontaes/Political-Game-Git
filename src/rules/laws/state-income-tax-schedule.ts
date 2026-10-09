import type { IncomeTaxSchedule } from "./income-tax-schedule";
import { LAWS_PARAMETERS } from "./parameters";

export type StateTaxFilingStatus =
  | "single"
  | "married-filing-jointly"
  | "head-of-household"
  | "married-filing-separately";

/** Apply the modeled most-common filing-status rule to a selected single schedule. */
export function stateIncomeTaxScheduleFromSingleFact(
  single: IncomeTaxSchedule,
  status: StateTaxFilingStatus,
): IncomeTaxSchedule {
  if (status !== "married-filing-jointly") return single;
  return {
    ...single,
    standardDeductionMinor:
      single.standardDeductionMinor *
      LAWS_PARAMETERS.jointScheduleThresholdMultiplier.value,
    brackets: single.brackets.map((bracket) => ({
      ...bracket,
      overMinor:
        bracket.overMinor *
        LAWS_PARAMETERS.jointScheduleThresholdMultiplier.value,
    })),
  };
}
