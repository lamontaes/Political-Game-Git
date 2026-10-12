export interface EffectiveTaxPolicyFact {
  readonly seriesKey: string;
  readonly effectiveAt: string;
  readonly recordedAt: string;
  readonly sequence: number;
}

/** Select the latest operative policy from already series-scoped facts. */
export function effectiveTaxPolicyFromFacts<T extends EffectiveTaxPolicyFact>(
  policies: readonly T[],
  seriesKey: string,
  at: string,
  currentDate: string,
): T | null {
  return (
    policies
      .filter(
        (policy) =>
          policy.seriesKey === seriesKey &&
          policy.effectiveAt <= at &&
          policy.recordedAt <= currentDate,
      )
      .sort(
        (a, b) =>
          a.effectiveAt.localeCompare(b.effectiveAt) || a.sequence - b.sequence,
      )
      .at(-1) ?? null
  );
}
