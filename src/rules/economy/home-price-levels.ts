import { ECONOMY_RULE_PARAMETERS as parameters } from "./parameters";

export interface HomePriceMonthFact {
  readonly recordedAt: string;
  readonly growthPct: number;
  readonly inflationPct: number;
  readonly policyRate: { readonly lowerPct: number; readonly upperPct: number };
}

export interface HomePriceLevelFact {
  readonly recordedAt: string;
  readonly level: number;
}

function incomeRate(month: HomePriceMonthFact): number {
  return (month.growthPct + month.inflationPct) / 100;
}

function rateMidpoint(month: HomePriceMonthFact): number {
  // STOPGAP: economy.home-price-mortgage-rate-proxy
  return (month.policyRate.lowerPct + month.policyRate.upperPct) / 2;
}

/** Rebuild the monthly home-price index from caller-selected macro months. */
export function homePriceLevelsFromFacts(
  months: readonly HomePriceMonthFact[],
  townEffect: (month: HomePriceMonthFact) => number = () =>
    parameters.noHousingEventPriceEffectLogPoints.value,
): readonly HomePriceLevelFact[] {
  if (months.length === 0) return [];
  const window = parameters.housingPriceWindowMonths.value;
  const coefficients = parameters.housingPriceCoefficients.value;
  const first = months[0]!;
  // STOPGAP: economy.home-price-opening-level
  const changes = Array.from(
    { length: window },
    () => incomeRate(first) / window,
  );
  const incomes = Array.from({ length: window }, () => incomeRate(first));
  let logIncome = 0;
  let logPrice = 0;
  let gap = 0;
  const levels: HomePriceLevelFact[] = [
    { recordedAt: first.recordedAt, level: 1 },
  ];
  for (let index = 1; index < months.length; index += 1) {
    const month = months[index]!;
    incomes.push(incomeRate(month));
    const yearAgo = months[Math.max(0, index - window)]!;
    const annualGrowth = changes
      .slice(-window)
      .reduce((sum, row) => sum + row, 0);
    const annualIncomeGrowth =
      incomes.slice(-window).reduce((sum, row) => sum + row, 0) / window;
    const annualChange =
      coefficients.lastGrowth * annualGrowth +
      coefficients.incomeGrowth * annualIncomeGrowth +
      coefficients.rateChangePerPoint *
        (rateMidpoint(month) - rateMidpoint(yearAgo)) +
      coefficients.priceToIncomeGap * gap;
    // STOPGAP: economy.home-price-supply-elasticity
    const change = annualChange / window + townEffect(month);
    changes.push(change);
    logPrice += change;
    logIncome += incomeRate(month) / window;
    gap = logPrice - logIncome;
    levels.push({ recordedAt: month.recordedAt, level: Math.exp(logPrice) });
  }
  return levels;
}
