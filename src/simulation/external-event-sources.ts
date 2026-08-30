import { makeIsoDate } from "./dates";
import type { EntityId, IsoDate } from "./types";

/**
 * Authoritative event families supported by the external crisis routing foundation.
 */
export type CrisisEventFamily =
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
 * Authoritative source provider identity.
 */
export type AuthoritativeProviderId =
  | "noaa_ncei_storm_events"
  | "fema_disaster_declarations"
  | "doe_417_electric_emergency"
  | "usgs_earthquake_hazards"
  | "nifc_wildfire_data"
  | "cdc_public_health_emergency";

/**
 * Record origin type: empirical historical record vs simulation-sampled event.
 */
export type EventRecordOriginKind =
  | "empirical_incident"
  | "simulation_generated_event";

/**
 * Calibration state of annual/local occurrence rates.
 * IMPORTANT: No probabilities are invented. Uncalibrated sources are explicitly labeled unresolved.
 */
export type CalibrationStatus =
  | {
      readonly status: "calibrated";
      readonly derivationFormula: string;
      readonly empiricalBasis: string;
      readonly samplePeriodYears: number;
    }
  | {
      readonly status: "unresolved_requires_research";
      readonly rationale: string;
    };

/**
 * Temporal coverage timeframe of an authoritative source.
 */
export interface SourceTemporalCoverage {
  readonly startIsoDate: IsoDate;
  readonly endIsoDate: IsoDate | null; // null indicates ongoing/current feed
  readonly updateCadence: "realtime" | "daily" | "monthly" | "annual" | "historical_archive";
}

/**
 * Geographic coverage scope supported by the provider.
 */
export interface SourceGeographicCoverage {
  readonly scopeKind: "national" | "state_level" | "county_fips" | "point_radius" | "jurisdiction_boundary";
  readonly supportedStateCodes: readonly string[]; // ISO 3166-2 US state codes, e.g. ["MI", "FL", "CA"] or ["*"] for national
}

/**
 * Monthly applicability constraints (1 = Jan, 12 = Dec).
 */
export interface SeasonalApplicability {
  readonly applicableMonths: readonly number[]; // e.g. [6, 7, 8, 9, 10, 11] for Atlantic Hurricane season
  readonly peakMonths: readonly number[];
  readonly note: string;
}

/**
 * Severity / intensity field specification supported by the source contract.
 */
export interface SeverityFieldSpec {
  readonly metricName: string; // e.g., "saffir_simpson_category", "ef_scale", "richter_magnitude", "mw_impact", "cdc_threat_level"
  readonly scaleType: "ordinal" | "continuous" | "categorical";
  readonly unit: string | null; // e.g. "category", "EF-scale", "magnitude", "MW", "level"
  readonly minSupportedValue: number | string | null;
  readonly maxSupportedValue: number | string | null;
}

/**
 * Duration bounds supported by an event source.
 */
export interface SourceDurationSupport {
  readonly offersDuration: boolean;
  readonly typicalUnit: "minutes" | "hours" | "days" | "months" | null;
  readonly minDuration: number | null;
  readonly maxDuration: number | null;
}

/**
 * Spatial extent representation for an event instance.
 */
export interface AffectedGeography {
  readonly representationKind: "jurisdiction_id" | "fips_code_list" | "state_code" | "coordinate_radius" | "polygon";
  readonly jurisdictionIds: readonly EntityId[];
  readonly fipsCodes: readonly string[];
  readonly stateCodes: readonly string[];
  readonly centerLatitude?: number;
  readonly centerLongitude?: number;
  readonly radiusKm?: number;
}

/**
 * Source provenance tracking metadata.
 */
export interface SourceProvenance {
  readonly providerId: AuthoritativeProviderId;
  readonly providerName: string;
  readonly authoritativeOrganization: string;
  readonly citationUrl: string;
  readonly datasetVersion: string;
  readonly license: string;
  readonly authorityLevel: "federal_primary_source" | "interagency_standard" | "state_official";
  readonly snapshotChecksum?: string;
  readonly retrievedAtIsoDate?: IsoDate;
}

/**
 * Rules determining whether a given jurisdiction / geographic entity is eligible for an event family.
 */
export interface GeographicEligibilityRule {
  readonly ruleId: string;
  readonly description: string;
  readonly requiredStateCodes?: readonly string[];
  readonly requiredCoastalAccess?: boolean;
  readonly requiredSeismicZoneMin?: number;
  readonly requiredWildfireRiskTierMin?: number;
  readonly customEvaluatorKey?: string;
}

/**
 * Full contract defining an authoritative external event source adaptation layer.
 */
export interface ExternalEventSourceContract {
  readonly contractId: string;
  readonly eventFamily: CrisisEventFamily;
  readonly authoritativeProvider: SourceProvenance;
  readonly temporalCoverage: SourceTemporalCoverage;
  readonly geographicCoverage: SourceGeographicCoverage;
  readonly geographicEligibilityRules: readonly GeographicEligibilityRule[];
  readonly seasonalApplicability: SeasonalApplicability;
  readonly severityFields: readonly SeverityFieldSpec[];
  readonly durationSupport: SourceDurationSupport;
  readonly recordType: EventRecordOriginKind;
  readonly calibration: CalibrationStatus;
  readonly knownLimitations: readonly string[];
}

/**
 * Detailed specification of an authoritative provider registered in the system.
 */
export interface AuthoritativeProviderDefinition {
  readonly providerId: AuthoritativeProviderId;
  readonly name: string;
  readonly authoritativeOrganization: string;
  readonly primaryUrl: string;
  readonly description: string;
  readonly defaultLicense: string;
  readonly supportedFamilies: readonly CrisisEventFamily[];
  readonly knownLimitations: readonly string[];
}

// Registry of Authoritative Source Providers
export const AUTHORITATIVE_PROVIDER_REGISTRY: Readonly<Record<AuthoritativeProviderId, AuthoritativeProviderDefinition>> = {
  noaa_ncei_storm_events: {
    providerId: "noaa_ncei_storm_events",
    name: "NOAA NCEI Storm Events Database",
    authoritativeOrganization: "National Oceanic and Atmospheric Administration (NOAA) / NCEI",
    primaryUrl: "https://www.ncdc.noaa.gov/stormevents/",
    description: "Official publication of storm events and unusual weather phenomena having significant intensity or economic impact.",
    defaultLicense: "US Government Public Domain Work",
    supportedFamilies: [
      "hurricane_tropical_storm",
      "tornado_severe_weather",
      "flooding",
      "winter_storm",
      "extreme_heat_cold",
      "drought",
    ],
    knownLimitations: [
      "Reporting consistency varies historically prior to 1996 (when 48 event types were standardized).",
      "Property damage estimates in historical records may lack uniform inflation adjustment.",
      "County-level spatial granularity can blur sub-county localized severe weather paths.",
    ],
  },
  fema_disaster_declarations: {
    providerId: "fema_disaster_declarations",
    name: "FEMA OpenFEMA Disaster Declarations Summary",
    authoritativeOrganization: "Federal Emergency Management Agency (FEMA)",
    primaryUrl: "https://www.fema.gov/about/openfema/data-sets",
    description: "Official federally declared disasters, emergency declarations, and fire management assistance declarations since 1953.",
    defaultLicense: "US Government Public Domain Work",
    supportedFamilies: [
      "hurricane_tropical_storm",
      "tornado_severe_weather",
      "flooding",
      "winter_storm",
      "wildfire",
      "earthquake",
    ],
    knownLimitations: [
      "Declarations reflect political/administrative threshold requests by governors, not purely physical hazard magnitude.",
      "Smaller severe weather events that do not exceed state financial capacity are omitted.",
    ],
  },
  doe_417_electric_emergency: {
    providerId: "doe_417_electric_emergency",
    name: "DOE Form OE-417 Electric Emergency Incident and Disturbance Reports",
    authoritativeOrganization: "U.S. Department of Energy (DOE) Office of Cybersecurity, Energy Security, and Emergency Response (CESER)",
    primaryUrl: "https://www.oe.netl.doe.gov/oe417.aspx",
    description: "Mandatory emergency reporting of major electric power system incidents, outages, physical security breaches, and grid disturbances.",
    defaultLicense: "US Government Public Domain Work",
    supportedFamilies: ["major_power_disturbance"],
    knownLimitations: [
      "Reporting thresholds focus on major bulk electric system disruptions (e.g. >50,000 customers or >300MW lost).",
      "Local distribution outages below DOE reporting thresholds are not included.",
    ],
  },
  usgs_earthquake_hazards: {
    providerId: "usgs_earthquake_hazards",
    name: "USGS Comprehensive Earthquake Catalog (ComCat) & National Seismic Hazard Model",
    authoritativeOrganization: "United States Geological Survey (USGS)",
    primaryUrl: "https://earthquake.usgs.gov/data/comcat/",
    description: "Authoritative seismic event catalog, earthquake magnitude, epicentral location, and instrumental intensity mappings.",
    defaultLicense: "US Government Public Domain Work",
    supportedFamilies: ["earthquake"],
    knownLimitations: [
      "Low magnitude seismic events (M < 2.5) are densely captured near seismic networks but less complete in sparse areas.",
      "Ground motion shaking intensity (MMI) varies with local soil site conditions.",
    ],
  },
  nifc_wildfire_data: {
    providerId: "nifc_wildfire_data",
    name: "NIFC Interagency Fire Center Wildfire Data / InciWeb Records",
    authoritativeOrganization: "National Interagency Fire Center (NIFC) / WFIGS",
    primaryUrl: "https://www.nifc.gov/fire-information/statistics",
    description: "Authoritative interagency wildland fire perimeters, acres burned, and suppression response data.",
    defaultLicense: "US Government Public Domain Work",
    supportedFamilies: ["wildfire"],
    knownLimitations: [
      "Historical fire perimeters prior to satellite remote sensing contain spatial boundary approximations.",
      "Small prescribed burns or agricultural burns may be excluded or inconsistently tracked.",
    ],
  },
  cdc_public_health_emergency: {
    providerId: "cdc_public_health_emergency",
    name: "CDC Public Health Emergency Records & NNDSS Catalog",
    authoritativeOrganization: "Centers for Disease Control and Prevention (CDC)",
    primaryUrl: "https://data.cdc.gov/",
    description: "Authoritative national public health surveillance data, epidemic tracking, and public health emergency declarations.",
    defaultLicense: "US Government Public Domain Work",
    supportedFamilies: ["public_health_emergency"],
    knownLimitations: [
      "Surveillance reporting lag between local diagnosis and national aggregation.",
      "Case definitions and testing availability evolve during novel outbreaks.",
    ],
  },
};

/**
 * Standard contract definitions for core event families.
 */
export const CORE_EVENT_SOURCE_CONTRACTS: readonly ExternalEventSourceContract[] = [
  {
    contractId: "contract:noaa:hurricane",
    eventFamily: "hurricane_tropical_storm",
    authoritativeProvider: {
      providerId: "noaa_ncei_storm_events",
      providerName: "NOAA NCEI Storm Events Database",
      authoritativeOrganization: "NOAA / NCEI",
      citationUrl: "https://www.ncdc.noaa.gov/stormevents/",
      datasetVersion: "2024.1",
      license: "US Government Public Domain Work",
      authorityLevel: "federal_primary_source",
    },
    temporalCoverage: {
      startIsoDate: makeIsoDate("1950-01-01"),
      endIsoDate: null,
      updateCadence: "monthly",
    },
    geographicCoverage: {
      scopeKind: "state_level",
      supportedStateCodes: [
        "AL", "CT", "DE", "FL", "GA", "HI", "LA", "MA", "MD", "ME",
        "MS", "NC", "NH", "NJ", "NY", "RI", "SC", "TX", "VA",
      ],
    },
    geographicEligibilityRules: [
      {
        ruleId: "coastal_access_required",
        description: "Hurricanes and tropical storms require coastal or direct inland tropical system path exposure.",
        requiredCoastalAccess: true,
      },
    ],
    seasonalApplicability: {
      applicableMonths: [6, 7, 8, 9, 10, 11],
      peakMonths: [8, 9, 10],
      note: "Official Atlantic Hurricane Season spans June 1 through November 30.",
    },
    severityFields: [
      {
        metricName: "saffir_simpson_category",
        scaleType: "ordinal",
        unit: "category",
        minSupportedValue: 1,
        maxSupportedValue: 5,
      },
      {
        metricName: "max_sustained_wind_knots",
        scaleType: "continuous",
        unit: "knots",
        minSupportedValue: 34,
        maxSupportedValue: 185,
      },
    ],
    durationSupport: {
      offersDuration: true,
      typicalUnit: "days",
      minDuration: 1,
      maxDuration: 14,
    },
    recordType: "empirical_incident",
    calibration: {
      status: "unresolved_requires_research",
      rationale: "Requires regional historical track frequency analysis per coastal segment before assigning annual sampling rates.",
    },
    knownLimitations: [
      "Inland decay causes transition to tropical depression/post-tropical storm.",
      "Storm surge height varies locally by coastal bathymetry.",
    ],
  },
  {
    contractId: "contract:noaa:tornado",
    eventFamily: "tornado_severe_weather",
    authoritativeProvider: {
      providerId: "noaa_ncei_storm_events",
      providerName: "NOAA NCEI Storm Events Database",
      authoritativeOrganization: "NOAA / NCEI",
      citationUrl: "https://www.ncdc.noaa.gov/stormevents/",
      datasetVersion: "2024.1",
      license: "US Government Public Domain Work",
      authorityLevel: "federal_primary_source",
    },
    temporalCoverage: {
      startIsoDate: makeIsoDate("1950-01-01"),
      endIsoDate: null,
      updateCadence: "monthly",
    },
    geographicCoverage: {
      scopeKind: "national",
      supportedStateCodes: ["*"],
    },
    geographicEligibilityRules: [],
    seasonalApplicability: {
      applicableMonths: [3, 4, 5, 6, 7, 8],
      peakMonths: [4, 5, 6],
      note: "Peak tornado season in the US is spring to early summer.",
    },
    severityFields: [
      {
        metricName: "ef_scale",
        scaleType: "ordinal",
        unit: "EF-scale",
        minSupportedValue: 0,
        maxSupportedValue: 5,
      },
    ],
    durationSupport: {
      offersDuration: true,
      typicalUnit: "minutes",
      minDuration: 1,
      maxDuration: 180,
    },
    recordType: "empirical_incident",
    calibration: {
      status: "unresolved_requires_research",
      rationale: "Tornado touchdown probability requires county-level grid frequency density maps (Tornado Alley vs East/West).",
    },
    knownLimitations: [
      "EF scale rating depends on damage to structures, so tornadoes in unpopulated areas may be underrated.",
    ],
  },
  {
    contractId: "contract:doe:power_disturbance",
    eventFamily: "major_power_disturbance",
    authoritativeProvider: {
      providerId: "doe_417_electric_emergency",
      providerName: "DOE OE-417 Reports",
      authoritativeOrganization: "US DOE CESER",
      citationUrl: "https://www.oe.netl.doe.gov/oe417.aspx",
      datasetVersion: "2024.1",
      license: "US Government Public Domain Work",
      authorityLevel: "federal_primary_source",
    },
    temporalCoverage: {
      startIsoDate: makeIsoDate("2002-01-01"),
      endIsoDate: null,
      updateCadence: "annual",
    },
    geographicCoverage: {
      scopeKind: "national",
      supportedStateCodes: ["*"],
    },
    geographicEligibilityRules: [],
    seasonalApplicability: {
      applicableMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      peakMonths: [7, 8, 1, 2],
      note: "Summer heat waves and winter freezes represent peak grid demand stress periods.",
    },
    severityFields: [
      {
        metricName: "megawatts_lost",
        scaleType: "continuous",
        unit: "MW",
        minSupportedValue: 300,
        maxSupportedValue: 50000,
      },
      {
        metricName: "customers_affected",
        scaleType: "continuous",
        unit: "customers",
        minSupportedValue: 50000,
        maxSupportedValue: 10000000,
      },
    ],
    durationSupport: {
      offersDuration: true,
      typicalUnit: "hours",
      minDuration: 1,
      maxDuration: 168,
    },
    recordType: "empirical_incident",
    calibration: {
      status: "unresolved_requires_research",
      rationale: "Requires regional NERC reliability entity failure distribution modeling.",
    },
    knownLimitations: [
      "Focuses on bulk power system incidents rather than local distribution feeder faults.",
    ],
  },
  {
    contractId: "contract:usgs:earthquake",
    eventFamily: "earthquake",
    authoritativeProvider: {
      providerId: "usgs_earthquake_hazards",
      providerName: "USGS ComCat",
      authoritativeOrganization: "USGS",
      citationUrl: "https://earthquake.usgs.gov/data/comcat/",
      datasetVersion: "2024.1",
      license: "US Government Public Domain Work",
      authorityLevel: "federal_primary_source",
    },
    temporalCoverage: {
      startIsoDate: makeIsoDate("1900-01-01"),
      endIsoDate: null,
      updateCadence: "realtime",
    },
    geographicCoverage: {
      scopeKind: "national",
      supportedStateCodes: ["*"],
    },
    geographicEligibilityRules: [
      {
        ruleId: "seismic_hazard_zone",
        description: "Earthquakes of magnitude M >= 5.0 are predominantly constrained to seismic hazard zones.",
        requiredStateCodes: [
          "AK", "CA", "HI", "ID", "MT", "NV", "OR", "UT", "WA", "WY", "MO", "AR", "TN", "KY",
        ],
      },
    ],
    seasonalApplicability: {
      applicableMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      peakMonths: [],
      note: "Earthquake occurrence is non-seasonal.",
    },
    severityFields: [
      {
        metricName: "moment_magnitude",
        scaleType: "continuous",
        unit: "Mw",
        minSupportedValue: 2.5,
        maxSupportedValue: 9.5,
      },
      {
        metricName: "modified_mercalli_intensity",
        scaleType: "ordinal",
        unit: "MMI",
        minSupportedValue: "I",
        maxSupportedValue: "XII",
      },
    ],
    durationSupport: {
      offersDuration: true,
      typicalUnit: "minutes",
      minDuration: 1,
      maxDuration: 5,
    },
    recordType: "empirical_incident",
    calibration: {
      status: "calibrated",
      derivationFormula: "Gutenberg-Richter Law: Log10(N) = a - b*M",
      empiricalBasis: "USGS National Seismic Hazard Model (NSHM) fault slip rates and historical seismicity catalog.",
      samplePeriodYears: 124,
    },
    knownLimitations: [
      "Shaking damage varies significantly based on local soil site response and building codes.",
    ],
  },
  {
    contractId: "contract:nifc:wildfire",
    eventFamily: "wildfire",
    authoritativeProvider: {
      providerId: "nifc_wildfire_data",
      providerName: "NIFC Wildfire Data",
      authoritativeOrganization: "NIFC",
      citationUrl: "https://www.nifc.gov/fire-information/statistics",
      datasetVersion: "2024.1",
      license: "US Government Public Domain Work",
      authorityLevel: "interagency_standard",
    },
    temporalCoverage: {
      startIsoDate: makeIsoDate("1980-01-01"),
      endIsoDate: null,
      updateCadence: "daily",
    },
    geographicCoverage: {
      scopeKind: "national",
      supportedStateCodes: ["*"],
    },
    geographicEligibilityRules: [],
    seasonalApplicability: {
      applicableMonths: [5, 6, 7, 8, 9, 10, 11],
      peakMonths: [7, 8, 9],
      note: "Wildfire season aligns with dry summer and early autumn weather.",
    },
    severityFields: [
      {
        metricName: "acres_burned",
        scaleType: "continuous",
        unit: "acres",
        minSupportedValue: 10,
        maxSupportedValue: 1000000,
      },
    ],
    durationSupport: {
      offersDuration: true,
      typicalUnit: "days",
      minDuration: 1,
      maxDuration: 120,
    },
    recordType: "empirical_incident",
    calibration: {
      status: "unresolved_requires_research",
      rationale: "Requires fuel load, drought index (KBDI), and ignitions frequency integration.",
    },
    knownLimitations: [
      "Prescribed fires and agricultural burns are excluded from major incident records.",
    ],
  },
  {
    contractId: "contract:cdc:public_health",
    eventFamily: "public_health_emergency",
    authoritativeProvider: {
      providerId: "cdc_public_health_emergency",
      providerName: "CDC Public Health Records",
      authoritativeOrganization: "CDC",
      citationUrl: "https://data.cdc.gov/",
      datasetVersion: "2024.1",
      license: "US Government Public Domain Work",
      authorityLevel: "federal_primary_source",
    },
    temporalCoverage: {
      startIsoDate: makeIsoDate("1960-01-01"),
      endIsoDate: null,
      updateCadence: "daily",
    },
    geographicCoverage: {
      scopeKind: "national",
      supportedStateCodes: ["*"],
    },
    geographicEligibilityRules: [],
    seasonalApplicability: {
      applicableMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      peakMonths: [12, 1, 2],
      note: "Respiratory illness outbreaks peak during winter months; novel pathogens show no seasonality.",
    },
    severityFields: [
      {
        metricName: "cdc_threat_level",
        scaleType: "categorical",
        unit: "level",
        minSupportedValue: "watch",
        maxSupportedValue: "emergency",
      },
    ],
    durationSupport: {
      offersDuration: true,
      typicalUnit: "months",
      minDuration: 1,
      maxDuration: 36,
    },
    recordType: "empirical_incident",
    calibration: {
      status: "unresolved_requires_research",
      rationale: "Requires epidemiological compartmental modeling (SIR/SEIR parameters).",
    },
    knownLimitations: [
      "Surveillance data lags local clinical onset during initial outbreak stages.",
    ],
  },
];

/**
 * Validates an ExternalEventSourceContract instance for integrity and compliance with zero-invented-probability rules.
 */
export function validateExternalEventSourceContract(
  contract: ExternalEventSourceContract,
): void {
  if (!contract.contractId || contract.contractId.trim().length === 0) {
    throw new Error("External event source contract must have a non-empty contractId.");
  }
  if (!contract.authoritativeProvider || !contract.authoritativeProvider.providerId) {
    throw new Error("External event source contract must specify an authoritative provider.");
  }
  const provider = AUTHORITATIVE_PROVIDER_REGISTRY[contract.authoritativeProvider.providerId];
  if (!provider) {
    throw new Error(`Unknown authoritative provider ID: ${contract.authoritativeProvider.providerId}`);
  }
  if (!provider.supportedFamilies.includes(contract.eventFamily)) {
    throw new Error(
      `Provider ${contract.authoritativeProvider.providerId} does not support event family ${contract.eventFamily}.`,
    );
  }
  makeIsoDate(contract.temporalCoverage.startIsoDate);
  if (contract.temporalCoverage.endIsoDate) {
    makeIsoDate(contract.temporalCoverage.endIsoDate);
    if (contract.temporalCoverage.endIsoDate < contract.temporalCoverage.startIsoDate) {
      throw new Error("Temporal coverage startIsoDate cannot be later than endIsoDate.");
    }
  }

  // Validate calibration status: No invented probabilities allowed!
  if (contract.calibration.status === "calibrated") {
    if (
      !contract.calibration.derivationFormula ||
      contract.calibration.derivationFormula.trim().length === 0
    ) {
      throw new Error("Calibrated event source contract must specify an explicit derivationFormula.");
    }
    if (contract.calibration.samplePeriodYears <= 0) {
      throw new Error("Calibrated samplePeriodYears must be greater than zero.");
    }
  } else if (contract.calibration.status === "unresolved_requires_research") {
    if (!contract.calibration.rationale || contract.calibration.rationale.trim().length === 0) {
      throw new Error("Unresolved calibration status must provide an explicit research rationale.");
    }
  } else {
    throw new Error("Invalid calibration status.");
  }

  // Seasonal applicability validation (months 1..12)
  for (const m of contract.seasonalApplicability.applicableMonths) {
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      throw new Error(`Applicable month must be an integer between 1 and 12, got ${m}.`);
    }
  }

  if (contract.knownLimitations.length === 0) {
    throw new Error("Contract must include explicit known limitations.");
  }
}

/**
 * Coastal US state codes for hurricane/tropical storm geographic eligibility checking.
 */
export const COASTAL_US_STATE_CODES = new Set<string>([
  "AL", "CT", "DE", "FL", "GA", "HI", "LA", "MA", "MD", "ME",
  "MS", "NC", "NH", "NJ", "NY", "RI", "SC", "TX", "VA",
]);

/**
 * Higher seismic hazard US state codes for earthquake geographic eligibility checking.
 */
export const SEISMIC_HAZARD_STATE_CODES = new Set<string>([
  "AK", "CA", "HI", "ID", "MT", "NV", "OR", "UT", "WA", "WY", "MO", "AR", "TN", "KY",
]);

/**
 * Evaluates whether a jurisdiction is geographically and seasonally eligible for an event family.
 */
export function isJurisdictionEligibleForEventFamily(
  stateCode: string,
  eventFamily: CrisisEventFamily,
  isoDate: IsoDate,
  contract: ExternalEventSourceContract,
): boolean {
  validateExternalEventSourceContract(contract);
  if (contract.eventFamily !== eventFamily) {
    return false;
  }

  // Check state code support
  const supportedStates = contract.geographicCoverage.supportedStateCodes;
  if (!supportedStates.includes("*") && !supportedStates.includes(stateCode.toUpperCase())) {
    return false;
  }

  // Check seasonal applicability (1 = Jan, 12 = Dec)
  const month = parseInt(isoDate.substring(5, 7), 10);
  if (
    contract.seasonalApplicability.applicableMonths.length > 0 &&
    !contract.seasonalApplicability.applicableMonths.includes(month)
  ) {
    return false;
  }

  // Evaluate specific geographic eligibility rules
  for (const rule of contract.geographicEligibilityRules) {
    if (rule.requiredStateCodes && !rule.requiredStateCodes.includes(stateCode.toUpperCase())) {
      return false;
    }
    if (rule.requiredCoastalAccess && !COASTAL_US_STATE_CODES.has(stateCode.toUpperCase())) {
      return false;
    }
  }

  return true;
}

/**
 * Filters standard core contracts eligible for a given state code and date.
 */
export function filterEligibleEventFamilies(
  stateCode: string,
  isoDate: IsoDate,
): readonly ExternalEventSourceContract[] {
  return CORE_EVENT_SOURCE_CONTRACTS.filter((contract) =>
    isJurisdictionEligibleForEventFamily(stateCode, contract.eventFamily, isoDate, contract),
  );
}
