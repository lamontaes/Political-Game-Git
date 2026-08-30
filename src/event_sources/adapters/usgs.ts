import type { EventSourceDefinition } from "../types";

export const USGS_EARTHQUAKE_SOURCE: EventSourceDefinition = {
  id: "src-usgs-earthquake-v1",
  family: "earthquake",
  provider: "usgs_earthquake_hazards",
  name: "USGS Advanced National Seismic System (ANSS) Earthquake Catalog",
  description:
    "Authoritative historical earthquake catalog and seismic hazard information maintained by the US Geological Survey.",
  temporalCoverage: {
    startYear: 1900,
    endYear: null,
    collectionEra: "1900-present_seismographic_network",
    collectionMethod: "seismographic_station_network",
    dateGranularity: "datetime_utc",
  },
  geographicCoverage: {
    primaryGranularity: "point_radius",
    supportedGranularities: [
      "point_radius",
      "lat_lon_box",
      "county_fips",
      "state",
      "national",
    ],
    geographicNotes:
      "National coverage with high concentration in Pacific Rim, West Coast, Alaska, Hawaii, and New Madrid Seismic Zone.",
  },
  seasonalApplicability: {
    appliesYearRound: true,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    rationale:
      "Tectonic activity and earthquake occurrences have no seasonal variation.",
  },
  severityScale: {
    scaleName: "Moment Magnitude (Mw) & Modified Mercalli Intensity (MMI)",
    unit: "magnitude_mw",
    minValue: 3.0,
    maxValue: 9.5,
    categories: [
      "Minor (3.0-3.9)",
      "Light (4.0-4.9)",
      "Moderate (5.0-5.9)",
      "Strong (6.0-6.9)",
      "Major (7.0-7.9)",
      "Great (8.0+)",
    ],
    description:
      "Logarithmic Moment Magnitude scale (energy release) and MMI I-XII shaking intensity scale.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "days",
    typicalMin: 0.01, // seconds/minutes for mainshock
    typicalMax: 7, // mainshock + aftershock sequence window
    maxObserved: 90,
    durationNotes:
      "Mainshock ground shaking lasts seconds to minutes; active aftershock sequences persist for weeks to months.",
  },
  provenance: {
    providerId: "usgs_earthquake_hazards",
    sourceTitle: "USGS ANSS Comprehensive Earthquake Catalog (ComCat)",
    sourceUrl: "https://earthquake.usgs.gov/earthquakes/search/",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain",
    transformationNotes:
      "Filtered for earthquakes M >= 4.0 within US territory and territorial waters.",
  },
  limitations: {
    historicalDataGaps: [
      "Pre-1930 seismic catalog relies on historical macroseismic intensity reports.",
    ],
    reportingBiases: [
      "Seismometer array density is higher in California than in Central/Eastern US.",
    ],
    geographicBoundariesCaveats: [
      "Epicenter point location does not reflect fault rupture length or broad shaking area.",
    ],
    calibrationCaveats: [
      "Induced seismicity (e.g., wastewater injection) distorts baseline tectonic background rates.",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 0.85, // M >= 5.0 earthquakes per year in West Coast / Pacific region
    formula: "count(mw_gt_5) / 50_years / seismic_regions",
    totalObservations: 14200,
    samplePeriodYears: 50,
    geographicDenominator: "California & Pacific Northwest Seismic Belts",
  },
};
