export interface IncomeTaxBracket {
  readonly overMinor: number;
  readonly rateBasisPoints: number;
}

export interface IncomeTaxSchedule {
  readonly estimatedFrom?: string;
  readonly taxYear?: number;
  readonly standardDeductionMinor: number;
  readonly brackets: readonly IncomeTaxBracket[];
  readonly sourceUrl: string;
}

/** Replace only the top bracket rate in an already selected tax schedule. */
export function scheduleWithTopRate(
  schedule: IncomeTaxSchedule,
  rateBasisPoints: number,
): IncomeTaxSchedule {
  return {
    ...schedule,
    brackets: schedule.brackets.map((bracket, index) =>
      index === schedule.brackets.length - 1
        ? { ...bracket, rateBasisPoints }
        : bracket,
    ),
  };
}
