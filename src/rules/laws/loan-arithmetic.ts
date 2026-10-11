export function monthlyInterestMinor(
  balanceMinor: number,
  annualRateBasisPoints: number,
): number {
  if (balanceMinor <= 0) return 0;
  return Math.round((balanceMinor * annualRateBasisPoints) / 10000 / 12);
}

export function revolvingMinimumPaymentMinor(
  balanceMinor: number,
  annualRateBasisPoints: number,
  principalShareBasisPoints: number,
  floorMinor: number,
): number {
  if (balanceMinor <= 0) return 0;
  const interest = monthlyInterestMinor(balanceMinor, annualRateBasisPoints);
  const share = Math.ceil((balanceMinor * principalShareBasisPoints) / 10000);
  return Math.min(
    balanceMinor + interest,
    Math.max(floorMinor, share + interest),
  );
}

export function cappedAnnualRateBasisPoints(
  marketRateBasisPoints: number,
  capBasisPoints: number | null,
): number {
  return capBasisPoints === null
    ? marketRateBasisPoints
    : Math.min(marketRateBasisPoints, capBasisPoints);
}
