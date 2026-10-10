export interface BusinessBookMathFacts {
  readonly annualRevenue: number;
  readonly kindCostShare: number;
  readonly annualOtherCosts: number;
  readonly margin: number;
  readonly capacity: number;
}

/** Scale recorded other costs by supplied sales and capacity facts. */
export function otherCostsAtSalesFromFacts(
  books: BusinessBookMathFacts,
): number {
  const salesScale =
    books.capacity > 0 ? books.annualRevenue / books.capacity : 0;
  return (
    books.annualOtherCosts *
    (1 - books.kindCostShare + books.kindCostShare * salesScale)
  );
}

/** Annual pay the business can cover after its costs and margin. */
export function payTheBooksCoverFromFacts(
  books: BusinessBookMathFacts,
): number {
  return (
    books.annualRevenue * (1 - books.margin) - otherCostsAtSalesFromFacts(books)
  );
}
