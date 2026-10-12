import { estimateLivingCostsCategoryAnnual } from "./living-cost-ratio";
import type {
  LivingCostsRegion,
  LivingCostsSize,
} from "../../simulation/living-costs-data";
import type { LIVING_COSTS_CATEGORY_DATA } from "../../simulation/living-costs-category-data";
export interface LivingCostFacts {
  readonly categories: typeof LIVING_COSTS_CATEGORY_DATA;
}
export function estimatedMonthlyHouseholdLivingCosts(
  facts: LivingCostFacts,
  region: LivingCostsRegion,
  householdSize: number,
) {
  if (!Number.isSafeInteger(householdSize) || householdSize < 1)
    throw new Error(
      "Living-cost household size must be a positive whole count",
    );
  const size = (
    householdSize >= 5 ? "5plus" : String(householdSize)
  ) as LivingCostsSize;
  const categories = Object.entries(facts.categories).map(([key, row]) => ({
    key,
    label: row.label,
    ...estimateLivingCostsCategoryAnnual(
      row.sizes[size],
      row.regions[region],
      row.regions.national,
    )!,
  }));
  return {
    label: "ESTIMATED FROM AVERAGE" as const,
    householdSize,
    sizeColumn: size,
    region,
    monthlyMinor: Math.round(
      (categories.reduce((sum, row) => sum + row.annualMeanUsd, 0) * 100) / 12,
    ),
    categories,
    uncertainty:
      "Published standard errors describe uncertainty of source category means, not the spread of individual household spending.",
  };
}
