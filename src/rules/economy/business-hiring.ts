import { ECONOMY_RULE_PARAMETERS } from "./parameters";
import { payTheBooksCoverFromFacts } from "./business-book-math";

export interface BusinessHiringBookFacts {
  readonly annualRevenue: number;
  readonly kindCostShare: number;
  readonly annualOtherCosts: number;
  readonly margin: number;
  readonly capacity: number;
  readonly lastQuarterPay?: number;
}

/** Whether selected business book facts can cover one more worker's annual pay. */
export function businessHasRoomToHireFromFacts(
  books: BusinessHiringBookFacts | null,
  staff: number,
  townAveragePay = ECONOMY_RULE_PARAMETERS.noAveragePayEstimateDollars.value,
): boolean {
  if (books === null || books.lastQuarterPay === undefined || staff <= 0) {
    return true;
  }
  const yearlyPay =
    books.lastQuarterPay * ECONOMY_RULE_PARAMETERS.quartersPerYear.value;
  const payWithOneMore =
    yearlyPay + Math.max(yearlyPay / staff, townAveragePay);
  return payWithOneMore <= payTheBooksCoverFromFacts(books);
}
