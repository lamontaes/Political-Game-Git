import type { EventSourceDefinition } from "../types";

export const FEMA_DISASTER_DECLARATIONS_SOURCE: EventSourceDefinition = {
  id: "src-fema-disaster-declarations-v1",
  family: "flooding", // Also covers hurricanes, severe storms, winter storms, etc.
  provider: "fema_disaster_declarations",
  name: "FEMA Disaster Declarations Summary & Emergency Declarations",
  description:
    "Official Federal Emergency Management Agency records of presidential disaster declarations, emergency declarations, and fire management assistance declarations under the Stafford Act (1953-present).",
  temporalCoverage: {
    startYear: 1953,
    endYear: null,
    collectionEra: "1953-present_stafford_act",
    collectionMethod: "presidential_and_fema_administrative_records",
    dateGranularity: "date",
  },
  geographicCoverage: {
    primaryGranularity: "county_fips",
    supportedGranularities: ["county_fips", "state", "fema_region", "national"],
    geographicNotes:
      "National coverage across all 50 US States, DC, and 6 US territories (PR, VI, GU, AS, MP, FM).",
  },
  seasonalApplicability: {
    appliesYearRound: true,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    rationale:
      "Disaster declarations are issued year-round depending on severe weather and incident onset.",
  },
  severityScale: {
    scaleName:
      "Stafford Act Declaration Type & Public/Individual Assistance Programs",
    unit: "declaration_type",
    categories: [
      "Emergency Declaration (EM)",
      "Major Disaster Declaration (DR)",
      "Fire Management Assistance Declaration (FM)",
    ],
    description:
      "Categorized by type of federal declaration and assistance programs authorized (Public Assistance, Individual Assistance, Hazard Mitigation).",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "days",
    typicalMin: 1,
    typicalMax: 30,
    maxObserved: 365,
    durationNotes:
      "Incident duration defines the span of active disaster operations; assistance grants span multiple years.",
  },
  provenance: {
    providerId: "fema_disaster_declarations",
    sourceTitle: "FEMA OpenFEMA Disaster Declarations Summaries",
    sourceUrl:
      "https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2",
    datasetVersion: "v2-2026",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain / OpenFEMA Terms",
    transformationNotes:
      "Cross-walked designated county FIPS codes to standardized state and county identifiers.",
  },
  limitations: {
    historicalDataGaps: [
      "Declarations prior to 1964 lack detailed county-level designation breakdowns.",
    ],
    reportingBiases: [
      "Declaration decisions involve political and administrative discretion by state governors and the President.",
      "Small localized disasters that do not exceed state financial capability thresholds receive no federal declaration.",
    ],
    geographicBoundariesCaveats: [
      "FIPS codes reflect county boundaries at the time of declaration.",
    ],
    calibrationCaveats: [
      "FEMA declarations measure political/economic threshold breach rather than pure physical hazard intensity.",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 0.12,
    formula: "count(major_disasters) / 70_years / total_counties",
    totalObservations: 4700,
    samplePeriodYears: 70,
    geographicDenominator: "US Counties",
  },
};
