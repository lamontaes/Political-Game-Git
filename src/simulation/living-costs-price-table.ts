import { LIVING_COSTS_CATEGORY_DATA } from "./living-costs-category-data";

type LivingCostsSize = "1" | "2" | "3" | "4" | "5plus";

/**
 * One retained CES base and household-size adjustment per nonhousing basket
 * category. The national macro price index is the single shared price driver;
 * category-specific legal effects can select the same linked measure later.
 */
export const LIVING_COSTS_PRICE_TABLE = Object.fromEntries(
  Object.entries(LIVING_COSTS_CATEGORY_DATA).map(([category, row]) => {
    const base = row.regions.national.annualMeanUsd;
    const spreadByHousehold = Object.fromEntries(
      Object.entries(row.sizes).map(([size, source]) => [
        size,
        source.annualMeanUsd / base,
      ]),
    );
    return [
      category,
      {
        category,
        base,
        spreadByHousehold,
        linkedMeasure: "macro-economy.national-price-index" as const,
      },
    ];
  }),
) as {
  readonly [K in keyof typeof LIVING_COSTS_CATEGORY_DATA]: {
    readonly category: K;
    readonly base: number;
    readonly spreadByHousehold: Readonly<Record<LivingCostsSize, number>>;
    readonly linkedMeasure: "macro-economy.national-price-index";
  };
};

/** Apply the world's already-recorded price movement to retained 2024 means. */
export function livingCostsPriceLevel(
  currentPriceIndex: number,
  basePriceIndex: number,
): number {
  if (
    !Number.isFinite(currentPriceIndex) ||
    !Number.isFinite(basePriceIndex) ||
    currentPriceIndex <= 0 ||
    basePriceIndex <= 0
  )
    throw new Error("Living-cost price indices must be positive finite values");
  return currentPriceIndex / basePriceIndex;
}
