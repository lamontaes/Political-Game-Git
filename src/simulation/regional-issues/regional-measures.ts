import generated from "./regional-measures.generated.json";
import type { IsoDate } from "../types";

/**
 * What a state is up against, measured: what housing and everything else
 * costs there against the nation, what people earn, what a two-bedroom rents
 * for, and how many are out of work.
 *
 * Every figure is a publisher's own observation (BEA regional price parities
 * and personal income, HUD Fair Market Rents and income limits, BLS LAUS),
 * exported by `scripts/source/export-regional-measures.ts`. A reader asks on a
 * date and gets the latest period that had ended by then, never a later one.
 * A missing series is absent, never zero.
 */

export type RegionalMeasureKey =
  | "housingPriceIndex"
  | "allItemsPriceIndex"
  | "perCapitaIncome"
  | "twoBedroomFairMarketRent"
  | "medianFamilyIncome"
  | "unemploymentRate";

export const REGIONAL_MEASURE_KEYS: readonly RegionalMeasureKey[] = [
  "housingPriceIndex",
  "allItemsPriceIndex",
  "perCapitaIncome",
  "twoBedroomFairMarketRent",
  "medianFamilyIncome",
  "unemploymentRate",
];

export interface RegionalObservation {
  readonly period: string;
  readonly periodEnd: IsoDate;
  readonly value: number;
  /** The same figure for the nation, or null where the source publishes none. */
  readonly national: number | null;
}

export interface JurisdictionRegionalMeasures {
  readonly jurisdictionKey: string;
  readonly name: string;
  readonly housingPriceIndex: readonly RegionalObservation[];
  readonly allItemsPriceIndex: readonly RegionalObservation[];
  readonly perCapitaIncome: readonly RegionalObservation[];
  readonly twoBedroomFairMarketRent: readonly RegionalObservation[];
  readonly medianFamilyIncome: readonly RegionalObservation[];
  readonly unemploymentRate: readonly RegionalObservation[];
}

/** The latest observation of each measure available on one date. */
export type RegionalMeasuresOnDate = {
  readonly jurisdictionKey: string;
  readonly name: string;
} & {
  readonly [K in RegionalMeasureKey]: RegionalObservation | null;
};

const BY_KEY: ReadonlyMap<string, JurisdictionRegionalMeasures> = new Map(
  (
    generated as { jurisdictions: JurisdictionRegionalMeasures[] }
  ).jurisdictions.map((entry) => [entry.jurisdictionKey, entry]),
);

/** Every jurisdiction the export covers, in key order. */
export function regionalMeasureJurisdictions(): readonly string[] {
  return [...BY_KEY.keys()];
}

/** The whole series for a jurisdiction such as "US-RI", or null for an unknown key. */
export function regionalMeasureSeries(
  jurisdictionKey: string,
): JurisdictionRegionalMeasures | null {
  return BY_KEY.get(jurisdictionKey) ?? null;
}

function latestBy(
  series: readonly RegionalObservation[],
  date: IsoDate,
): RegionalObservation | null {
  let latest: RegionalObservation | null = null;
  for (const observation of series)
    if (observation.periodEnd <= date) latest = observation;
  return latest;
}

/**
 * The latest figure of each measure whose period had ended by `date`. A
 * measure with nothing that early is null: unknown, not zero.
 */
export function regionalMeasuresOn(
  jurisdictionKey: string,
  date: IsoDate,
): RegionalMeasuresOnDate | null {
  const series = BY_KEY.get(jurisdictionKey);
  if (!series) return null;
  return {
    jurisdictionKey,
    name: series.name,
    housingPriceIndex: latestBy(series.housingPriceIndex, date),
    allItemsPriceIndex: latestBy(series.allItemsPriceIndex, date),
    perCapitaIncome: latestBy(series.perCapitaIncome, date),
    twoBedroomFairMarketRent: latestBy(series.twoBedroomFairMarketRent, date),
    medianFamilyIncome: latestBy(series.medianFamilyIncome, date),
    unemploymentRate: latestBy(series.unemploymentRate, date),
  };
}

/**
 * A state's regional housing cost against the nation, for readers such as
 * migration's `cost:` reason: BEA's housing price parity divided by the
 * nation's for the same year (1.05 is five percent above), plus a year of
 * two-bedroom rent as a share of the median family's income. Either part is
 * null where its source has nothing on that date. It is a measurement only:
 * how much of it makes anyone move is a rule this module does not hold.
 */
export interface RegionalHousingCost {
  readonly jurisdictionKey: string;
  readonly housingPriceRelativeToNation: number | null;
  readonly housingPricePeriod: string | null;
  readonly rentShareOfMedianFamilyIncome: number | null;
  readonly nationalRentShareOfMedianFamilyIncome: number | null;
  readonly rentPeriod: string | null;
}

export function regionalHousingCost(
  jurisdictionKey: string,
  date: IsoDate,
): RegionalHousingCost | null {
  const measures = regionalMeasuresOn(jurisdictionKey, date);
  if (!measures) return null;
  const price = measures.housingPriceIndex;
  const rent = measures.twoBedroomFairMarketRent;
  const income = measures.medianFamilyIncome;
  const rentPairs = rent && income && rent.period === income.period;
  return {
    jurisdictionKey,
    housingPriceRelativeToNation:
      price && price.national ? price.value / price.national : null,
    housingPricePeriod: price?.period ?? null,
    rentShareOfMedianFamilyIncome: rentPairs
      ? (rent.value * 12) / income.value
      : null,
    nationalRentShareOfMedianFamilyIncome:
      rentPairs && rent.national && income.national
        ? (rent.national * 12) / income.national
        : null,
    rentPeriod: rentPairs ? rent.period : null,
  };
}
