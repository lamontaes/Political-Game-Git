/** Supporting teacher agreement closure; exact native cadence regex and factors. */
export function periodsPerYear(cadenceKind: string): number | null {
  const match = /(semimonthly|biweekly|weekly|monthly)/.exec(cadenceKind);
  if (!match) return null;
  return { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 }[
    match[1] as "weekly" | "biweekly" | "semimonthly" | "monthly"
  ];
}
