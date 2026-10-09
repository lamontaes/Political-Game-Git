import { ECONOMY_RULE_PARAMETERS as parameters } from "./parameters";

/** HUD Fair Market Rent transformed by the supplied market price level. */
export function marketRentMinorFromFacts(
  rentsByBedroomColumn: readonly number[],
  marketPriceLevel: number,
  bedrooms: number,
): number {
  const column = Math.max(
    parameters.hudBedroomColumns.value.minimum,
    Math.min(parameters.hudBedroomColumns.value.maximum, bedrooms),
  );
  const fairMarketRentDollars = rentsByBedroomColumn[column]!;
  return (
    Math.round(fairMarketRentDollars * marketPriceLevel) *
    parameters.minorUnitsPerDollar.value
  );
}

export interface EvictionDecisionFacts {
  readonly monthsBehind: number;
  readonly landlordPursues: boolean;
  readonly tenantAnswers: boolean;
  readonly lawyer: boolean;
  readonly planCarried: boolean | null;
  readonly judgeLean: -1 | 0 | 1;
}

/** Decide the disposition from case facts; wording remains owned by English. */
export function decideEvictionOutcome(
  facts: EvictionDecisionFacts,
): "evicted" | "settled" {
  const lenient = facts.judgeLean === -1;
  if (!facts.landlordPursues) return "settled";
  if (!facts.tenantAnswers) return "evicted";
  if (
    facts.lawyer &&
    facts.monthsBehind <= parameters.evictionLawyerMonthsBehind.value
  )
    return "settled";
  if (facts.lawyer && facts.planCarried !== true) return "evicted";
  if (facts.planCarried === true) return "settled";
  if (
    lenient &&
    facts.monthsBehind <= parameters.evictionLenientJudgeMonthsBehind.value
  )
    return "settled";
  return "evicted";
}

/** Sum known monthly member pay; unknown member pay is omitted, not zero-filled. */
export function householdMonthlyIncomeFromFacts(
  memberIds: readonly string[],
  monthlyPayByPerson: ReadonlyMap<string, number>,
): number | null {
  let known = false;
  let total = 0;
  for (const memberId of memberIds) {
    const monthly = monthlyPayByPerson.get(memberId);
    if (monthly === undefined) continue;
    known = true;
    total += monthly;
  }
  return known ? Math.round(total) : null;
}

/** Brooke-rule rent with statutory minimum and flat-rent cap. */
export function publicHousingRentMinorFromFacts(
  monthlyIncomeMinor: number | null,
  fmrMinor: number,
): number {
  const rounding = parameters.rentRoundingIncrementMinor.value;
  const flat =
    Math.round(
      (fmrMinor * parameters.publicHousingFlatRentFmrShare.value) / rounding,
    ) * rounding;
  if (monthlyIncomeMinor === null) return flat;
  const share =
    Math.round(
      (monthlyIncomeMinor * parameters.publicHousingRentIncomeShare.value) /
        rounding,
    ) * rounding;
  return Math.min(
    flat,
    Math.max(parameters.publicHousingMinimumRentMinor.value, share),
  );
}
