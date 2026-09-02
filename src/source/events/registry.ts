import type {
  ExternalEventSourceContract,
  ProviderId,
  ProviderMetadata,
} from "./types.js";

export const AUTHORITATIVE_PROVIDER_REGISTRY: Readonly<
  Record<ProviderId, ProviderMetadata>
> = {
  noaa_ncei_storm_events: {
    providerId: "noaa_ncei_storm_events",
    name: "NOAA NCEI Storm Events Database",
    authoritativeOrganization:
      "National Oceanic and Atmospheric Administration (NOAA) / NCEI",
    primaryUrl: "https://www.ncdc.noaa.gov/stormevents/",
    description:
      "Official publication of storm events and unusual weather phenomena having significant intensity or economic impact.",
    defaultLicense: "US Government Public Domain Work",
    reportedEventNature: "underlying_physical_hazard",
    supportedFamilies: [
      "hurricane_tropical_storm",
      "tornado_severe_weather",
      "flooding",
      "winter_storm",
      "extreme_heat_cold",
      "drought",
    ],
    semanticDistinctions: [
      "Records observed meteorological hazards and damage reports, not administrative disaster requests.",
    ],
    knownLimitations: [
      "Reporting consistency varies historically prior to 1996.",
      "Property damage estimates in historical records lack uniform inflation adjustment.",
    ],
  },
  fema_disaster_declarations: {
    providerId: "fema_disaster_declarations",
    name: "FEMA OpenFEMA Disaster Declarations Summary",
    authoritativeOrganization: "Federal Emergency Management Agency (FEMA)",
    primaryUrl: "https://www.fema.gov/about/openfema/data-sets",
    description:
      "Official federally declared disasters, emergency declarations, and fire management assistance declarations.",
    defaultLicense: "US Government Public Domain Work",
    reportedEventNature: "administrative_declaration_or_response",
    supportedFamilies: [
      "hurricane_tropical_storm",
      "tornado_severe_weather",
      "flooding",
      "winter_storm",
      "wildfire",
      "earthquake",
    ],
    semanticDistinctions: [
      "FEMA declarations reflect administrative and political response requests by state governors, NOT the occurrence or magnitude of physical hazards itself.",
    ],
    knownLimitations: [
      "Events below financial assistance thresholds or managed purely locally are omitted.",
    ],
  },
  doe_417_electric_emergency: {
    providerId: "doe_417_electric_emergency",
    name: "DOE Form OE-417 Electric Emergency Incident and Disturbance Reports",
    authoritativeOrganization: "U.S. Department of Energy (DOE) CESER",
    primaryUrl: "https://www.oe.netl.doe.gov/oe417.aspx",
    description:
      "Mandatory emergency reporting of major electric power system incidents, outages, physical security breaches, and grid disturbances.",
    defaultLicense: "US Government Public Domain Work",
    reportedEventNature: "utility_grid_report",
    supportedFamilies: ["major_power_disturbance"],
    semanticDistinctions: [
      "OE-417 tracks major bulk electric system disruptions, NOT every local distribution feeder outage.",
    ],
    knownLimitations: [
      "Focuses on bulk electric system thresholds (>50,000 customers or >300MW lost).",
    ],
  },
  usgs_earthquake_hazards: {
    providerId: "usgs_earthquake_hazards",
    name: "USGS Comprehensive Earthquake Catalog (ComCat)",
    authoritativeOrganization: "United States Geological Survey (USGS)",
    primaryUrl: "https://earthquake.usgs.gov/data/comcat/",
    description:
      "Authoritative seismic event catalog, earthquake magnitude, epicentral location, and instrumental intensity mappings.",
    defaultLicense: "US Government Public Domain Work",
    reportedEventNature: "underlying_physical_hazard",
    supportedFamilies: ["earthquake"],
    semanticDistinctions: [
      "Tracks physical seismic shaking and epicenter parameters, NOT structural damage or economic loss directly.",
    ],
    knownLimitations: [
      "Seismic station network density varies globally and historically.",
    ],
  },
  nifc_wildfire_data: {
    providerId: "nifc_wildfire_data",
    name: "NIFC Interagency Fire Center Wildfire Data",
    authoritativeOrganization: "National Interagency Fire Center (NIFC)",
    primaryUrl: "https://www.nifc.gov/fire-information/statistics",
    description:
      "Authoritative interagency wildland fire perimeters, acres burned, and suppression response data.",
    defaultLicense: "US Government Public Domain Work",
    reportedEventNature: "underlying_physical_hazard",
    supportedFamilies: ["wildfire"],
    semanticDistinctions: [
      "Tracks wildland fire perimeters and suppression data, NOT prescribed agricultural burns.",
    ],
    knownLimitations: [
      "Historical fire perimeters contain spatial approximations prior to modern satellite mapping.",
    ],
  },
  cdc_public_health_emergency: {
    providerId: "cdc_public_health_emergency",
    name: "CDC Public Health Records & Surveillance Catalog",
    authoritativeOrganization:
      "Centers for Disease Control and Prevention (CDC)",
    primaryUrl: "https://data.cdc.gov/",
    description:
      "Authoritative national public health surveillance data, epidemic tracking, and public health emergency records.",
    defaultLicense: "US Government Public Domain Work",
    reportedEventNature: "public_health_surveillance_record",
    supportedFamilies: ["public_health_emergency"],
    semanticDistinctions: [
      "Tracks surveillance reporting and official health emergency declarations, NOT real-time infection totals without reporting lag.",
    ],
    knownLimitations: [
      "Surveillance reporting lag exists between local diagnosis and national aggregation.",
    ],
  },
};

export const CORE_EVENT_SOURCE_CONTRACTS: readonly ExternalEventSourceContract[] =
  [
    {
      contractId: "contract:noaa:hurricane",
      eventFamily: "hurricane_tropical_storm",
      eventNature: "underlying_physical_hazard",
      authoritativeProvider: {
        providerId: "noaa_ncei_storm_events",
        providerName: "NOAA NCEI Storm Events Database",
        authoritativeOrganization: "NOAA / NCEI",
        citationUrl: "https://www.ncdc.noaa.gov/stormevents/",
        sourceArtifactVintage: null,
        authorityLevel: "federal_primary_source",
        sourceBytesSha256: null,
        retrievedAtIsoDate: null,
      },
      temporalCoverage: {
        startIsoDate: "1950-01-01",
        endIsoDate: null,
        updateCadence: "monthly",
      },
      geographicCoverage: {
        scopeKind: "county_fips",
        supportedStateCodes: null,
      },
      seasonality: {
        peakObservationNote:
          "Atlantic hurricane season is historically observed predominantly June-November, but off-season tropical systems occur.",
        observedActiveMonths: [6, 7, 8, 9, 10, 11],
        isHardProhibition: false,
      },
      severityFields: [
        {
          fieldName: "saffir_simpson_category",
          scaleType: "ordinal",
          reportedUnit: "category",
          providerSchemaDefinedBounds: false,
          minProviderBound: null,
          maxProviderBound: null,
        },
        {
          fieldName: "max_sustained_wind_knots",
          scaleType: "continuous",
          reportedUnit: "knots",
          providerSchemaDefinedBounds: false,
          minProviderBound: null,
          maxProviderBound: null,
        },
      ],
      durationSupport: {
        offersReportedDuration: true,
        typicalUnit: "days",
        hasHardLimits: false,
      },
      recordType: "empirical_incident",
      calibration: {
        status: "unresolved_requires_research",
        rationale:
          "Requires regional track density analysis and coastal segment landfall distributions before sampling rates can be established.",
        missingEvidence: [
          "Regional track density maps",
          "Inland decay parameters",
        ],
      },
      knownLimitations: [
        "Inland tropical systems transition to post-tropical depressions.",
      ],
    },
    {
      contractId: "contract:fema:declarations",
      eventFamily: "flooding",
      eventNature: "administrative_declaration_or_response",
      authoritativeProvider: {
        providerId: "fema_disaster_declarations",
        providerName: "FEMA OpenFEMA Disaster Declarations",
        authoritativeOrganization: "FEMA",
        citationUrl: "https://www.fema.gov/about/openfema/data-sets",
        sourceArtifactVintage: null,
        authorityLevel: "federal_primary_source",
        sourceBytesSha256: null,
        retrievedAtIsoDate: null,
      },
      temporalCoverage: {
        startIsoDate: "1953-01-01",
        endIsoDate: null,
        updateCadence: "daily",
      },
      geographicCoverage: {
        scopeKind: "county_fips",
        supportedStateCodes: null,
      },
      seasonality: {
        peakObservationNote:
          "Administrative declarations occur following major threshold requests by state governors.",
        observedActiveMonths: null,
        isHardProhibition: false,
      },
      severityFields: [],
      durationSupport: {
        offersReportedDuration: false,
        typicalUnit: null,
        hasHardLimits: false,
      },
      recordType: "empirical_incident",
      calibration: {
        status: "unresolved_requires_research",
        rationale:
          "FEMA declarations measure government disaster response eligibility, not raw physical hazard occurrence rates.",
        missingEvidence: [
          "State expenditure threshold models",
          "Governor request criteria",
        ],
      },
      knownLimitations: [
        "Reflects political/administrative requests rather than pure physical magnitude.",
      ],
    },
    {
      contractId: "contract:usgs:earthquake",
      eventFamily: "earthquake",
      eventNature: "underlying_physical_hazard",
      authoritativeProvider: {
        providerId: "usgs_earthquake_hazards",
        providerName: "USGS ComCat",
        authoritativeOrganization: "USGS",
        citationUrl: "https://earthquake.usgs.gov/data/comcat/",
        sourceArtifactVintage: null,
        authorityLevel: "federal_primary_source",
        sourceBytesSha256: null,
        retrievedAtIsoDate: null,
      },
      temporalCoverage: {
        startIsoDate: "1900-01-01",
        endIsoDate: null,
        updateCadence: "realtime",
      },
      geographicCoverage: {
        scopeKind: "point_radius",
        supportedStateCodes: null,
      },
      seasonality: {
        peakObservationNote: "Seismic activity is non-seasonal.",
        observedActiveMonths: null,
        isHardProhibition: false,
      },
      severityFields: [
        {
          fieldName: "moment_magnitude",
          scaleType: "continuous",
          reportedUnit: "Mw",
          providerSchemaDefinedBounds: false,
          minProviderBound: null,
          maxProviderBound: null,
        },
      ],
      durationSupport: {
        offersReportedDuration: false,
        typicalUnit: null,
        hasHardLimits: false,
      },
      recordType: "empirical_incident",
      calibration: {
        status: "unresolved_requires_research",
        rationale:
          "Regional event generation requires localized Gutenberg-Richter (a, b) parameter matrices, fault slip rates, and local soil amplification models.",
        missingEvidence: [
          "Localized Gutenberg-Richter (a,b) grids",
          "Local soil amplification parameters",
        ],
      },
      knownLimitations: [
        "Catalog completeness varies by magnitude and station proximity.",
      ],
    },
  ];
