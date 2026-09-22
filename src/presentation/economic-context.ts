import lexingtonEconomicContext from "./generated/economic-context-lexington.json";

/**
 * The generated economic contexts this build carries, by place key.
 *
 * One entry today. It is a registry rather than a single module-level constant
 * because everything below used to name Lexington twice over: once by picking
 * three Lexington-specific provider series keys out of the file, and again by
 * writing "Fayette County", "Kentucky" and "Lexington-Fayette" into the
 * sentences. A second city's generated file is now one import and one line
 * here, and its sentences come out naming that city.
 */

export interface PlayerEconomicContextLine {
  readonly key: string;
  readonly text: string;
  readonly sourceProduct: "bea-regional" | "bls-laus" | "hud-fair-market-rent";
  readonly period: string;
  readonly providerGeographyCode: string;
  /** The conservative first date on which the locked source proves this row was available. */
  readonly knownAvailableOn: string;
  readonly knownAvailableOnBasis: "retrieval-date-fallback";
  readonly sourceRetrievedAt: string;
  /** Null because none of the three locked products establishes a release date. */
  readonly sourceReleaseDate: null;
  readonly interpretationBoundary:
    | "observation-not-wallet"
    | "area-rate-not-person-probability"
    | "benchmark-not-transaction";
}

interface GeneratedObservation {
  readonly sourceSeriesKey: string;
  readonly period: string;
  readonly unit: string;
  readonly sourceProduct:
    PlayerEconomicContextLine["sourceProduct"] | "hud-income-limit";
  readonly geography: {
    readonly level: string;
    readonly providerCode: string;
    readonly providerName: string;
    readonly relationship: string;
  };
  readonly vintage: {
    readonly corpusAsOf: string;
    readonly knownAvailableOn: string;
    readonly knownAvailableOnBasis: "retrieval-date-fallback";
    readonly sourceRetrievedAt: string;
    readonly adjustment: string;
    readonly release: string | null;
  };
  readonly value:
    | { readonly state: "KNOWN"; readonly value: number }
    | { readonly state: "UNKNOWN" | "NOT_APPLICABLE" };
}

interface GeneratedEconomicContext {
  readonly placeKey: string;
  readonly observations: readonly GeneratedObservation[];
}

const GENERATED_CONTEXTS: readonly GeneratedEconomicContext[] = [
  lexingtonEconomicContext as unknown as GeneratedEconomicContext,
];

const CONTEXTS_BY_PLACE = new Map(
  GENERATED_CONTEXTS.map((entry) => [entry.placeKey, entry]),
);

/** Which places this build can say anything about. Exported for diagnostics. */
export function economicContextPlaceKeys(): readonly string[] {
  return [...CONTEXTS_BY_PLACE.keys()].sort((left, right) =>
    left.localeCompare(right),
  );
}

/** The Fair Market Rent this surface quotes; the corpus may carry others. */
const RENT_SERIES_SUFFIX = ".2-bedroom";

/**
 * Compact, browser-safe context for the normal player surface.
 *
 * The generated input is rebuilt from the locked corpora. This projection
 * adds words and number formatting only: it does not create a World
 * observation, personal money, housing, employment, forecast, or news item.
 */
export function playerEconomicContextLines(
  placeKey: string,
  simulationDate: string,
): readonly PlayerEconomicContextLine[] {
  requireIsoDate(simulationDate);
  const context = CONTEXTS_BY_PLACE.get(placeKey);
  if (!context) return [];

  // Which observation fills each line is a property of the source product and
  // of how its geography relates to the place, not of which city this is.
  const income = requireObservation(
    context,
    "the place's own per-capita personal income",
    (observation) =>
      observation.sourceProduct === "bea-regional" &&
      observation.geography.relationship === "same-jurisdiction",
  );
  const unemployment = requireObservation(
    context,
    "an unemployment rate",
    (observation) => observation.sourceProduct === "bls-laus",
  );
  const rent = requireObservation(
    context,
    "a two-bedroom Fair Market Rent",
    (observation) =>
      observation.sourceProduct === "hud-fair-market-rent" &&
      observation.sourceSeriesKey.endsWith(RENT_SERIES_SUFFIX),
  );

  const lines: readonly PlayerEconomicContextLine[] = [
    {
      key: income.sourceSeriesKey,
      text: `${income.period} ${income.geography.providerName} per-capita personal income: ${formatUsd(income.value.value)} a year (BEA). This is an area observation, not money in your wallet.`,
      sourceProduct: "bea-regional",
      period: income.period,
      providerGeographyCode: income.geography.providerCode,
      knownAvailableOn: income.vintage.knownAvailableOn,
      knownAvailableOnBasis: income.vintage.knownAvailableOnBasis,
      sourceRetrievedAt: income.vintage.sourceRetrievedAt,
      sourceReleaseDate: null,
      interpretationBoundary: "observation-not-wallet",
    },
    {
      key: unemployment.sourceSeriesKey,
      text: `${formatLausPeriod(unemployment.period)} ${unemployment.geography.providerName} unemployment rate: ${unemployment.value.value.toFixed(1)}%, ${unemployment.vintage.adjustment.toLowerCase()} (BLS LAUS${unemployment.vintage.release === "PRELIMINARY" ? ", preliminary" : ""}). This area rate is not your personal chance of losing a job.`,
      sourceProduct: "bls-laus",
      period: unemployment.period,
      providerGeographyCode: unemployment.geography.providerCode,
      knownAvailableOn: unemployment.vintage.knownAvailableOn,
      knownAvailableOnBasis: unemployment.vintage.knownAvailableOnBasis,
      sourceRetrievedAt: unemployment.vintage.sourceRetrievedAt,
      sourceReleaseDate: null,
      interpretationBoundary: "area-rate-not-person-probability",
    },
    {
      key: rent.sourceSeriesKey,
      text: `${rent.period} ${rent.geography.providerName} 2-bedroom Fair Market Rent: ${formatUsd(rent.value.value)} per month (HUD). This is a benchmark, not a rent offer or lease.`,
      sourceProduct: "hud-fair-market-rent",
      period: rent.period,
      providerGeographyCode: rent.geography.providerCode,
      knownAvailableOn: rent.vintage.knownAvailableOn,
      knownAvailableOnBasis: rent.vintage.knownAvailableOnBasis,
      sourceRetrievedAt: rent.vintage.sourceRetrievedAt,
      sourceReleaseDate: null,
      interpretationBoundary: "benchmark-not-transaction",
    },
  ];
  return lines.filter((line) => line.knownAvailableOn <= simulationDate);
}

function requireIsoDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(
      `Economic context requires an ISO simulation date: ${value}`,
    );
  }
}

function requireObservation(
  context: GeneratedEconomicContext,
  wanted: string,
  matches: (observation: GeneratedObservation) => boolean,
): GeneratedObservation & {
  readonly value: { readonly state: "KNOWN"; readonly value: number };
} {
  const found = context.observations.filter(
    (candidate) => matches(candidate) && candidate.value.state === "KNOWN",
  );
  if (found.length !== 1) {
    throw new Error(
      `Generated economic context for ${context.placeKey} carries ${found.length} known observations for ${wanted}; it needs exactly one.`,
    );
  }
  return found[0] as GeneratedObservation & {
    readonly value: { readonly state: "KNOWN"; readonly value: number };
  };
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLausPeriod(period: string): string {
  const match = /^(\d{4})-M(\d{2})$/.exec(period);
  if (!match) return period;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
