export interface IncomeTaxBracketForCalculation {
  readonly overMinor: number;
  readonly rateBasisPoints: number;
}

export interface IncomeTaxScheduleForCalculation {
  readonly standardDeductionMinor: number;
  readonly brackets: readonly IncomeTaxBracketForCalculation[];
}

/** A year's tax on taxable income under progressive brackets, half up. */
export function annualTaxMinor(
  taxableMinor: number,
  brackets: readonly IncomeTaxBracketForCalculation[],
): number {
  let tax = 0n;
  for (let index = 0; index < brackets.length; index += 1) {
    const bracket = brackets[index]!;
    const top = brackets[index + 1]?.overMinor ?? Number.POSITIVE_INFINITY;
    if (taxableMinor <= bracket.overMinor) break;
    const inBracket = Math.min(taxableMinor, top) - bracket.overMinor;
    tax += BigInt(inBracket) * BigInt(bracket.rateBasisPoints);
  }
  return Number((tax * 2n + 10_000n) / 20_000n);
}

/** Calculate one paycheck's withholding from its annualized wages and schedule. */
export function withholdingForPaycheckFromFacts(
  wagesMinor: number,
  periodsPerYear: number,
  schedule: IncomeTaxScheduleForCalculation,
): { readonly taxableMinor: number; readonly withheldMinor: number } {
  const annualWages = wagesMinor * periodsPerYear;
  const taxableAnnual = Math.max(
    0,
    annualWages - schedule.standardDeductionMinor,
  );
  const yearTax = annualTaxMinor(taxableAnnual, schedule.brackets);
  return {
    taxableMinor: Math.round(taxableAnnual / periodsPerYear),
    withheldMinor: Math.round(yearTax / periodsPerYear),
  };
}
