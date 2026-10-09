import type { IncomeTaxSchedule } from "./income-tax-schedule";

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
    standardDeductionMinor: single.standardDeductionMinor * 2,
    brackets: single.brackets.map((bracket) => ({
      ...bracket,
      overMinor: bracket.overMinor * 2,
    })),
  };
}
