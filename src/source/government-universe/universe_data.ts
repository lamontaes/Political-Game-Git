/**
 * Authoritative Census of Governments Organization Dataset & Baselines
 *
 * Derived directly from authoritative U.S. Census Bureau 2022 Census of Governments
 * organization tables (downloaded and parsed from official Census bytes):
 * - Table 1 [CG2200ORG01]: Government Units by State: Census Years 1942 to 2022
 * - Table 2 [CG2200ORG02]: Local Governments by Type and State: 2022
 * - Table 3 [CG2200ORG03]: General-Purpose Local Governments by State: Census Years 1942 to 2022
 * - Table 4 [CG2200ORG04]: Special-Purpose Local Governments by State: Census Years 1942 to 2022
 * - Table 8 [CG2200ORG08]: Special District Governments by Function and State: 2022
 * - Table 9 [CG2200ORG09]: Public School Systems by Type of Organization and State: 2022
 */

import baselineData from "./data/authoritative_census_2022_baseline.json";
import type {
  HistoricalSeriesRecord,
  SpecialDistrictFunctionSummary,
  StateGovernmentSummary,
} from "./types.js";

export const CENSUS_2022_PROVENANCE = baselineData.provenance;
export const CENSUS_2022_NATIONAL_SUMMARY = baselineData.nationalSummary;

export const STATE_GOVERNMENT_SUMMARIES: Record<
  string,
  StateGovernmentSummary
> = baselineData.stateSummaries as Record<string, StateGovernmentSummary>;

export const SPECIAL_DISTRICT_FUNCTION_SUMMARIES: readonly SpecialDistrictFunctionSummary[] =
  baselineData.specialDistrictFunctions as unknown as SpecialDistrictFunctionSummary[];

export const HISTORICAL_COUNT_SERIES: readonly HistoricalSeriesRecord[] =
  baselineData.historicalSeries as unknown as HistoricalSeriesRecord[];
