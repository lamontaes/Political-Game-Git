/**
 * Isolated Authoritative External Event Source Package Types
 *
 * Provides source contracts, provider metadata, and calibration tracking for
 * external national crisis data sources without inserting ungrounded simulation assumptions.
 */

export type EventFamilyKind =
  | "hurricane_tropical_storm"
  | "tornado_severe_weather"
  | "flooding"
  | "winter_storm"
  | "extreme_heat_cold"
  | "drought"
  | "wildfire"
  | "earthquake"
  | "major_power_disturbance"
  | "public_health_emergency";

/**
 * Fundamental semantic distinction between physical phenomenon and administrative/reporting artifact.
 */
export type EventNatureKind =
  | "underlying_physical_hazard"
  | "administrative_declaration_or_response"
  | "utility_grid_report"
  | "public_health_surveillance_record";

export type ProviderId =
  | "noaa_ncei_storm_events"
  | "fema_disaster_declarations"
  | "doe_417_electric_emergency"
  | "usgs_earthquake_hazards"
  | "nifc_wildfire_data"
  | "cdc_public_health_emergency";

export type RecordOriginKind =
  "empirical_incident" | "simulation_generated_event";

/**
 * Calibration status. No probability distributions or rate parameters may be fabricated.
 */
export type CalibrationStatus =
  | {
      readonly status: "calibrated";
      readonly derivationFormula: string;
      readonly empiricalBasis: string;
      readonly samplePeriodYears: number;
      readonly sourceArtifactHash: string;
    }
  | {
      readonly status: "unresolved_requires_research";
      readonly rationale: string;
      readonly missingEvidence: readonly string[];
    };

export interface SourceProvenance {
  readonly providerId: ProviderId;
  readonly providerName: string;
  readonly authoritativeOrganization: string;
  readonly citationUrl: string;
  readonly sourceArtifactVintage: string | null;
  readonly authorityLevel:
    "federal_primary_source" | "interagency_standard" | "state_official";
  readonly sourceBytesSha256: string | null;
  readonly retrievedAtIsoDate: string | null;
}

export interface SourceTemporalCoverage {
  readonly startIsoDate: string | null;
  readonly endIsoDate: string | null;
  readonly updateCadence:
    | "realtime"
    | "daily"
    | "monthly"
    | "annual"
    | "historical_archive"
    | "unresolved";
}

export interface GeographicCoverageSpec {
  readonly scopeKind:
    | "national"
    | "state_level"
    | "county_fips"
    | "point_radius"
    | "jurisdiction_boundary"
    | "unresolved";
  readonly supportedStateCodes: readonly string[] | null;
}

export interface SeasonalityObservation {
  readonly peakObservationNote: string;
  readonly observedActiveMonths: readonly number[] | null;
  readonly isHardProhibition: false; // Always false; observations never imply binary impossibility
}

export interface SeverityFieldReportSpec {
  readonly fieldName: string;
  readonly scaleType: "ordinal" | "continuous" | "categorical" | "unresolved";
  readonly reportedUnit: string | null;
  readonly providerSchemaDefinedBounds: boolean;
  readonly minProviderBound: number | string | null;
  readonly maxProviderBound: number | string | null;
}

export interface SourceDurationReportSpec {
  readonly offersReportedDuration: boolean;
  readonly typicalUnit: "minutes" | "hours" | "days" | "months" | null;
  readonly hasHardLimits: false; // Always false; source reports duration without fabricating hard global limits
}

export interface ExternalEventSourceContract {
  readonly contractId: string;
  readonly eventFamily: EventFamilyKind;
  readonly eventNature: EventNatureKind;
  readonly authoritativeProvider: SourceProvenance;
  readonly temporalCoverage: SourceTemporalCoverage;
  readonly geographicCoverage: GeographicCoverageSpec;
  readonly seasonality: SeasonalityObservation;
  readonly severityFields: readonly SeverityFieldReportSpec[];
  readonly durationSupport: SourceDurationReportSpec;
  readonly recordType: RecordOriginKind;
  readonly calibration: CalibrationStatus;
  readonly knownLimitations: readonly string[];
}

export interface ProviderMetadata {
  readonly providerId: ProviderId;
  readonly name: string;
  readonly authoritativeOrganization: string;
  readonly primaryUrl: string;
  readonly description: string;
  readonly defaultLicense: string;
  readonly reportedEventNature: EventNatureKind;
  readonly supportedFamilies: readonly EventFamilyKind[];
  readonly semanticDistinctions: readonly string[];
  readonly knownLimitations: readonly string[];
}
