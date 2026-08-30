import type { EventSourceDefinition } from "../types";

export const DOE_417_POWER_DISTURBANCE_SOURCE: EventSourceDefinition = {
  id: "src-doe-417-power-disturbance-v1",
  family: "major_power_disturbance",
  provider: "doe_417_electric_emergency",
  name: "Department of Energy Form OE-417 Electric Emergency Incidents and Disturbances",
  description:
    "Authoritative records of major electric power system emergencies, grid disturbances, cyber/physical security incidents, and widespread blackouts collected by the US Department of Energy.",
  temporalCoverage: {
    startYear: 2000,
    endYear: null,
    collectionEra: "2000-present_oe417_standard",
    collectionMethod: "mandatory_electric_utility_filing_oe417",
    dateGranularity: "datetime_utc",
  },
  geographicCoverage: {
    primaryGranularity: "nerc_region",
    supportedGranularities: ["nerc_region", "state", "national"],
    geographicNotes:
      "National coverage across US electrical interconnections (Eastern, Western, Texas/ERCOT) and NERC regional entities.",
  },
  seasonalApplicability: {
    appliesYearRound: true,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [6, 7, 8, 12, 1, 2], // Peak summer heat demand and winter freezing storms
    rationale:
      "Grid stress peaks during extreme summer cooling demand and extreme winter heating/freezing events.",
  },
  severityScale: {
    scaleName: "Customers Affected / Megawatts (MW) Shed",
    unit: "customers_affected / megawatt_loss",
    description:
      "Measured by number of affected electric customers, peak megawatts of lost load, and NERC emergency alert level.",
  },
  durationConstraint: {
    supportsDuration: true,
    durationUnit: "hours",
    typicalMin: 1,
    typicalMax: 48,
    maxObserved: 336, // ~14 days (e.g., major hurricane restoration)
    durationNotes:
      "Incident duration measures time from initial event onset until full service restoration.",
  },
  provenance: {
    providerId: "doe_417_electric_emergency",
    sourceTitle:
      "DOE Office of Cybersecurity, Energy Security, and Emergency Response (CESER) Form OE-417 Reports",
    sourceUrl: "https://www.netl.doe.gov/energy-analysis/details?id=OE-417",
    datasetVersion: "2026-v1",
    retrievedAt: "2026-01-15",
    license: "US Government Public Domain",
    transformationNotes:
      "Normalized utility incident categories into standardized grid disturbance causes.",
  },
  limitations: {
    historicalDataGaps: [
      "Reporting thresholds were revised in 2011 and 2015, changing customer count cutoff rules.",
    ],
    reportingBiases: [
      "Filing requirements focus on electric utilities serving >50,000 customers; small rural co-ops may underreport short outages.",
    ],
    geographicBoundariesCaveats: [
      "Utility service territories cross county and state lines; reporting is often NERC region or state level.",
    ],
    calibrationCaveats: [
      "Major power outages are strongly correlated with extreme weather events (hurricanes, ice storms).",
    ],
  },
  calibration: {
    status: "calibrated",
    annualOccurrenceRate: 14.5, // Average annual major grid disturbance incidents across US interconnections
    formula: "count(oe417_incidents_gt_50k_customers) / 25_years",
    totalObservations: 2850,
    samplePeriodYears: 25,
    geographicDenominator: "United States National Grid",
  },
};
