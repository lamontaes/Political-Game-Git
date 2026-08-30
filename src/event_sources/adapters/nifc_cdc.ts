import type { EventSourceDefinition } from "../types";

export const NIFC_WILDFIRE_SOURCE: EventSourceDefinition = {
  id: "src-nifc-wildfire-v1",
  family: "wildfire",
  provider: "nifc_wildfire_data",
  name: "National Interagency Fire Center (NIFC) Historic Wildfire Open Data",
  description:
    "Authoritative multi-agency records of historical wildfire perimeters, point origins, and fire incident final reports across federal, state, and local lands.",
  temporalCoverage: {
    startYear: 1980,
    endYear: null,
    collectionEra: "1980-present_interagency_fire",
    collectionMethod: "wildfire_incident_management_reports_ics209",
    dateGranularity: "date",
  },
  geographicCoverage: {
    primaryGranularity: "lat_lon_box",
    supportedGranularities: ["lat_lon_box", "county_fips", "state", "national"],
    geographicNotes:
      "National coverage; heavily concentrated in Western US, Alaska, Southeast, and Southern Plains.",
  },
  seasonalApplicability: {
    appliesYearRound: false,
    activeMonths: [5, 6, 7, 8, 9, 10, 11], // May to November
    peakMonths: [7, 8, 9], // July to September peak
    rationale:
      "Western wildfire season spans May through November, coinciding with summer drought and high temperatures.",
  },
  severityScale: {
    scaleName: "Burned Area Acres & Incident Complex Complexity",
    unit: "acres_burned",
    minValue: 100,
    categories: [
      "Class D (100-299 acres)",
      "Class E (300-999 acres)",
      "Class F (1000-4999 acres)",
      "Class G (5000+ acres)",
    ],
    description:
      "Total fire perimeter acres burned and Incident Command System (ICS) complexity type.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "days",
    typicalMin: 2,
    typicalMax: 30,
    maxObserved: 120,
    durationNotes:
      "Major wildfire complexes can burn for weeks to months until seasonal rains/snow contain perimeter.",
  },
  provenance: {
    providerId: "nifc_wildfire_data",
    sourceTitle:
      "NIFC Interagency Fire Perimeters & ICS-209 Historical Reports",
    sourceUrl: "https://data-nifc.opendata.arcgis.com/",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain",
    transformationNotes:
      "Cross-checked fire perimeters with MTBS (Monitoring Trends in Burn Severity) data.",
  },
  limitations: {
    historicalDataGaps: [
      "Detailed digital GIS fire perimeter boundaries are limited prior to 2000.",
    ],
    reportingBiases: [
      "Fires under 100 acres in non-federal lands are not consistently tracked in national interagency totals.",
    ],
    geographicBoundariesCaveats: [
      "Fires frequently spread across federal, state, and private land boundaries.",
    ],
    calibrationCaveats: [
      "Wildfire season length and area burned are sensitive to winter snowpack and seasonal drought.",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 0.35, // Large wildfire occurrences per 100k acres of forest/shrubland per year in West
    formula: "count(fires_gt_1000_acres) / 30_years / forest_area_units",
    totalObservations: 18400,
    samplePeriodYears: 30,
    geographicDenominator: "Western US Wildland-Urban Interface & Forests",
  },
};

export const CDC_PUBLIC_HEALTH_SOURCE: EventSourceDefinition = {
  id: "src-cdc-public-health-v1",
  family: "public_health_emergency",
  provider: "cdc_public_health_emergencies",
  name: "CDC / HHS Public Health Emergency Declarations & Epidemic Surveillance",
  description:
    "Authoritative federal records of public health emergencies declared under Section 319 of the Public Health Service Act and NNOTS infectious disease surveillance.",
  temporalCoverage: {
    startYear: 1983,
    endYear: null,
    collectionEra: "1983-present_phs_act_sec319",
    collectionMethod: "hhs_sec319_declarations_and_nnms",
    dateGranularity: "month",
  },
  geographicCoverage: {
    primaryGranularity: "state",
    supportedGranularities: ["state", "national", "fema_region"],
    geographicNotes:
      "National and state-level coverage; public health declarations apply to whole states or the entire nation.",
  },
  seasonalApplicability: {
    appliesYearRound: true,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [11, 12, 1, 2, 3], // Winter respiratory virus season peak
    rationale:
      "Respiratory epidemics (influenza, RSV) peak during winter; vector-borne diseases peak in summer; novel pathogen outbreaks occur unpredictably.",
  },
  severityScale: {
    scaleName: "HHS Emergency Status & CDC Outbreak Response Level",
    unit: "response_level",
    categories: [
      "Sec 319 Public Health Emergency",
      "PHEIC (WHO International Concern)",
      "CDC Level 1 Alert",
      "CDC Level 2 Alert",
      "CDC Level 3 Alert (Highest)",
    ],
    description:
      "Official Secretary of Health and Human Services emergency declaration and CDC Incident Management System activation levels.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "months",
    typicalMin: 3,
    typicalMax: 12,
    maxObserved: 36,
    durationNotes:
      "Section 319 declarations are issued for 90 days and subject to consecutive renewals.",
  },
  provenance: {
    providerId: "cdc_public_health_emergencies",
    sourceTitle: "HHS Public Health Emergency Declarations",
    sourceUrl: "https://aspr.hhs.gov/legal/PHE/Pages/default.aspx",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain",
    transformationNotes:
      "Cataloged all Section 319 emergency declarations since 1983.",
  },
  limitations: {
    historicalDataGaps: [
      "Pre-1983 epidemic tracking relies on localized CDC Morbidity and Mortality Weekly Reports (MMWR).",
    ],
    reportingBiases: [
      "Testing availability and state public health reporting capacity vary significantly.",
    ],
    geographicBoundariesCaveats: [
      "Pathogen spread does not respect administrative state or county borders.",
    ],
    calibrationCaveats: [
      "Novel pandemic occurrence rates cannot be derived from short-term sample periods; left unresolved.",
    ],
  },
  calibration: {
    status: "unresolved",
    unresolvedReason:
      "Novel pandemic pathogen emergence has extremely low historical frequency and non-stationary transmission dynamics; assigning a fixed annual percentage would be unscientific.",
  },
};
