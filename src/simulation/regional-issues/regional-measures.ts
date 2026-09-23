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
 * date and gets only figures the locked edition proves were public by then:
 * the publisher's release date, or the retrieval date where no release date
 * is recorded (the economic-context source-time rule). A missing series is
 * absent, never zero.
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
  /** Last day the period covers, as an ISO date. */
  readonly periodEnd: string;
  /** First date the locked edition is proven public, as an ISO date. */
  readonly knownAvailableOn: string;
  readonly knownAvailableOnBasis:
    "publisher-release-date" | "retrieval-date-fallback";
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
    if (observation.knownAvailableOn <= date) latest = observation;
  return latest;
}

/**
 * The latest figure of each measure that was public by `date`. A measure with
 * nothing public that early is null: unknown, not zero.
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
 * HUD's two-bedroom Fair Market Rent benchmark as a share of HUD's area median
 * family income. Both are area benchmarks, not any household's rent or pay. Either part is
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
  const pair =
    rent && income && rent.period === income.period ? { rent, income } : null;
  return {
    jurisdictionKey,
    housingPriceRelativeToNation:
      price && price.national ? price.value / price.national : null,
    housingPricePeriod: price?.period ?? null,
    rentShareOfMedianFamilyIncome: pair
      ? (pair.rent.value * 12) / pair.income.value
      : null,
    nationalRentShareOfMedianFamilyIncome:
      pair && pair.rent.national && pair.income.national
        ? (pair.rent.national * 12) / pair.income.national
        : null,
    rentPeriod: pair ? pair.rent.period : null,
  };
}
