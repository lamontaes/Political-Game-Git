import { LAWS_PARAMETERS as parameters } from "./parameters";

export interface PaidLeaveAbsenceFacts {
  readonly seriousOwnDaysSinceOnset: readonly number[];
  readonly seriousCaringDays: number;
}

export interface PaidLeaveBenefitRateFacts {
  readonly percent: number;
  readonly maxWeeklyMinor: number | null;
}

export interface PaidLeavePremiumFacts {
  readonly employeeRatePerMillion: number;
  readonly annualWageCapMinor: number | null;
}

export function paidLeavePremiumOnFromFacts(
  wagesMinor: number,
  paidEarlierThisYearMinor: number,
  premium: PaidLeavePremiumFacts,
): { readonly taxableMinor: number; readonly premiumMinor: number } {
  const taxableMinor =
    premium.annualWageCapMinor === null
      ? wagesMinor
      : Math.min(
          wagesMinor,
          Math.max(0, premium.annualWageCapMinor - paidEarlierThisYearMinor),
        );
  const numerator =
    BigInt(taxableMinor) * BigInt(premium.employeeRatePerMillion);
  const denominator = BigInt(
    parameters.paidLeavePremiumRateUnitsPerWholeRate.value,
  );
  return {
    taxableMinor,
    premiumMinor: Number((numerator * 2n + denominator) / (denominator * 2n)),
  };
}

export function paidLeaveCoveredDaysFromFacts(
  absence: PaidLeaveAbsenceFacts,
  unpaidDays: number,
  ownConditionWaitingDays: number,
): number {
  const own = absence.seriousOwnDaysSinceOnset.filter(
    (since) => since >= ownConditionWaitingDays,
  ).length;
  return Math.min(unpaidDays, own + absence.seriousCaringDays);
}

export function paidLeaveBenefitFromFacts(
  rate: PaidLeaveBenefitRateFacts,
  periodPayMinor: number,
  workdays: number,
  coveredDays: number,
): number {
  if (coveredDays <= 0 || workdays <= 0) return 0;
  const lost = (periodPayMinor * coveredDays) / workdays;
  const replaced = Math.round(
    (lost * rate.percent) / parameters.percentageMultiplier.value,
  );
  if (rate.maxWeeklyMinor === null) return replaced;
  const cap = Math.round(
    (rate.maxWeeklyMinor * coveredDays) / parameters.paidWorkdaysPerWeek.value,
  );
  return Math.min(replaced, cap);
}
