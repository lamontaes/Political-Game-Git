import evidence from "../../../data/research/housing/acs-2024-owner-mortgage-age.json" with { type: "json" };

/** Opening stock evidence, not a loan balance, term or individual lending decision. */
export function openingOwnerMortgageEvidence(householderAge: number): {
  readonly ageBand: string;
  readonly mortgagedOwners: number;
  readonly mortgageFreeOwners: number;
  readonly mortgageShare: number;
  readonly sourceUrl: string;
  readonly sourceCells: readonly string[];
} | null {
  if (!Number.isFinite(householderAge)) return null;
  const band = evidence.ageBands.find(
    (row) =>
      householderAge >= row.minAge &&
      (row.maxAgeExclusive === null || householderAge < row.maxAgeExclusive),
  );
  if (!band) return null;
  return {
    ageBand: band.label,
    mortgagedOwners: band.mortgaged,
    mortgageFreeOwners: band.mortgageFree,
    mortgageShare: band.mortgaged / (band.mortgaged + band.mortgageFree),
    sourceUrl: evidence.sourceUrl,
    sourceCells: [band.mortgagedCell, band.mortgageFreeCell],
  };
}
