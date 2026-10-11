import type { CandidateFilingTerms } from "../../simulation/candidate-filing-terms";
export function validTerms(
  terms: CandidateFilingTerms | null | undefined,
): boolean {
  if (!terms) return false;
  const signatures =
    typeof terms.signatures === "number"
      ? terms.signatures > 0
      : terms.signatures.percent > 0 && terms.signatures.base.trim().length > 0;
  return (
    Number.isInteger(terms.feeMinorUnits) &&
    terms.feeMinorUnits >= 0 &&
    signatures &&
    /^\d{2}-\d{2}$/.test(terms.circulationOpens) &&
    /^\d{2}-\d{2}$/.test(terms.deadline) &&
    terms.estimatedFrom.trim().length > 0
  );
}
