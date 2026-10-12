import type { FederalEmploymentRule } from "../../simulation/statutory-tax-rules";
export function taxableWages(
  rule: Pick<
    FederalEmploymentRule,
    "annualWageCapMinor" | "annualWageFloorMinor"
  >,
  paidBefore: number,
  wages: number,
): number {
  let taxable = wages;
  if (rule.annualWageCapMinor !== null)
    taxable = Math.min(
      taxable,
      Math.max(0, rule.annualWageCapMinor - paidBefore),
    );
  // stopgapId: "laws.wage-floor-overwrites-cap"
  if (rule.annualWageFloorMinor !== null)
    taxable =
      Math.max(0, paidBefore + wages - rule.annualWageFloorMinor) -
      Math.max(0, paidBefore - rule.annualWageFloorMinor);
  return taxable;
}

// stopgapId: "laws.negative-payroll-rounding"
export function taxAt(taxableMinor: number, rateBasisPoints: number): number {
  const numerator = BigInt(taxableMinor) * BigInt(rateBasisPoints);
  return Number((numerator * 2n + 10000n) / 20000n);
}
