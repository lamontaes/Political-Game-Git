/**
 * Manifest Builder for Local Economy Source Corpus
 */

import crypto from "node:crypto";
import { COMPILER_VERSION } from "./provenance.js";
import type {
  EconomyObservationRecord,
  LocalEconomyJurisdictionSummary,
  LocalEconomyManifest,
  SourceVintageMetadata,
} from "./types.js";

export function buildLocalEconomyManifest(
  observations: EconomyObservationRecord[],
  vintages: SourceVintageMetadata[],
  generatedAt?: string,
): LocalEconomyManifest {
  const timestamp = generatedAt || new Date().toISOString();

  const jurisdictionsMap = new Map<string, LocalEconomyJurisdictionSummary>();
  const seriesKeys = new Set<string>();

  for (const obs of observations) {
    const ownPart = obs.ownershipCode || "0";
    const naicsPart = obs.naicsCode || "all";
    const seriesKey = `${obs.geoFips}_${obs.measureCode}_${naicsPart}_own${ownPart}_${obs.frequency}`;
    seriesKeys.add(seriesKey);

    let jur = jurisdictionsMap.get(obs.geoFips);
    if (!jur) {
      jur = {
        geoFips: obs.geoFips,
        geoName: obs.geoName,
        geoLevel: obs.geoLevel,
        stateAbbr: obs.stateAbbr,
        hasBeaRegional: false,
        hasQcew: false,
        coveredYears: [],
        totalObservations: 0,
        categoriesPresent: [],
        naicsSectorsPresent: [],
      };
      jurisdictionsMap.set(obs.geoFips, jur);
    }

    jur.totalObservations++;
    if (obs.provenance.provider === "bea_regional") jur.hasBeaRegional = true;
    if (obs.provenance.provider === "bls_qcew") jur.hasQcew = true;

    if (!jur.coveredYears.includes(obs.year)) {
      jur.coveredYears.push(obs.year);
    }
    if (!jur.categoriesPresent.includes(obs.category)) {
      jur.categoriesPresent.push(obs.category);
    }
    if (obs.naicsCode && !jur.naicsSectorsPresent.includes(obs.naicsCode)) {
      jur.naicsSectorsPresent.push(obs.naicsCode);
    }
  }

  for (const jur of jurisdictionsMap.values()) {
    jur.coveredYears.sort((a, b) => a - b);
    jur.categoriesPresent.sort();
    jur.naicsSectorsPresent.sort();
  }

  const sortedJurisdictions: Record<string, LocalEconomyJurisdictionSummary> =
    {};
  const sortedFipsKeys = Array.from(jurisdictionsMap.keys()).sort();
  for (const k of sortedFipsKeys) {
    sortedJurisdictions[k] = jurisdictionsMap.get(k)!;
  }

  const sortedVintages = [...vintages].sort((a, b) =>
    a.vintageId.localeCompare(b.vintageId),
  );

  const manifestData = {
    manifestVersion: "1.0.0",
    generatedAt: timestamp,
    compilerVersion: COMPILER_VERSION,
    totalJurisdictions: sortedFipsKeys.length,
    totalObservations: observations.length,
    totalSeries: seriesKeys.size,
    vintages: sortedVintages,
    jurisdictions: sortedJurisdictions,
    providers: {
      bea: {
        name: "Bureau of Economic Analysis (BEA) Regional Economic Accounts",
        documentationUrl: "https://www.bea.gov/data/economic-accounts/regional",
        apiBaseUrl: "https://apps.bea.gov/api/data",
      },
      bls_qcew: {
        name: "Bureau of Labor Statistics (BLS) Quarterly Census of Employment and Wages",
        documentationUrl: "https://www.bls.gov/cew/",
        apiBaseUrl: "https://data.bls.gov/cew/data/api",
      },
    },
  };

  const sha256 = crypto
    .createHash("sha256")
    .update(JSON.stringify(manifestData))
    .digest("hex");

  return {
    ...manifestData,
    sha256,
  };
}
