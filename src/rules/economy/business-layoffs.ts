import { ECONOMY_RULE_PARAMETERS } from "./parameters";

export interface BusinessLayoffBookFacts {
  readonly annualRevenue: number;
  readonly kindCostShare: number;
  readonly annualOtherCosts: number;
  readonly margin: number;
  readonly capacity: number;
  readonly lastQuarterPay?: number;
}

/** Whether last quarter's sales can still cover the business's existing pay. */
export function businessLaysOffFromFacts(
  books: BusinessLayoffBookFacts | null,
  staff: number,
): boolean {
  if (books === null || books.lastQuarterPay === undefined || staff < 2) {
    return false;
  }
  const yearlyPay =
    books.lastQuarterPay * ECONOMY_RULE_PARAMETERS.quartersPerYear.value;
  const salesScale =
    books.capacity > 0 ? books.annualRevenue / books.capacity : 0;
  const otherCosts =
    books.annualOtherCosts *
    (1 - books.kindCostShare + books.kindCostShare * salesScale);
  const payTheBooksCover =
    books.annualRevenue * (1 - books.margin) - otherCosts;
  return (
    yearlyPay >
    payTheBooksCover +
      ECONOMY_RULE_PARAMETERS.layoffPayCoverageToleranceDollars.value
  );
}
