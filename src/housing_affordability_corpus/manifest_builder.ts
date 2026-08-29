/**
 * National Housing Coverage Manifest Builder
 *
 * Scans compiled housing records and generates an audit manifest of coverage,
 * vintages, and high-level calibration benchmarks across all tracked jurisdictions.
 */

import { computeSha256 } from "./provenance.js";
import type {
  CompiledHousingCorpus,
  JurisdictionCoverageSummary,
  NationalHousingCoverageManifest,
} from "./types.js";

export function buildNationalHousingCoverageManifest(
  corpus: CompiledHousingCorpus,
): NationalHousingCoverageManifest {
  const jurisdictionMap = new Map<string, JurisdictionCoverageSummary>();

  // Helper to ensure entry exists
  const getOrCreate = (geo: {
    geoId: string;
    name: string;
    stateAbbr: string;
    countyFips: string | null;
    cbsaCode: string | null;
    isTerritory: boolean;
  }): JurisdictionCoverageSummary => {
    let entry = jurisdictionMap.get(geo.geoId);
    if (!entry) {
      entry = {
        geoId: geo.geoId,
        name: geo.name,
        stateAbbr: geo.stateAbbr,
        countyFips: geo.countyFips,
        cbsaCode: geo.cbsaCode,
        isTerritory: geo.isTerritory,
        hasFmr: false,
        hasIncomeLimits: false,
        hasChas: false,
        fmrVintages: [],
        ilVintages: [],
        chasVintages: [],
        totalChasHouseholds: null,
        medianFamilyIncome: null,
        fmr2Br: null,
        severeCostBurdenRate: null,
      };
      jurisdictionMap.set(geo.geoId, entry);
    }
    return entry;
  };

  // Populate from geographic coverage
  for (const geo of corpus.geographicCoverage) {
    getOrCreate(geo);
  }

  // Record FMR details
  for (const fmr of corpus.fmrRecords) {
    const entry = getOrCreate(fmr.geo);
    entry.hasFmr = true;
    if (!entry.fmrVintages.includes(fmr.vintage)) {
      entry.fmrVintages.push(fmr.vintage);
      entry.fmrVintages.sort();
    }
    if (entry.fmr2Br === null || fmr.vintage === "FY2024") {
      entry.fmr2Br = fmr.fmr2Br;
    }
  }

  // Record Income Limit details
  for (const il of corpus.incomeLimitRecords) {
    const entry = getOrCreate(il.geo);
    entry.hasIncomeLimits = true;
    if (!entry.ilVintages.includes(il.vintage)) {
      entry.ilVintages.push(il.vintage);
      entry.ilVintages.sort();
    }
    if (entry.medianFamilyIncome === null || il.vintage === "FY2024") {
      entry.medianFamilyIncome = il.medianFamilyIncome;
    }
  }

  // Record CHAS details
  for (const chas of corpus.chasRecords) {
    const entry = getOrCreate(chas.geo);
    entry.hasChas = true;
    if (!entry.chasVintages.includes(chas.vintage)) {
      entry.chasVintages.push(chas.vintage);
      entry.chasVintages.sort();
    }
  }

  // Populate calibration profile benchmarks
  for (const profile of corpus.calibrationProfiles) {
    const entry = getOrCreate(profile.geo);
    entry.totalChasHouseholds = profile.chasSummary.totalHouseholds;
    entry.severeCostBurdenRate =
      profile.chasSummary.costBurdenSummary.severeCostBurdenRate;
    entry.medianFamilyIncome = profile.incomeLimits.medianFamilyIncome;
    entry.fmr2Br = profile.fmr.fmr2Br;
  }

  const jurisdictions = Array.from(jurisdictionMap.values()).sort((a, b) =>
    a.geoId.localeCompare(b.geoId),
  );

  const totalJurisdictionsCount = jurisdictions.length;
  const completeCoverageCount = jurisdictions.filter(
    (j) => j.hasFmr && j.hasIncomeLimits && j.hasChas,
  ).length;

  const manifestId = "national_housing_coverage_manifest_v1";
  const schemaVersion = "1.0.0";
  const generatedAt = "2026-08-28T18:00:00.000Z";
  const compilerVersion = "1.0.0";

  const manifestPayload = {
    manifestId,
    schemaVersion,
    generatedAt,
    compilerVersion,
    jurisdictions,
    totalJurisdictionsCount,
    completeCoverageCount,
  };

  const manifestSha256 = computeSha256(manifestPayload);

  return {
    ...manifestPayload,
    manifestSha256,
  };
}
