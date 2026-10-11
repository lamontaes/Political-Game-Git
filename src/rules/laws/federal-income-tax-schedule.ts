export interface FederalIncomeTaxBracketFact {
  readonly overMinor: number;
  readonly rateBasisPoints: number;
}
export interface FederalIncomeTaxScheduleFact {
  readonly taxYear?: number;
  readonly estimatedFrom?: string;
  readonly sourceUrl: string;
  readonly standardDeductionMinor: number;
  readonly brackets: readonly FederalIncomeTaxBracketFact[];
}
export interface FederalIncomeTaxScheduleRecord<S extends string> {
  readonly taxYear: number;
  readonly schedules: Readonly<
    Partial<Record<S, FederalIncomeTaxScheduleFact>>
  >;
}
function median(values: readonly number[]): number {
  const ordered = [...values].sort((a, b) => a - b),
    middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]!
    : (ordered[middle - 1]! + ordered[middle]!) / 2;
}
/** KEEP schedule calculation; caller selects the recorded corpus. */
export function federalIncomeTaxScheduleFromFacts<S extends string>(
  status: S,
  paidAt: string,
  records: readonly FederalIncomeTaxScheduleRecord<S>[],
  estimatedFrom: string,
): FederalIncomeTaxScheduleFact | undefined {
  const taxYear = Number(paidAt.slice(0, 4));
  const exact = records.find((row) => row.taxYear === taxYear);
  // stopgapId: "laws.federal-mfs-tax-schedule"
  // Legacy returns undefined for an absent recorded status. For an unread year
  // it dereferences the absent reference and throws TypeError. Preserve both.
  if (exact) return exact.schedules[status];
  const references = records.map(
    (row) => row.schedules[status],
  ) as readonly FederalIncomeTaxScheduleFact[];
  const reference = references[0]!;
  return {
    taxYear,
    estimatedFrom,
    sourceUrl: reference.sourceUrl,
    standardDeductionMinor: median(
      references.map((row) => row.standardDeductionMinor),
    ),
    brackets: reference.brackets.map((_, index) => ({
      overMinor: median(
        references.map((row) => row.brackets[index]!.overMinor),
      ),
      rateBasisPoints: median(
        references.map((row) => row.brackets[index]!.rateBasisPoints),
      ),
    })),
  };
}
