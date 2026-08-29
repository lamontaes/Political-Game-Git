/**
 * Local Economy and Labor-Market Source Corpus Types
 *
 * Data models for Bureau of Economic Analysis (BEA) Regional Accounts
 * and Bureau of Labor Statistics (BLS) Quarterly Census of Employment and Wages (QCEW).
 *
 * Strict invariants:
 * 1. Explicit price basis (nominal vs real chained dollars with reference year).
 * 2. Strict observation cadence (annual, quarterly, monthly) - no synthetic monthly values from annual totals.
 * 3. Surviving QCEW suppression and disclosure codes.
 * 4. Distinct vintage and revision identity.
 */

export type EconomyProvider =
  "bea_regional" | "bls_qcew" | "census_cbp" | "manual_benchmark";

export type GeographicLevel = "national" | "state" | "county" | "cbsa_msa";

export type FrequencyType = "annual" | "quarterly" | "monthly";

export type PriceBasis = "nominal" | "real";

export type CurrencyDenomination = "USD";

export interface MoneyValueUnit {
  kind: "currency";
  currency: CurrencyDenomination;
  priceBasis: PriceBasis;
  referenceYear?: number; // e.g. 2017 for chained 2017 dollars
  scaleMultiplier: number; // e.g. 1000 for thousands of dollars, 1 for exact dollars
  displayUnit: string; // e.g. "Thousands of dollars", "Millions of chained 2017 dollars"
}

export interface NonMoneyValueUnit {
  kind: "count" | "ratio" | "index" | "percentage";
  scaleMultiplier: number; // e.g. 1 for exact jobs, 0.01 for percentage
  displayUnit: string; // e.g. "Number of jobs", "Establishments", "Index 2017=100", "Percent"
}

export type ValueUnit = MoneyValueUnit | NonMoneyValueUnit;

export type SuppressionStatus =
  | "disclosable"
  | "suppressed_confidential"
  | "suppressed_subthreshold"
  | "not_available";

export type VintageRevisionType =
  "preliminary" | "revised" | "comprehensive_benchmark" | "final_annual";

export interface SourceVintageMetadata {
  vintageId: string;
  provider: EconomyProvider;
  vintageName: string;
  releaseDate: string; // ISO 8601 YYYY-MM-DD
  revisionType: VintageRevisionType;
  supersedesVintageId?: string;
  description: string;
}

export interface EconomyProvenance {
  provider: EconomyProvider;
  providerSeriesId: string;
  vintageId: string;
  tableOrDataset: string;
  lineCodeOrField?: string;
  officialSourceUrl: string | null;
  retrievalTimestamp: string;
  compilerVersion: string;
  sha256: string;
}

export type EconomyMeasureCategory =
  | "gdp"
  | "personal_income"
  | "earnings"
  | "wages"
  | "employment"
  | "establishments"
  | "transfer_receipts"
  | "proprietors_income"
  | "population"
  | "per_capita_income"
  | "average_wage";

export type QcewOwnershipCode =
  | "0" // Total Covered
  | "1" // Federal Government
  | "2" // State Government
  | "3" // Local Government
  | "5"; // Private

export type QcewOwnershipTitle =
  | "Total Covered"
  | "Federal Government"
  | "State Government"
  | "Local Government"
  | "Private";

export interface EconomyObservationRecord {
  observationId: string; // stable synthetic ID: geoFips_measure_period_vintage
  geoFips: string; // 5-digit county FIPS, 2-digit state FIPS, or "00000" for US
  geoName: string;
  geoLevel: GeographicLevel;
  stateAbbr: string; // e.g. "KY", "CA", "US"

  category: EconomyMeasureCategory;
  measureCode: string; // e.g. "CAGDP1-1", "CAINC1-10", "QCEW-ANNUAL-WAGES"
  measureName: string;

  // Industry & NAICS
  naicsCode: string | null; // e.g. "10", "31-33", "54", "336111"
  naicsTitle: string | null;
  ownershipCode: QcewOwnershipCode | null;
  ownershipTitle: QcewOwnershipTitle | null;

  // Temporal
  frequency: FrequencyType;
  year: number;
  quarter: number | null; // 1..4 or null if annual
  month: number | null; // 1..12 or null if annual/quarterly
  periodLabel: string; // "2022", "2022Q1", "2022M03"
  periodStartDate: string; // "2022-01-01"
  periodEndDate: string; // "2022-12-31"

  // Units and Values
  unit: ValueUnit;
  value: number | null; // null if suppressed
  rawValue: string | number | null; // verbatim string from source
  isSuppressed: boolean;
  suppressionStatus: SuppressionStatus;
  suppressionCode: string | null; // raw code: "(D)", "(L)", "(N)", "N", "C", etc.

  // Provenance & Vintage
  provenance: EconomyProvenance;
}

export interface EconomySeriesSummary {
  seriesKey: string;
  geoFips: string;
  geoName: string;
  geoLevel: GeographicLevel;
  category: EconomyMeasureCategory;
  measureCode: string;
  measureName: string;
  naicsCode: string | null;
  frequency: FrequencyType;
  unit: ValueUnit;
  firstYear: number;
  lastYear: number;
  observationCount: number;
  suppressedCount: number;
  vintages: string[];
}

export interface LocalEconomyJurisdictionSummary {
  geoFips: string;
  geoName: string;
  geoLevel: GeographicLevel;
  stateAbbr: string;
  hasBeaRegional: boolean;
  hasQcew: boolean;
  coveredYears: number[];
  totalObservations: number;
  categoriesPresent: EconomyMeasureCategory[];
  naicsSectorsPresent: string[];
}

export interface LocalEconomyManifest {
  manifestVersion: string;
  generatedAt: string;
  compilerVersion: string;
  totalJurisdictions: number;
  totalObservations: number;
  totalSeries: number;
  vintages: SourceVintageMetadata[];
  jurisdictions: Record<string, LocalEconomyJurisdictionSummary>;
  providers: {
    bea: {
      name: string;
      documentationUrl: string;
      apiBaseUrl: string;
    };
    bls_qcew: {
      name: string;
      documentationUrl: string;
      apiBaseUrl: string;
    };
  };
  sha256: string;
}

export interface NormalizedEconomyCorpusPackage {
  manifest: LocalEconomyManifest;
  vintages: SourceVintageMetadata[];
  observations: EconomyObservationRecord[];
  series: EconomySeriesSummary[];
  buildMetadata: {
    compiledAt: string;
    compilerVersion: string;
    recordCounts: {
      totalObservations: number;
      totalSeries: number;
      totalJurisdictions: number;
      totalVintages: number;
      suppressedObservations: number;
      realDollarObservations: number;
      nominalDollarObservations: number;
    };
    checksum: string;
  };
}

/**
 * Analytical & Calibration Types
 */

export interface LocationQuotientResult {
  geoFips: string;
  geoName: string;
  benchmarkFips: string;
  benchmarkName: string;
  naicsCode: string;
  naicsTitle: string;
  year: number;
  localEmployment: number | null;
  localTotalEmployment: number | null;
  benchmarkEmployment: number | null;
  benchmarkTotalEmployment: number | null;
  locationQuotient: number | null; // (local_ind / local_tot) / (bench_ind / bench_tot)
  isSuppressed: boolean;
  status: "valid" | "suppressed" | "zero_denominator" | "unavailable";
}

export interface EconomicStructureProfile {
  geoFips: string;
  geoName: string;
  year: number;
  vintageId: string;

  // High-level aggregates
  totalGdpNominalUsd?: number;
  totalGdpRealUsd?: number;
  totalPersonalIncomeNominalUsd?: number;
  perCapitaPersonalIncomeUsd?: number;
  population?: number;

  // Employment composition
  totalEmploymentJobs?: number;
  wageAndSalaryJobs?: number;
  proprietorsJobs?: number;
  proprietorShareOfJobs?: number;

  // Income & Transfer Dependence
  netEarningsNominalUsd?: number;
  transferReceiptsNominalUsd?: number;
  transferShareOfPersonalIncome?: number; // transferReceipts / totalPersonalIncome
  dividendsInterestRentNominalUsd?: number;

  // QCEW Sector Composition (Private + Total Covered)
  goodsProducingEmployment?: number;
  serviceProvidingEmployment?: number;
  goodsProducingShare?: number;
  serviceProvidingShare?: number;

  // Ownership breakdown
  privateEmployment?: number;
  governmentEmployment?: number;
  governmentShareOfEmployment?: number;

  // Wage Levels
  averageAnnualPayTotalCoveredUsd?: number;
  averageAnnualPayPrivateUsd?: number;
  averageWeeklyWageTotalCoveredUsd?: number;
}
