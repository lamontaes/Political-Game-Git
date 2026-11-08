/**
 * The federal earned income tax credit on the 2026 schedule (26 U.S.C. 32;
 * IRS Revenue Procedure 2025-32): the credit rate times earnings up to the
 * earned income amount, less the phaseout rate times the larger of earnings
 * and adjusted gross income above the phaseout threshold (the married
 * threshold for a household with two adults). The schedule's numbers are
 * parameters (reach-group-b-parameters.json). A household without children
 * is counted for all ages (the 25-to-64 rule is not read).
 */
export function federalEitcDollars(input: {
  readonly children: number;
  readonly married: boolean;
  readonly earned: number;
  readonly agi: number;
  readonly parameter: (key: string) => number;
}): number {
  const n = Math.min(3, input.children);
  const p = input.parameter;
  const maximum = p(`eitcCreditRate${n}`) * p(`eitcEarnedIncomeAmount${n}`);
  const credit = Math.min(maximum, p(`eitcCreditRate${n}`) * input.earned);
  const threshold = input.married
    ? p(`eitcPhaseoutThresholdMarried${n}`)
    : p(`eitcPhaseoutThresholdUnmarried${n}`);
  const income = Math.max(input.earned, input.agi);
  return Math.max(
    0,
    credit - p(`eitcPhaseoutRate${n}`) * Math.max(0, income - threshold),
  );
}
