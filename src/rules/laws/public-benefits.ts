import { LAWS_PARAMETERS as parameters } from "./parameters";

/** Whether monthly income is at or below a selected share of the annual line. */
export function withinPovertyShare(
  monthlyIncomeMinor: number,
  annualPovertyLineMinor: number,
  shareBasisPoints: number,
): boolean {
  return (
    monthlyIncomeMinor *
      parameters.monthsPerYear.value *
      parameters.basisPointsPerWholeRate.value <=
    annualPovertyLineMinor * shareBasisPoints
  );
}

/** The annual poverty line for a household's selected size and guidelines. */
export function povertyLineMinor(
  householdSize: number,
  firstPersonMinor: number,
  eachAddedPersonMinor: number,
): number {
  if (householdSize < 1)
    throw new Error("A household has at least one person.");
  return firstPersonMinor + (householdSize - 1) * eachAddedPersonMinor;
}
