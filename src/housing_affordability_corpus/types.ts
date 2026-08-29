/**
 * National Housing & Affordability Source Corpus Types
 *
 * Grounded schemas for HUD USER Fair Market Rents (FMR), HUD USER Income Limits (IL),
 * and Comprehensive Housing Affordability Strategy (CHAS 2018-2022 ACS).
 *
 * Boundaries:
 * - Real-world starting and calibration data layer only; no individual household simulator.
 * - Table universes and suppression statuses are strictly preserved.
 * - FMR is gross rent standard, not observed median rent.
 */

export type HousingDataSource =
  | "hud_user_fmr"
  | "hud_user_il"
  | "hud_user_api"
  | "census_chas"
  | "manual_benchmark";

export type GeographicGranularity =
  "county" | "metro_area" | "state" | "territory" | "small_area_zip";

export type ChasTableUniverse =
  | "occupied_housing_units"
  | "renter_occupied_housing_units"
  | "owner_occupied_housing_units"
  | "all_housing_units"
  | "rental_housing_units"
  | "households_cost_burden_computable";

export type AmiBracket =
  | "le_30_pct_ami" // <= 30% HAMFI (Extremely Low Income)
  | "gt_30_le_50_pct_ami" // > 30% to <= 50% HAMFI (Very Low Income)
  | "gt_50_le_80_pct_ami" // > 50% to <= 80% HAMFI (Low Income)
  | "gt_80_le_100_pct_ami" // > 80% to <= 100% HAMFI (Moderate Income)
  | "gt_100_pct_ami" // > 100% HAMFI (Above Area Median Income)
  | "all_income_levels"; // Total across brackets

export type TenureType = "owner" | "renter" | "total";

export type HouseholdType =
  | "elderly_family" // 2 persons, 1+ age 62+
  | "small_family" // 2 persons <62, or 3-4 persons
  | "large_family" // 5+ persons
  | "elderly_nonfamily" // 1-2 persons, non-family, age 62+
  | "other_nonfamily" // 1-2 persons, non-family, <62
  | "all_types";

export type CostBurdenCategory =
  | "le_30_pct" // Not cost burdened (<= 30% of income)
  | "gt_30_le_50_pct" // Cost burdened (> 30% to <= 50% of income)
  | "gt_50_pct" // Severely cost burdened (> 50% of income)
  | "not_computed" // Not computed (zero/negative income, no cash rent)
  | "all_burdens";

export type HousingProblemsCategory =
  | "has_1_or_more_problems" // 1+ of: incomplete kitchen, incomplete plumbing, >1.01 persons/room, >30% cost burden
  | "has_1_or_more_severe_problems" // 1+ of: incomplete kitchen, incomplete plumbing, >1.50 persons/room, >50% cost burden
  | "has_no_problems"
  | "problems_not_computed"
  | "all_conditions";

export type SuppressionStatus =
  | "available" // Observation present with valid numeric value >= 0
  | "suppressed" // Suppressed by Census/HUD for privacy/sample size
  | "not_computed" // Uncomputable (e.g. zero income or no cash rent)
  | "not_available"; // Variable missing in release/table

export type SuppressionReason =
  | "none"
  | "disclosure_avoidance"
  | "sample_size_threshold"
  | "zero_or_negative_income"
  | "no_cash_rent"
  | "table_universe_exclusion"
  | "unsupported_variable";

export interface GeographicIdentity {
  geoId: string; // e.g. "county_21067", "metro_30460", "county_72127"
  name: string; // e.g. "Fayette County, Kentucky"
  stateFips: string; // 2-digit FIPS, e.g. "21", "06", "72"
  stateAbbr: string; // e.g. "KY", "CA", "PR"
  countyFips: string | null; // 5-digit county FIPS e.g. "21067"
  cbsaCode: string | null; // CBSA / HMFA code e.g. "30460"
  metroName: string | null; // e.g. "Lexington-Fayette, KY MSA"
  isMetropolitan: boolean;
  isTerritory: boolean;
}

export interface HousingSourceProvenance {
  source: HousingDataSource;
  vintage: string; // e.g. "FY2024", "2018-2022_ACS5YR"
  sourceUrl: string | null;
  downloadTimestamp: string;
  sha256: string;
  retrievalMethod: "api" | "download" | "fixture";
  notes?: string;
}

export interface FairMarketRentRecord {
  id: string; // e.g. "us_hud_fmr_21067_fy2024"
  geo: GeographicIdentity;
  vintage: string; // "FY2024"
  fmr0Br: number; // Efficiency / Studio monthly gross rent ($)
  fmr1Br: number; // 1-Bedroom monthly gross rent ($)
  fmr2Br: number; // 2-Bedroom monthly gross rent ($)
  fmr3Br: number; // 3-Bedroom monthly gross rent ($)
  fmr4Br: number; // 4-Bedroom monthly gross rent ($)
  percentile: 40 | 50; // Typically 40th percentile
  isSmallAreaFmr: boolean;
  isObservedMedianRent: false; // Invariant: FMR != observed median rent
  provenance: HousingSourceProvenance;
}

export interface IncomeLimitRecord {
  id: string; // e.g. "us_hud_il_21067_fy2024"
  geo: GeographicIdentity;
  vintage: string; // "FY2024"
  medianFamilyIncome: number; // 4-person Area Median Family Income (MFI/AMI) ($/year)
  limits30Pct: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>; // 30% AMI (Extremely Low Income)
  limits50Pct: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>; // 50% AMI (Very Low Income)
  limits80Pct: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>; // 80% AMI (Low Income)
  provenance: HousingSourceProvenance;
}

export interface ChasAffordabilityRecord {
  id: string; // e.g. "us_chas_t7_21067_2018_2022_..."
  geo: GeographicIdentity;
  vintage: string; // "2018-2022"
  tableId: string; // e.g. "Table1", "Table7", "Table8", "Table9"
  sourceVariable: string; // e.g. "T7_est2"
  tableUniverse: ChasTableUniverse;
  amiBracket: AmiBracket;
  tenure: TenureType;
  householdType: HouseholdType;
  costBurden: CostBurdenCategory;
  housingProblems: HousingProblemsCategory;
  householdCount: number | null; // null if suppressed
  suppression: {
    status: SuppressionStatus;
    isSuppressed: boolean;
    reason: SuppressionReason;
  };
  provenance: HousingSourceProvenance;
}

export interface AmiBracketSummary {
  amiBracket: AmiBracket;
  totalHouseholds: number;
  renters: number;
  owners: number;
  costBurdenedCount: number; // > 30%
  severelyCostBurdenedCount: number; // > 50%
  costBurdenRate: number; // percentage >30%
  severeCostBurdenRate: number; // percentage >50%
}

export interface HousingCalibrationProfile {
  profileId: string; // e.g. "profile_housing_21067"
  geo: GeographicIdentity;
  asOfVintage: {
    fmrVintage: string;
    ilVintage: string;
    chasVintage: string;
  };
  fmr: FairMarketRentRecord;
  incomeLimits: IncomeLimitRecord;
  chasSummary: {
    totalHouseholds: number;
    totalRenters: number;
    totalOwners: number;
    byAmiBracket: Record<AmiBracket, AmiBracketSummary>;
    costBurdenSummary: {
      notBurdenedCount: number;
      costBurdenedCount: number;
      severelyCostBurdenedCount: number;
      notComputedCount: number;
      costBurdenRate: number; // (costBurdened + severe) / (total - notComputed)
      severeCostBurdenRate: number; // severe / (total - notComputed)
    };
    housingProblemsSummary: {
      has1OrMoreProblemsCount: number;
      has1OrMoreSevereProblemsCount: number;
      hasNoProblemsCount: number;
      problemsNotComputedCount: number;
      housingProblemsRate: number;
    };
    suppressionSummary: {
      totalCellCount: number;
      suppressedCellCount: number;
      suppressedRatio: number;
    };
  };
  provenance: HousingSourceProvenance;
}

export interface CompiledHousingCorpus {
  corpusId: string;
  schemaVersion: string;
  compiledAt: string;
  compilerVersion: string;
  geographicCoverage: GeographicIdentity[];
  fmrRecords: FairMarketRentRecord[];
  incomeLimitRecords: IncomeLimitRecord[];
  chasRecords: ChasAffordabilityRecord[];
  calibrationProfiles: HousingCalibrationProfile[];
  corpusSha256: string;
}

export interface JurisdictionCoverageSummary {
  geoId: string;
  name: string;
  stateAbbr: string;
  countyFips: string | null;
  cbsaCode: string | null;
  isTerritory: boolean;
  hasFmr: boolean;
  hasIncomeLimits: boolean;
  hasChas: boolean;
  fmrVintages: string[];
  ilVintages: string[];
  chasVintages: string[];
  totalChasHouseholds: number | null;
  medianFamilyIncome: number | null;
  fmr2Br: number | null;
  severeCostBurdenRate: number | null;
}

export interface NationalHousingCoverageManifest {
  manifestId: string;
  schemaVersion: string;
  generatedAt: string;
  compilerVersion: string;
  jurisdictions: JurisdictionCoverageSummary[];
  totalJurisdictionsCount: number;
  completeCoverageCount: number;
  manifestSha256: string;
}
