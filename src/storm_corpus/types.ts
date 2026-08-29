/**
 * NOAA Storm Events Source Corpus Data Types
 *
 * Source: NOAA National Centers for Environmental Information (NCEI) Storm Events Database.
 * Represents historical severe weather and disaster records (1950-2026).
 *
 * NOTE: This is empirical calibration and reference material for future incident generation.
 * It is strictly separated from canonical game simulation state.
 */

export type StormCoverageEra =
  | "1950-1954_tornado_only"
  | "1955-1995_severe_convective_3"
  | "1996-present_nws_standard_48";

export type StormEventFamily =
  | "tornado"
  | "flood"
  | "winter_storm"
  | "tropical_hurricane"
  | "heat_cold"
  | "severe_storm"
  | "wildfire"
  | "drought_environment"
  | "marine_coastal"
  | "other";

export type StormDamageQualifier =
  | "exact"
  | "kilo" // K (thousands)
  | "mega" // M (millions)
  | "giga" // B (billions)
  | "bracket_code" // Historical category code
  | "unspecified" // String provided but numeric estimate absent
  | "missing"; // No damage data reported / null

export type StormMagnitudeUnit =
  | "knots"
  | "mph"
  | "inches"
  | "feet"
  | "f_scale" // Fujita scale (pre-2007-02-01)
  | "ef_scale" // Enhanced Fujita scale (post-2007-02-01)
  | "category" // Saffir-Simpson (1-5)
  | "millibars"
  | "unknown";

export type CountyOrZoneType = "C" | "Z" | "M";

export interface GeoCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface StormLocation {
  readonly locationName: string | null;
  readonly rangeMiles: number | null;
  readonly azimuth: string | null;
  readonly beginCoordinates: GeoCoordinates | null;
  readonly endCoordinates: GeoCoordinates | null;
}

export interface StormMagnitude {
  readonly value: number | null;
  readonly unit: StormMagnitudeUnit | null;
  readonly magnitudeType: string | null; // e.g. "EG" (Estimated Gust), "MG" (Measured Gust), "ES", "MS"
  readonly rawMagnitude: number | null;
  readonly rawMagnitudeType: string | null;
  readonly rawTorFScale: string | null; // "F0"-"F5", "EF0"-"EF5", "EFU", null
  readonly torLengthMiles: number | null;
  readonly torWidthYards: number | null;
  readonly hurricaneCategory: number | null; // 1-5
  readonly floodCause: string | null; // "Heavy Rain", "Dam Break", "Snowmelt", etc.
}

export interface StormCasualties {
  readonly injuriesDirect: number | null;
  readonly injuriesIndirect: number | null;
  readonly deathsDirect: number | null;
  readonly deathsIndirect: number | null;
  readonly totalDirectCasualties: number | null;
}

export interface StormDamageItem {
  readonly raw: string | null;
  readonly estimatedDollars: number | null;
  readonly qualifier: StormDamageQualifier;
}

export interface StormDamage {
  readonly property: StormDamageItem;
  readonly crops: StormDamageItem;
  readonly totalEstimatedDollars: number | null;
}

export interface StormNarratives {
  readonly episodeNarrative: string | null;
  readonly eventNarrative: string | null;
}

export interface StormProvenance {
  readonly sourceDataset: string;
  readonly sourceUrl: string;
  readonly vintage: string;
  readonly recordChecksum?: string;
}

export interface StormEventRecord {
  readonly id: string; // Deterministic stable ID: "storm-event:noaa:<eventId>"
  readonly sourceEventId: number;
  readonly episodeId: number;
  readonly eventType: string; // Canonical NWS event type string (e.g. "Tornado", "Flash Flood")
  readonly eventFamily: StormEventFamily;
  readonly coverageEra: StormCoverageEra;
  readonly beginDateTime: string; // ISO 8601 string
  readonly endDateTime: string; // ISO 8601 string
  readonly state: string; // e.g. "KENTUCKY"
  readonly stateFips: string; // 2-digit FIPS string, e.g. "21"
  readonly czType: CountyOrZoneType; // 'C' (County), 'Z' (Zone), 'M' (Marine)
  readonly czFips: string; // 3-digit FIPS string, e.g. "067"
  readonly czName: string; // e.g. "FAYETTE"
  readonly fullFips: string; // 5-digit FIPS string, e.g. "21067" (or "21Z067" if zone)
  readonly wfo: string | null; // NWS Weather Forecast Office 3-letter code (e.g. "LMK", "JKL")
  readonly location: StormLocation;
  readonly magnitude: StormMagnitude;
  readonly casualties: StormCasualties;
  readonly damage: StormDamage;
  readonly source: string | null;
  readonly narratives: StormNarratives;
  readonly provenance: StormProvenance;
}

export interface StormEpisodeRecord {
  readonly id: string; // Deterministic stable ID: "storm-episode:noaa:<episodeId>"
  readonly sourceEpisodeId: number;
  readonly state: string;
  readonly stateFips: string;
  readonly beginDateTime: string;
  readonly endDateTime: string;
  readonly wfo: string | null;
  readonly narrative: string | null;
  readonly eventIds: readonly string[];
  readonly eventTypes: readonly string[];
  readonly eventFamilies: readonly StormEventFamily[];
  readonly totalDirectInjuries: number | null;
  readonly totalDirectDeaths: number | null;
  readonly totalPropertyDamageDollars: number | null;
  readonly totalCropDamageDollars: number | null;
  readonly totalEstimatedDamageDollars: number | null;
  readonly provenance: StormProvenance;
}

export interface StormCorpus {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly vintage: string;
  readonly totalEvents: number;
  readonly totalEpisodes: number;
  readonly events: readonly StormEventRecord[];
  readonly episodes: readonly StormEpisodeRecord[];
}

/**
 * Derived Aggregates Data Contracts
 */

export interface DecadalFrequencyEntry {
  readonly jurisdictionKey: string; // State FIPS (e.g. "21") or County FIPS (e.g. "21067")
  readonly jurisdictionName: string;
  readonly eventFamily: StormEventFamily;
  readonly decade: string; // e.g. "1950s", "1960s", "1970s", ..., "2020s"
  readonly coverageEra: StormCoverageEra;
  readonly eventCount: number;
  readonly episodeCount: number;
  readonly yearsInDecadeObserved: number;
  readonly annualizedRate: number;
  readonly coverageCaveat: string | null;
}

export interface SeasonalityMonthlyEntry {
  readonly month: number; // 1-12
  readonly monthName: string;
  readonly eventCount: number;
  readonly proportion: number; // 0.0 - 1.0
}

export interface SeasonalityProfile {
  readonly jurisdictionKey: string;
  readonly eventFamily: StormEventFamily;
  readonly totalEvents: number;
  readonly monthlyDistribution: readonly SeasonalityMonthlyEntry[];
  readonly peakMonths: readonly number[]; // Months with highest activity
}

export interface DamageTierCount {
  readonly tierKey:
    | "zero_or_unspecified"
    | "under_10k"
    | "10k_to_100k"
    | "100k_to_1m"
    | "1m_to_10m"
    | "10m_to_100m"
    | "over_100m";
  readonly minDollars: number;
  readonly maxDollars: number | null;
  readonly eventCount: number;
  readonly proportion: number;
}

export interface ObservedDamageDistribution {
  readonly jurisdictionKey: string;
  readonly eventFamily: StormEventFamily;
  readonly totalEvents: number;
  readonly eventsWithReportedDamage: number;
  readonly eventsWithMissingDamage: number;
  readonly reportedDamageRate: number;
  readonly minDamageDollars: number | null;
  readonly medianDamageDollars: number | null;
  readonly p75DamageDollars: number | null;
  readonly p90DamageDollars: number | null;
  readonly p99DamageDollars: number | null;
  readonly maxDamageDollars: number | null;
  readonly damageTiers: readonly DamageTierCount[];
  readonly calibrationCaveat: string;
}

export interface DerivedAggregates {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly disclaimers: readonly string[];
  readonly decadalFrequencies: readonly DecadalFrequencyEntry[];
  readonly seasonalityProfiles: readonly SeasonalityProfile[];
  readonly damageDistributions: readonly ObservedDamageDistribution[];
}

/**
 * Coverage Manifest Contracts
 */

export interface EraCoverageDescription {
  readonly era: StormCoverageEra;
  readonly period: string;
  readonly collectionProcedure: string;
  readonly coveredEventTypes: readonly string[];
  readonly historicalCaveats: readonly string[];
}

export interface JurisdictionCoverageSummary {
  readonly stateFips: string;
  readonly stateName: string;
  readonly earliestEventDate: string;
  readonly latestEventDate: string;
  readonly totalEvents: number;
  readonly totalEpisodes: number;
  readonly eventCountByFamily: Readonly<Record<StormEventFamily, number>>;
  readonly eventCountByEra: Readonly<Record<StormCoverageEra, number>>;
}

export interface StormCoverageManifest {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly vintage: string;
  readonly eras: readonly EraCoverageDescription[];
  readonly jurisdictions: readonly JurisdictionCoverageSummary[];
  readonly totalEventsInCorpus: number;
  readonly totalEpisodesInCorpus: number;
}
