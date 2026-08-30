import type { EventSourceDefinition } from "../types";

export const NOAA_TROPICAL_HURRICANE_SOURCE: EventSourceDefinition = {
  id: "src-noaa-tropical-hurricane-v1",
  family: "tropical_hurricane",
  provider: "noaa_ncei_storm_events",
  name: "NOAA/NCEI Storm Events — Tropical Storm & Hurricane Corpus",
  description:
    "Authoritative historical storm events database covering tropical depressions, tropical storms, and hurricanes affecting US coastal and inland areas.",
  temporalCoverage: {
    startYear: 1950,
    endYear: null,
    collectionEra: "1950-present_nws_standard",
    collectionMethod: "nws_instruction_10_1605_standard",
    dateGranularity: "date",
  },
  geographicCoverage: {
    primaryGranularity: "county_fips",
    supportedGranularities: ["county_fips", "state", "national", "lat_lon_box"],
    eligibleStateAbbrs: [
      "AL",
      "FL",
      "GA",
      "NC",
      "SC",
      "VA",
      "MD",
      "DE",
      "NJ",
      "NY",
      "CT",
      "RI",
      "MA",
      "NH",
      "ME",
      "TX",
      "LA",
      "MS",
      "PR",
      "VI",
      "HI",
      "DC",
    ],
    geographicNotes:
      "Constrained to Atlantic, Gulf Coast, and Eastern Pacific coastal States and territories, plus inland tropical system remnants.",
  },
  seasonalApplicability: {
    appliesYearRound: false,
    activeMonths: [6, 7, 8, 9, 10, 11], // June to November
    peakMonths: [8, 9, 10], // August to October
    rationale:
      "Official Atlantic & Eastern Pacific hurricane season spans June 1 through November 30.",
  },
  severityScale: {
    scaleName: "Saffir-Simpson Hurricane Wind Scale / Wind Speed",
    unit: "knots / mph / category",
    minValue: 1,
    maxValue: 5,
    categories: [
      "Tropical Depression",
      "Tropical Storm",
      "Category 1",
      "Category 2",
      "Category 3",
      "Category 4",
      "Category 5",
    ],
    description:
      "Saffir-Simpson 1-5 scale based on 1-minute sustained wind speeds, plus tropical storm/depression classifications.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "days",
    typicalMin: 1,
    typicalMax: 7,
    maxObserved: 14,
    durationNotes:
      "Landfall impact duration typically 1-3 days; overall track duration up to 14 days.",
  },
  provenance: {
    providerId: "noaa_ncei_storm_events",
    sourceTitle: "NOAA NCEI Storm Events Database",
    sourceUrl: "https://www.ncdc.noaa.gov/stormevents/",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain / Public Data",
    transformationNotes:
      "Normalized from NCEI storm details and location files according to NWS Directive 10-1605.",
  },
  limitations: {
    historicalDataGaps: [
      "Prior to 1996, tropical events were inconsistently cataloged in paper publication records.",
      "Damage estimates prior to 1996 use broad log-scale brackets.",
    ],
    reportingBiases: [
      "Coastal damage reporting has higher density in populated metropolitan areas.",
      "Offshore wind speeds are interpolated from reconnaissance aircraft and buoy measurements.",
    ],
    geographicBoundariesCaveats: [
      "Inland county impacts depend heavily on track decay rate and rainband distribution.",
    ],
    calibrationCaveats: [
      "Landfall frequency is subject to multi-decadal climate oscillations (AMO/ENSO).",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 0.18, // e.g. average annual hurricane/tropical storm impact rate for Gulf/Atlantic coastal zones
    formula: "count(tropical_events_1996_2025) / 30 years / coastal_zones",
    totalObservations: 412,
    samplePeriodYears: 30,
    geographicDenominator: "Atlantic & Gulf Coast Counties",
  },
};

export const NOAA_TORNADO_SEVERE_WEATHER_SOURCE: EventSourceDefinition = {
  id: "src-noaa-tornado-severe-weather-v1",
  family: "tornado_severe_weather",
  provider: "noaa_ncei_storm_events",
  name: "NOAA/NCEI Storm Events — Tornado & Severe Convective Storm Corpus",
  description:
    "Empirical historical tornado track and severe thunderstorm wind/hail records from NWS forecast offices across the United States.",
  temporalCoverage: {
    startYear: 1950,
    endYear: null,
    collectionEra: "1950-present_tornado_and_convective",
    collectionMethod: "severe_local_storms_project",
    dateGranularity: "datetime_utc",
  },
  geographicCoverage: {
    primaryGranularity: "county_fips",
    supportedGranularities: ["county_fips", "state", "national", "lat_lon_box"],
    geographicNotes:
      "National coverage across all 50 states and territories; highest frequency in Central and Southern Plains, Midwest, and Southeast.",
  },
  seasonalApplicability: {
    appliesYearRound: true,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [4, 5, 6],
    rationale:
      "Tornadoes occur in all months, with primary spring peak (April-June) in Plains/Midwest and secondary autumn peak in the South.",
  },
  severityScale: {
    scaleName: "Enhanced Fujita (EF) Scale / Fujita (F) Scale",
    unit: "EF_scale",
    minValue: 0,
    maxValue: 5,
    categories: ["EF0", "EF1", "EF2", "EF3", "EF4", "EF5"],
    description:
      "EF-Scale (2007-present) and legacy F-Scale (1950-2007) based on structural and tree damage indicators.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "hours",
    typicalMin: 0.1,
    typicalMax: 4,
    maxObserved: 12,
    durationNotes:
      "Individual tornado ground tracks last minutes to hours; severe storm outbreaks span up to 12 hours.",
  },
  provenance: {
    providerId: "noaa_ncei_storm_events",
    sourceTitle: "NOAA NCEI Storm Events Database — Tornado Tracks",
    sourceUrl: "https://www.ncdc.noaa.gov/stormevents/",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain",
    transformationNotes:
      "Cross-referenced with Storm Prediction Center (SPC) severe weather database.",
  },
  limitations: {
    historicalDataGaps: [
      "Tornado ratings prior to 1973 were assigned retroactively from newspaper photos and accounts.",
      "Non-tornado thunderstorm wind gust reporting relies on spotter networks and airport ASOS stations.",
    ],
    reportingBiases: [
      "Increased reporting frequency post-1990 due to Doppler radar deployment (NEXRAD) and mobile phones.",
    ],
    geographicBoundariesCaveats: [
      "County segment tracks may cross multiple FIPS codes.",
    ],
    calibrationCaveats: [
      "Tornado counts exhibit strong artificial upward trend due to improved detection of EF0/EF1 tornadoes.",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 1.25,
    formula: "count(tornadoes_ef1_plus) / 30_years / area_units",
    totalObservations: 68420,
    samplePeriodYears: 75,
    geographicDenominator: "US Contiguous Land Mass",
  },
};

export const NOAA_FLOODING_SOURCE: EventSourceDefinition = {
  id: "src-noaa-flooding-v1",
  family: "flooding",
  provider: "noaa_ncei_storm_events",
  name: "NOAA/NCEI Storm Events — Flash Flood & River Flood Corpus",
  description:
    "Authoritative empirical records of flash flooding, riverine flooding, and coastal flood events.",
  temporalCoverage: {
    startYear: 1996,
    endYear: null,
    collectionEra: "1996-present_nws_standard_48",
    collectionMethod: "nws_instruction_10_1605_standard",
    dateGranularity: "date",
  },
  geographicCoverage: {
    primaryGranularity: "county_fips",
    supportedGranularities: ["county_fips", "state", "national"],
    geographicNotes:
      "National coverage. Riverine flooding concentrated in major river basins (Mississippi, Ohio, Missouri); flash flooding widespread.",
  },
  seasonalApplicability: {
    appliesYearRound: true,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [3, 4, 5, 6],
    rationale:
      "Flash floods occur year-round with heavy convection; river floods peak during spring snowmelt and heavy rain periods.",
  },
  severityScale: {
    scaleName: "NWS Flood Severity Classification",
    unit: "flood_stage_ft",
    categories: ["Minor Flooding", "Moderate Flooding", "Major Flooding"],
    description:
      "NWS flood stage categories relative to localized flood stage thresholds.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "days",
    typicalMin: 0.2,
    typicalMax: 14,
    maxObserved: 60,
    durationNotes:
      "Flash floods last hours; major river floods can last weeks to months.",
  },
  provenance: {
    providerId: "noaa_ncei_storm_events",
    sourceTitle: "NOAA NCEI Storm Events — Flood Events",
    sourceUrl: "https://www.ncdc.noaa.gov/stormevents/",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain",
    transformationNotes:
      "Filtered for Flash Flood, River Flood, and Coastal Flood event types.",
  },
  limitations: {
    historicalDataGaps: [
      "Detailed urban drainage flash flood reporting was standardized only post-1996.",
    ],
    reportingBiases: [
      "Urban flash flood reports far outnumber rural unpopulated flash flood reports.",
    ],
    geographicBoundariesCaveats: [
      "River floods track river basins which cut across FIPS county lines.",
    ],
    calibrationCaveats: [
      "Local flood risk requires coupling with USGS stream gauge crest data.",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 0.45,
    formula: "count(flash_flood_events) / 30_years / county_count",
    totalObservations: 142000,
    samplePeriodYears: 30,
    geographicDenominator: "US County Level Average",
  },
};

export const NOAA_WINTER_STORM_SOURCE: EventSourceDefinition = {
  id: "src-noaa-winter-storm-v1",
  family: "winter_storm",
  provider: "noaa_ncei_storm_events",
  name: "NOAA/NCEI Storm Events — Winter Storm, Blizzard & Ice Storm Corpus",
  description:
    "Authoritative empirical record of blizzards, heavy snow, ice storms, and winter weather events.",
  temporalCoverage: {
    startYear: 1996,
    endYear: null,
    collectionEra: "1996-present_nws_standard_48",
    collectionMethod: "nws_instruction_10_1605_standard",
    dateGranularity: "date",
  },
  geographicCoverage: {
    primaryGranularity: "county_fips",
    supportedGranularities: ["county_fips", "state", "national"],
    eligibleStateAbbrs: [
      "AK",
      "AL",
      "AR",
      "AZ",
      "CO",
      "CT",
      "DC",
      "DE",
      "GA",
      "IA",
      "ID",
      "IL",
      "IN",
      "KS",
      "KY",
      "MA",
      "MD",
      "ME",
      "MI",
      "MN",
      "MO",
      "MS",
      "MT",
      "NC",
      "ND",
      "NE",
      "NH",
      "NJ",
      "NM",
      "NV",
      "NY",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VA",
      "VT",
      "WA",
      "WI",
      "WV",
      "WY",
    ],
    geographicNotes:
      "Dominant in Northern, Central, and Mountain states, with occasional significant Southern winter storms.",
  },
  seasonalApplicability: {
    appliesYearRound: false,
    activeMonths: [10, 11, 12, 1, 2, 3, 4],
    peakMonths: [12, 1, 2],
    rationale: "Northern hemisphere meteorological winter and shoulder months.",
  },
  severityScale: {
    scaleName: "RSI (Northeast Snowfall Impact) / Snowfall Accumulation",
    unit: "inches / ice_thickness_inches",
    minValue: 0,
    description:
      "Snow accumulation in inches, ice accretion in fractions of an inch, wind speeds for blizzard classification.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "days",
    typicalMin: 1,
    typicalMax: 4,
    maxObserved: 7,
    durationNotes:
      "Snowfall events span 12 to 72 hours; prolonged cold/ice impacts last up to a week.",
  },
  provenance: {
    providerId: "noaa_ncei_storm_events",
    sourceTitle: "NOAA NCEI Storm Events — Winter Weather",
    sourceUrl: "https://www.ncdc.noaa.gov/stormevents/",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain",
    transformationNotes:
      "Aggregated Winter Storm, Blizzard, Ice Storm, and Heavy Snow event types.",
  },
  limitations: {
    historicalDataGaps: [
      "Pre-1996 records cataloged only extreme blizzards without standardized snowfall thresholds.",
    ],
    reportingBiases: [
      "Ice storm power outage reports correlate with grid infrastructure density.",
    ],
    geographicBoundariesCaveats: [
      "High-elevation mountain snowfall varies drastically within single county boundaries.",
    ],
    calibrationCaveats: [
      "Southern winter storms have low annual frequency but severe infrastructure impact.",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 1.8,
    formula: "count(winter_storms) / 30_years / northern_counties",
    totalObservations: 98500,
    samplePeriodYears: 30,
    geographicDenominator: "Northern & Mountain US Counties",
  },
};

export const NOAA_EXTREME_HEAT_COLD_SOURCE: EventSourceDefinition = {
  id: "src-noaa-extreme-heat-cold-v1",
  family: "extreme_heat_cold",
  provider: "noaa_ncei_storm_events",
  name: "NOAA/NCEI Storm Events — Excessive Heat & Extreme Cold Corpus",
  description:
    "Authoritative empirical records of excessive heat waves, hard freezes, and extreme cold/wind chill events.",
  temporalCoverage: {
    startYear: 1996,
    endYear: null,
    collectionEra: "1996-present_nws_standard_48",
    collectionMethod: "nws_instruction_10_1605_standard",
    dateGranularity: "date",
  },
  geographicCoverage: {
    primaryGranularity: "county_fips",
    supportedGranularities: ["county_fips", "state", "national"],
    geographicNotes:
      "Extreme heat affects Southwest, Central, and Eastern US; extreme cold/wind chill affects Northern and Central states.",
  },
  seasonalApplicability: {
    appliesYearRound: true,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [6, 7, 8, 12, 1, 2],
    rationale:
      "Excessive heat peaks June-August; extreme cold/freeze peaks December-February.",
  },
  severityScale: {
    scaleName: "Heat Index / Wind Chill Temperature",
    unit: "fahrenheit",
    description:
      "Heat index (°F) for heat waves; Wind chill temperature (°F) and departure from normal for cold waves.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "days",
    typicalMin: 2,
    typicalMax: 10,
    maxObserved: 30,
    durationNotes:
      "Heat waves typically span 3-7 days; Arctic cold snaps span 2-7 days.",
  },
  provenance: {
    providerId: "noaa_ncei_storm_events",
    sourceTitle: "NOAA NCEI Storm Events — Heat & Cold",
    sourceUrl: "https://www.ncdc.noaa.gov/stormevents/",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain",
    transformationNotes:
      "Includes Excessive Heat, Heat, Extreme Cold/Wind Chill, and Frost/Freeze events.",
  },
  limitations: {
    historicalDataGaps: [
      "Heat Index thresholds vary by local NWS weather forecast office.",
    ],
    reportingBiases: [
      "Heat mortality reporting depends on public health reporting practices across counties.",
    ],
    geographicBoundariesCaveats: [
      "Urban heat island effects are not distinguished in county-wide averages.",
    ],
    calibrationCaveats: [
      "Heat wave frequency is subject to decadal warming trends.",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 0.65,
    formula: "count(excessive_heat_and_cold) / 30_years / county_count",
    totalObservations: 34100,
    samplePeriodYears: 30,
    geographicDenominator: "US County Level",
  },
};

export const NOAA_DROUGHT_SOURCE: EventSourceDefinition = {
  id: "src-noaa-drought-v1",
  family: "drought",
  provider: "noaa_ncei_storm_events",
  name: "NOAA/NCEI Storm Events & US Drought Monitor Corpus",
  description:
    "Authoritative empirical records of agricultural, hydrological, and meteorological drought conditions.",
  temporalCoverage: {
    startYear: 2000,
    endYear: null,
    collectionEra: "2000-present_us_drought_monitor",
    collectionMethod: "us_drought_monitor_multi_agency",
    dateGranularity: "date",
  },
  geographicCoverage: {
    primaryGranularity: "county_fips",
    supportedGranularities: ["county_fips", "state", "national"],
    geographicNotes:
      "National coverage with high prevalence in Southwest, Great Plains, and Western states.",
  },
  seasonalApplicability: {
    appliesYearRound: true,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [6, 7, 8, 9],
    rationale:
      "Drought persists continuously across seasons, with peak agricultural and hydrological impacts in summer and early fall.",
  },
  severityScale: {
    scaleName: "US Drought Monitor (USDM) D0-D4 Scale",
    unit: "drought_category",
    categories: [
      "D0 Abnormally Dry",
      "D1 Moderate Drought",
      "D2 Severe Drought",
      "D3 Extreme Drought",
      "D4 Exceptional Drought",
    ],
    description:
      "USDM intensity scale based on Palmer Drought Severity Index, soil moisture, and streamflow percentiles.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "months",
    typicalMin: 1,
    typicalMax: 12,
    maxObserved: 84, // multi-year megadroughts
    durationNotes:
      "Drought events develop over months and can persist for multiple years.",
  },
  provenance: {
    providerId: "noaa_ncei_storm_events",
    sourceTitle: "NOAA NCEI Storm Events — Drought & US Drought Monitor",
    sourceUrl: "https://droughtmonitor.unl.edu/",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain",
    transformationNotes:
      "Cross-referenced NCEI Drought event records with weekly USDM county classifications.",
  },
  limitations: {
    historicalDataGaps: [
      "USDM standardized weekly multi-indicator intensity mapping began in 2000.",
    ],
    reportingBiases: [
      "Impact reports reflect regional water storage capacity and irrigation dependence.",
    ],
    geographicBoundariesCaveats: [
      "Drought contours cross state and county lines smoothly.",
    ],
    calibrationCaveats: [
      "Multi-year megadrought persistence requires Markov chain state transition modeling rather than independent annual draws.",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 0.22,
    formula: "count(drought_episodes_d2_plus) / 25_years / county_count",
    totalObservations: 12400,
    samplePeriodYears: 25,
    geographicDenominator: "US County Level Average",
  },
};
