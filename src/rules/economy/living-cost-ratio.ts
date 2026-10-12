import type { LivingCostsSourceMean } from "../../simulation/living-costs-data";
// stopgapId: "economy.joint-living-cost-ratio"
export function estimateLivingCostsCategoryAnnual(
  size: LivingCostsSourceMean | undefined,
  region: LivingCostsSourceMean | undefined,
  national: LivingCostsSourceMean | undefined,
) {
  if (size && region && national && national.annualMeanUsd > 0)
    return {
      annualMeanUsd:
        size.annualMeanUsd * (region.annualMeanUsd / national.annualMeanUsd),
      method: "size-times-region-ratio" as const,
      sourceMeans: { size, region, national },
    };
  const available = size ?? region ?? national;
  return available
    ? {
        annualMeanUsd: available.annualMeanUsd,
        method: "available-table-unscaled" as const,
        sourceMeans: { size, region, national },
      }
    : null;
}
