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

export interface FilingStatusScheduleFallback<S extends string> {
  readonly sourceStatus: S;
  readonly estimatedFrom: string;
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]!
    : (ordered[middle - 1]! + ordered[middle]!) / 2;
}

function scheduleForStatus<S extends string>(
  record: FederalIncomeTaxScheduleRecord<S>,
  status: S,
  fallbacks: Readonly<Partial<Record<S, FilingStatusScheduleFallback<S>>>>,
): FederalIncomeTaxScheduleFact | null {
  const schedule = record.schedules[status];
  if (schedule) return schedule;
  const fallback = fallbacks[status];
  const source = fallback && record.schedules[fallback.sourceStatus];
  return source && fallback
    ? { ...source, estimatedFrom: fallback.estimatedFrom }
    : null;
}

/** Read a recorded schedule or estimate a missing year/status from supplied facts. */
export function federalIncomeTaxScheduleFromFacts<S extends string>(
  status: S,
  paidAt: string,
  records: readonly FederalIncomeTaxScheduleRecord<S>[],
  estimatedFrom: string,
  fallbacks: Readonly<Partial<Record<S, FilingStatusScheduleFallback<S>>>> = {},
): FederalIncomeTaxScheduleFact {
  const taxYear = Number(paidAt.slice(0, 4));
  const exact = records.find((row) => row.taxYear === taxYear);
  if (exact) {
    const schedule = scheduleForStatus(exact, status, fallbacks);
    if (schedule) return schedule;
  }
  const references = records.map((row) =>
    scheduleForStatus(row, status, fallbacks),
  );
  if (references.length === 0 || references.some((row) => row === null)) {
    throw new Error(
      `No schedule facts or fallback are available for ${status}.`,
    );
  }
  const completeReferences = references as FederalIncomeTaxScheduleFact[];
  const reference = completeReferences[0]!;
  return {
    taxYear,
    estimatedFrom: fallbacks[status]
      ? `${estimatedFrom}; ${fallbacks[status].estimatedFrom}`
      : estimatedFrom,
    sourceUrl: reference.sourceUrl,
    standardDeductionMinor: median(
      completeReferences.map((row) => row.standardDeductionMinor),
    ),
    brackets: reference.brackets.map((_, index) => ({
      overMinor: median(
        completeReferences.map((row) => row.brackets[index]!.overMinor),
      ),
      rateBasisPoints: median(
        completeReferences.map((row) => row.brackets[index]!.rateBasisPoints),
      ),
    })),
  };
}
