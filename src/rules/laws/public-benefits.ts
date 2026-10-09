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

/** Level monthly payment that pays off a principal over the selected term. */
export function amortizedMonthlyPaymentMinor(
  principalMinor: number,
  annualRateBasisPoints: number,
  termMonths: number,
): number {
  if (termMonths <= 0) throw new Error("A loan term must be at least a month.");
  if (principalMinor <= 0) return 0;
  const monthly =
    annualRateBasisPoints /
    parameters.basisPointsPerWholeRate.value /
    parameters.monthsPerYear.value;
  if (monthly === 0) return Math.ceil(principalMinor / termMonths);
  const factor = Math.pow(1 + monthly, termMonths);
  return Math.ceil((principalMinor * monthly * factor) / (factor - 1));
}
