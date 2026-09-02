/**
 * Core type definitions for U.S. Census Bureau ACS 5-Year Community & Demographic Baselines.
 *
 * Principles:
 * - Real-world data snapshots remain distinct from simulated world history (Constitution principle 25, D-009, D-042).
 * - Demographic facts reflect aggregate community measures; they NEVER infer individual beliefs or opinions.
 * - Estimates and Margins of Error (MOE) are ALWAYS paired; MOE is NEVER treated as zero.
 * - Incompatible universes cannot be silently compared or combined.
 * - Vintages cannot be silently mixed.
 */

export type AcsVintage = number; // e.g. 2009 .. 2024

export type GeographyLevel =
  | "nation"
  | "state"
  | "county"
  | "place"
  | "congressional_district"
  | "metro_area"
  | "zcta"
  | "tract"
  | "block_group";

/**
 * Standardized, unambiguous, hierarchical geography identifier.
 * Format examples:
 * - Nation: "geo:us"
 * - State: "geo:state:21" (Kentucky), "geo:state:48" (Texas)
 * - County: "geo:county:21067" (Fayette County, KY), "geo:county:48453" (Travis County, TX)
 * - Place: "geo:place:2146027" (Lexington-Fayette, KY), "geo:place:4805000" (Austin city, TX)
 * - Congressional District: "geo:cd:2106" (KY-06), "geo:cd:4837" (TX-37)
 * - Metro Area: "geo:cbsa:30460" (Lexington-Fayette, KY MSA), "geo:cbsa:12420" (Austin-Round Rock, TX MSA)
 * - ZCTA: "geo:zcta:40507", "geo:zcta:78701"
 * - Census Tract: "geo:tract:21067000100", "geo:tract:48453000101"
 * - Block Group: "geo:bg:210670001001", "geo:bg:484530001011"
 */
export type GeographyId = `geo:${string}`;

export interface GeographyRef {
  id: GeographyId;
  level: GeographyLevel;
  name: string;
  stateFips?: string;
  countyFips?: string;
  placeFips?: string;
  tractFips?: string;
  blockGroupFips?: string;
  cdNumber?: string;
  cbsaCode?: string;
  zctaCode?: string;
  parentId?: GeographyId | null;
}

/**
 * Validated Census Universes.
 * Every ACS table measures a specific statistical universe (denominator).
 * Mathematical operations (percentages, shares, comparisons) MUST check universe compatibility.
 */
export type AcsUniverseId =
  | "total_population"
  | "population_18_and_over"
  | "citizen_population_18_and_over"
  | "population_25_and_over"
  | "population_16_and_over"
  | "civilian_labor_force_16_and_over"
  | "civilian_employed_16_and_over"
  | "civilian_noninstitutionalized_population"
  | "households"
  | "family_households"
  | "occupied_housing_units"
  | "renter_occupied_cash_rent"
  | "owner_occupied_housing_units"
  | "workers_16_and_over"
  | "poverty_universe";

export interface UniverseDefinition {
  id: AcsUniverseId;
  name: string;
  description: string;
  parentUniverseId?: AcsUniverseId | null;
  baseTableId: string;
  baseVariableId: string;
}

export type VariableCategory =
  | "population"
  | "voting_age_and_citizenship"
  | "age_structure"
  | "sex"
  | "educational_attainment"
  | "household_income"
  | "poverty"
  | "employment_status"
  | "occupation_and_industry"
  | "housing_tenure"
  | "rent_and_home_value"
  | "commuting"
  | "household_structure"
  | "disability"
  | "nativity_and_citizenship"
  | "race_and_hispanic_origin";

export type MeasurementUnit =
  "count" | "dollars" | "years" | "minutes" | "percentage" | "ratio" | "index";

export type AggregationMethod = "sum" | "median" | "mean" | "rate" | "custom";

export interface AcsVariableDefinition {
  id: string; // e.g. "B01003_001"
  estimateVariableId: string; // e.g. "B01003_001E"
  moeVariableId: string; // e.g. "B01003_001M"
  tableId: string; // e.g. "B01003"
  label: string;
  category: VariableCategory;
  universeId: AcsUniverseId;
  unit: MeasurementUnit;
  aggregationMethod: AggregationMethod;
  denominatorVariableId?: string;
  description: string;
}

export type SuppressionReason =
  | "controlled_estimate"
  | "insufficient_sample"
  | "open_ended_interval"
  | "suppressed_for_privacy"
  | "missing_from_source"
  | "not_applicable"
  | "too_small";

export interface SourceMetadata {
  sourceAgency: string; // "U.S. Census Bureau"
  datasetSeries: string; // "American Community Survey 5-Year Estimates"
  apiEndpoint: string;
  vintage: AcsVintage;
  asOfDate: string; // ISO 8601 date, e.g. "2022-12-31"
  retrievalDate: string; // ISO 8601 timestamp
  license: string;
  citation: string;
  reviewStatus: "placeholder" | "candidate" | "approved";
}

export interface AcsEstimateRecord {
  variableId: string;
  tableId: string;
  universeId: AcsUniverseId;
  geographyId: GeographyId;
  vintage: AcsVintage;
  estimate: number | null;
  marginOfError: number | null;
  suppressionReason?: SuppressionReason | null;
  moeAnnotation?: string | null;
  sourceMetadata: SourceMetadata;
}

export interface CommunityBaselineDataset {
  schemaVersion: "community-baselines:v1";
  datasetId: string;
  vintage: AcsVintage;
  geographies: GeographyRef[];
  records: AcsEstimateRecord[];
  metadata: SourceMetadata;
  sha256?: string;
}

export interface DerivedStatistic {
  name: string;
  estimate: number;
  marginOfError: number | null;
  confidenceInterval90: [number, number] | null;
  coefficientOfVariation: number | null;
  unit: MeasurementUnit;
  universeId: AcsUniverseId;
  geographyId: GeographyId;
  vintage: AcsVintage;
  method: string;
  components: {
    variableId: string;
    estimate: number;
    marginOfError: number | null;
  }[];
}

export interface SignificanceTestResult {
  statisticA: {
    label: string;
    estimate: number;
    marginOfError: number;
    geographyId: GeographyId;
    vintage: AcsVintage;
  };
  statisticB: {
    label: string;
    estimate: number;
    marginOfError: number;
    geographyId: GeographyId;
    vintage: AcsVintage;
  };
  difference: number;
  differenceMoe: number;
  zScore: number;
  isStatisticallySignificant90: boolean; // |z| > 1.645
  isStatisticallySignificant95: boolean; // |z| > 1.960
  pLevel: "<0.05" | "<0.10" | "not_significant";
}
