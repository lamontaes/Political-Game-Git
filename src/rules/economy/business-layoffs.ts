import { ECONOMY_RULE_PARAMETERS } from "./parameters";
import { payTheBooksCoverFromFacts } from "./business-book-math";

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
  return (
    yearlyPay >
    payTheBooksCoverFromFacts(books) +
      ECONOMY_RULE_PARAMETERS.layoffPayCoverageToleranceDollars.value
  );
}
