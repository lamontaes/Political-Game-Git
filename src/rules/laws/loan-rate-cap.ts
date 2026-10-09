export interface LoanRateCapFacts {
  readonly marketRateBasisPoints: number;
  readonly capBasisPoints: number | null;
}

/** Apply an already selected enacted rate cap to a loan's market rate. */
export function loanRateFromCapFacts(facts: LoanRateCapFacts): number | null {
  if (
    !Number.isFinite(facts.marketRateBasisPoints) ||
    facts.marketRateBasisPoints < 0 ||
    (facts.capBasisPoints !== null &&
      (!Number.isFinite(facts.capBasisPoints) || facts.capBasisPoints < 0))
  )
    return null;
  return facts.capBasisPoints === null
    ? facts.marketRateBasisPoints
    : Math.min(facts.marketRateBasisPoints, facts.capBasisPoints);
}
