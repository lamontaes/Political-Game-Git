/**
 * Reusable Source-Grounded National Crisis / External Event Routing Foundation
 *
 * Grounded in authoritative empirical providers:
 * - NOAA / NCEI Storm Events
 * - FEMA Disaster Declarations
 * - DOE-417 Electric Emergency Incidents and Disturbances
 * - USGS Earthquake Catalogs & Hazard Information
 * - NIFC Wildfire Data
 * - CDC / HHS Public-Health Emergency Sources
 */

export type ExternalEventFamily =
  | "tropical_hurricane"
  | "tornado_severe_weather"
  | "flooding"
  | "winter_storm"
  | "extreme_heat_cold"
  | "drought"
  | "wildfire"
  | "earthquake"
  | "major_power_disturbance"
  | "public_health_emergency";

export type AuthoritativeProviderId =
  | "noaa_ncei_storm_events"
  | "fema_disaster_declarations"
  | "doe_417_electric_emergency"
  | "usgs_earthquake_hazards"
  | "nifc_wildfire_data"
  | "cdc_public_health_emergencies";

export type GeographicGranularity =
  | "national"
  | "fema_region"
  | "state"
  | "county_fips"
  | "place_fips"
  | "nerc_region"
  | "lat_lon_box"
  | "point_radius";

export interface TemporalCoverage {
  readonly startYear: number;
  readonly endYear: number | null; // null if ongoing/present
  readonly collectionEra: string;
  readonly collectionMethod: string;
  readonly dateGranularity: "date" | "datetime_utc" | "month";
}

export interface GeographicCoverage {
  readonly primaryGranularity: GeographicGranularity;
  readonly supportedGranularities: readonly GeographicGranularity[];
  readonly eligibleFipsPrefixes?: readonly string[];
  readonly eligibleStateAbbrs?: readonly string[];
  readonly geographicNotes: string;
}

export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface SeasonalApplicability {
  readonly appliesYearRound: boolean;
  readonly activeMonths: readonly MonthNumber[]; // 1 = Jan, 12 = Dec
  readonly peakMonths?: readonly MonthNumber[];
  readonly rationale: string;
}

export interface SeverityScale {
  readonly scaleName: string;
  readonly unit: string;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly categories?: readonly string[];
  readonly description: string;
}

export interface SeverityValue {
  readonly scaleName: string;
  readonly numericValue?: number;
  readonly categoryLabel?: string;
  readonly rawValue?: string;
}

export interface DurationConstraint {
  readonly supportsDuration: boolean;
  readonly durationUnit?: "hours" | "days" | "months";
  readonly typicalMin?: number;
  readonly typicalMax?: number;
  readonly maxObserved?: number;
  readonly durationNotes?: string;
}

export interface AffectedGeography {
  readonly stateAbbrs: readonly string[];
  readonly fipsCodes: readonly string[];
  readonly nercRegion?: string;
  readonly boundingBox?: {
    readonly minLat: number;
    readonly maxLat: number;
    readonly minLon: number;
    readonly maxLon: number;
  };
  readonly locationDescription: string;
}

export type EventOriginKind = "empirical_observation" | "simulation_sample";

export interface SourceProvenance {
  readonly providerId: AuthoritativeProviderId;
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly datasetVersion: string;
  readonly retrievedAt: string; // ISO timestamp or date
  readonly sourceHash?: string;
  readonly license: string;
  readonly transformationNotes: string;
}

export interface KnownLimitations {
  readonly historicalDataGaps: readonly string[];
  readonly reportingBiases: readonly string[];
  readonly geographicBoundariesCaveats: readonly string[];
  readonly calibrationCaveats: readonly string[];
}

export interface CalibrationDerivation {
  readonly status: "calibrated" | "unresolved";
  readonly annualOccurrenceRate?: number; // occurrences per year for specified jurisdiction/area
  readonly formula?: string;
  readonly totalObservations?: number;
  readonly samplePeriodYears?: number;
  readonly geographicDenominator?: string;
  readonly unresolvedReason?: string;
}

export interface EventSourceDefinition {
  readonly id: string; // Opaque ID e.g., 'src-noaa-hurricane-v1'
  readonly family: ExternalEventFamily;
  readonly provider: AuthoritativeProviderId;
  readonly name: string;
  readonly description: string;
  readonly temporalCoverage: TemporalCoverage;
  readonly geographicCoverage: GeographicCoverage;
  readonly seasonalApplicability: SeasonalApplicability;
  readonly severityScale: SeverityScale;
  readonly durationConstraint: DurationConstraint;
  readonly provenance: SourceProvenance;
  readonly limitations: KnownLimitations;
  readonly calibration: CalibrationDerivation;
}

export interface ExternalEventRecord {
  readonly id: string;
  readonly sourceDefinitionId: string;
  readonly family: ExternalEventFamily;
  readonly originKind: EventOriginKind;
  readonly title: string;
  readonly date: string; // YYYY-MM-DD
  readonly endDate?: string; // YYYY-MM-DD if available
  readonly severity: SeverityValue;
  readonly affectedGeography: AffectedGeography;
  readonly provenance: SourceProvenance;
  readonly empiricalRecordId?: string; // e.g. NOAA Event ID, FEMA Disaster Number, DOE Incident ID
}

export interface GeographicEligibilityRequest {
  readonly fipsCode?: string;
  readonly stateAbbr?: string;
  readonly date?: string; // YYYY-MM-DD
  readonly month?: MonthNumber;
}

export interface GeographicEligibilityResult {
  readonly eligible: boolean;
  readonly matchingSourceIds: readonly string[];
  readonly seasonalEligible: boolean;
  readonly reasoning: readonly string[];
}
