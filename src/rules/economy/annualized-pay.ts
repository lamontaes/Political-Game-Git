/** Annualize a recorded pay amount using the caller-selected pay frequency. */
export function annualizedPayMinorFromFacts(
  amountMinor: number,
  periodsPerYear: number | null,
): number | null {
  return periodsPerYear === null ? null : amountMinor * periodsPerYear;
}
