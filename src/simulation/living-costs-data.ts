import {
  censusRegionOf,
  censusRegionStates,
  type CensusRegion,
} from "./world-setup/census-regions";
import { LIVING_COSTS_CATEGORY_DATA } from "./living-costs-category-data";
import {
  LIVING_COSTS_PRICE_TABLE,
  livingCostsPriceLevel,
} from "./living-costs-price-table";

/** Representative retained 2024 CES categories, not observed personal bills.
 * Actual housing, vehicle purchases and tuition are settled by their own writers.
 * Public transit, health premiums and medical services await separate bindings.
 */
export const LIVING_COSTS_SOURCE =
  "https://www.bls.gov/cex/tables/calendar-year/mean-item-share-average-standard-error/cu-region-1-year-average-2024.xlsx";
export type LivingCostsRegion = CensusRegion | "national";
export type LivingCostsSize = "1" | "2" | "3" | "4" | "5plus";
export interface LivingCostsSourceMean {
  readonly annualMeanUsd: number;
  readonly standardErrorUsd: number;
  readonly relativeStandardErrorPercent: number;
}

/** The admitted joint estimate; no demographic weights or actor outcome draw. */
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
  // A missing category never acquires a fabricated cross-table multiplier.
  const available = size ?? region ?? national;
  return available
    ? {
        annualMeanUsd: available.annualMeanUsd,
        method: "available-table-unscaled" as const,
        sourceMeans: { size, region, national },
      }
    : null;
}

/** Includes children; Table 1400's five-or-more column is not extrapolated. */
export function estimatedMonthlyHouseholdLivingCosts(
  region: LivingCostsRegion,
  householdSize: number,
  price: {
    readonly currentPriceIndex: number;
    readonly basePriceIndex: number;
  } = {
    currentPriceIndex: 100,
    basePriceIndex: 100,
  },
) {
  if (!Number.isSafeInteger(householdSize) || householdSize < 1)
    throw new Error(
      "Living-cost household size must be a positive whole count",
    );
  const size = (
    householdSize >= 5 ? "5plus" : String(householdSize)
  ) as LivingCostsSize;
  const priceLevel = livingCostsPriceLevel(
    price.currentPriceIndex,
    price.basePriceIndex,
  );
  const categories = Object.entries(LIVING_COSTS_CATEGORY_DATA).map(
    ([key, row]) => {
      const priceRow =
        LIVING_COSTS_PRICE_TABLE[key as keyof typeof LIVING_COSTS_PRICE_TABLE];
      const sourceSize = row.sizes[size];
      const sizeSpread = priceRow.spreadByHousehold[size];
      const priceTableSize =
        sourceSize && Number.isFinite(sizeSpread)
          ? {
              ...sourceSize,
              annualMeanUsd: priceRow.base * sizeSpread,
            }
          : sourceSize;
      const source = estimateLivingCostsCategoryAnnual(
        priceTableSize,
        row.regions[region],
        row.regions.national,
      )!;
      return {
        key,
        label: row.label,
        ...source,
        annualMeanUsd: source.annualMeanUsd * priceLevel,
        linkedMeasure: priceRow.linkedMeasure,
      };
    },
  );
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
export const REPRESENTATIVE_LIVING_COSTS = {
  source: LIVING_COSTS_SOURCE,
  sourceYear: 2024,
  // A637 reports December 2025; month-end is a conservative availability cutoff.
  sourceAvailableBy: "2025-12-31",
  currency: "USD",
  // Table 1800 columns B–F. Retained category means at rows56,344,542,420,435,471,476;
  // derived adult count uses rows16 minus17, both rounded source averages.
  regions: {
    national: {
      annualUsdPerConsumerUnit: {
        food: 10169,
        apparelAndServices: 2001,
        miscellaneous: 1218,
        gasoline: 2411,
        maintenanceAndRepairs: 984,
        drugs: 658,
        medicalSupplies: 233,
      },
      peoplePerConsumerUnit: 2.4,
      childrenUnder18PerConsumerUnit: 0.6,
    },
    northeast: {
      annualUsdPerConsumerUnit: {
        food: 11372,
        apparelAndServices: 2420,
        miscellaneous: 1069,
        gasoline: 2103,
        maintenanceAndRepairs: 986,
        drugs: 661,
        medicalSupplies: 220,
      },
      peoplePerConsumerUnit: 2.4,
      childrenUnder18PerConsumerUnit: 0.5,
    },
    midwest: {
      annualUsdPerConsumerUnit: {
        food: 9677,
        apparelAndServices: 1962,
        miscellaneous: 1142,
        gasoline: 2349,
        maintenanceAndRepairs: 1037,
        drugs: 662,
        medicalSupplies: 262,
      },
      peoplePerConsumerUnit: 2.4,
      childrenUnder18PerConsumerUnit: 0.6,
    },
    south: {
      annualUsdPerConsumerUnit: {
        food: 9003,
        apparelAndServices: 1759,
        miscellaneous: 1029,
        gasoline: 2395,
        maintenanceAndRepairs: 822,
        drugs: 629,
        medicalSupplies: 217,
      },
      peoplePerConsumerUnit: 2.4,
      childrenUnder18PerConsumerUnit: 0.6,
    },
    west: {
      annualUsdPerConsumerUnit: {
        food: 11746,
        apparelAndServices: 2137,
        miscellaneous: 1744,
        gasoline: 2740,
        maintenanceAndRepairs: 1222,
        drugs: 703,
        medicalSupplies: 244,
      },
      peoplePerConsumerUnit: 2.6,
      childrenUnder18PerConsumerUnit: 0.6,
    },
  },
} as const;

let supportedStates: ReadonlySet<string> | undefined;
/** Territories have no CES regional column; retain a labeled national estimate. */
export function livingCostsRegionForState(
  stateKey: string | null,
): LivingCostsRegion {
  const state = stateKey?.startsWith("US-") ? stateKey.slice(3) : stateKey;
  return state && (supportedStates ??= new Set(censusRegionStates())).has(state)
    ? censusRegionOf(state)
    : "national";
}

/** One final rounding after annual spending / derived adults / twelve months. */
export function representativeMonthlyLivingCostsMinor(
  region: LivingCostsRegion = "national",
): number {
  const row = REPRESENTATIVE_LIVING_COSTS.regions[region];
  const annual = Object.values(row.annualUsdPerConsumerUnit).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const adults = row.peoplePerConsumerUnit - row.childrenUnder18PerConsumerUnit;
  return Math.round((annual * 100) / (adults * 12));
}
