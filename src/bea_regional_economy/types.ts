/**
 * Types and contracts for the Bureau of Economic Analysis (BEA) Regional Economy Corpus Sidecar.
 *
 * Provides source-backed state, county, and metropolitan economic indicators
 * for downstream economic & public finance modeling without introducing synthetic
 * gameplay mechanics or political bias into the data corpus.
 */

export type BeaIndicatorCategory =
  | "personal_income"
  | "per_capita_personal_income"
  | "gdp_nominal"
  | "gdp_real"
  | "population"
  | "regional_price_parity";

export type BeaGeoLevel = "state" | "county" | "msa" | "national";

export type BeaValuationKind =
  "nominal" | "real_chained" | "index" | "headcount" | "currency_amount";

export interface BeaUnitMetadata {
  /** Explicit unit of measurement, e.g. "Thousands of Dollars", "Dollars", "Millions of Chained (2017) Dollars", "Persons", "Index (100 = U.S.)" */
  unitName: string;
  /** Numerical multiplier for scaling, e.g. 1000 for "Thousands of Dollars", 1000000 for "Millions", 1 for unit count */
  scaleFactor: number;
  /** Currency code if applicable, e.g. "USD" */
  currencyCode?: string;
  /** Base year for chained or real series, e.g. "2017" or "2012" */
  baseYear?: string;
  /** Structural valuation classification preventing silent cross-valuation math */
  valuationKind: BeaValuationKind;
}

export interface BeaRegionalObservation {
  /** Unique observation ID, e.g. "bea_obs_fips_48000_SAINC1_2022_10" */
  id: string;
  /** Geography FIPS code or GEOID, e.g. "48000" (Texas state), "48453" (Travis County), "12420" (Austin MSA) */
  geoid: string;
  /** Official geography name published by BEA, e.g. "Travis, TX" or "Texas" */
  geoName: string;
  /** Level of geographic aggregation */
  geoLevel: BeaGeoLevel;
  /** State FIPS/USPS code if applicable */
  stateUsps?: string;
  /** Calendar year or time period, e.g. "2022" */
  year: number;
  /** Standard indicator category classification */
  indicatorCategory: BeaIndicatorCategory;
  /** Official BEA Table ID or Dataset Name, e.g. "SAINC1", "CAGDP2", "MARPP" */
  tableId: string;
  /** Official BEA Line Code / Series ID within table, e.g. "10", "20", "30" */
  lineCode: string;
  /** Line descriptive title, e.g. "Personal income (thousands of dollars)" */
  lineDescription: string;
  /**
   * Published numeric value.
   * Preserved as `null` when value is suppressed, unreleased, or missing in source data.
   */
  value: number | null;
  /** Flag indicating if the observation was explicitly suppressed or missing in published source */
  isSuppressedOrMissing: boolean;
  /** Unit and scaling metadata */
  unit: BeaUnitMetadata;
  /** Data revision date or vintage identifier if provided in source */
  vintage?: string;
}

export interface BeaSourceArtifactProvenance {
  artifactId: string;
  sourceUrlOrApiTable: string;
  retrievalDateIso: string;
  sha256Hex: string;
  description: string;
  recordCount: number;
}

export interface BeaCorpusManifest {
  corpusName: "BEA Regional Economic Context Corpus Sidecar";
  corpusVersion: string;
  compiledAtIso: string;
  compilerVersion: string;
  sourceArtifacts: BeaSourceArtifactProvenance[];
  totalObservations: number;
  coverageByGeoLevel: Record<BeaGeoLevel, number>;
  coverageByIndicator: Record<BeaIndicatorCategory, number>;
  yearRange: {
    startYear: number;
    endYear: number;
  };
  checksumSha256Hex: string;
}

export interface BeaEconomyAdapterNote {
  adapterInterfaceVersion: "1.0.0";
  purpose: "Provide source-backed empirical BEA regional indicators to future economy and fiscal simulation engines.";
  supportedIndicators: BeaIndicatorCategory[];
  supportedGeoLevels: BeaGeoLevel[];
  valuationSeparationPolicy: "Nominal, real-chained, and index series must remain explicitly typed and never directly summed or equated without explicit conversion.";
  missingValuePolicy: "Missing or suppressed values remain explicit nulls; adapters must handle incomplete series without inventing fake baseline defaults.";
  gameplayModifierPolicy: "This corpus sidecar strictly prohibits embedding political scores, recession triggers, or gameplay modifiers inside canonical dataset artifacts.";
}
