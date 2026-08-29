/**
 * Economic Provenance, Vintage Lineage, and Suppression Classification
 */

import crypto from "node:crypto";
import type {
  EconomyProvenance,
  EconomyProvider,
  SuppressionStatus,
} from "./types.js";

export const COMPILER_VERSION = "local-economy-v1.0.0";

/**
 * Classifies raw source cell suppression codes into structured suppression status.
 */
export function classifySuppression(rawVal: unknown): {
  isSuppressed: boolean;
  status: SuppressionStatus;
  code: string | null;
  numericValue: number | null;
} {
  if (rawVal === null || rawVal === undefined) {
    return {
      isSuppressed: true,
      status: "not_available",
      code: null,
      numericValue: null,
    };
  }

  if (typeof rawVal === "number") {
    if (isNaN(rawVal)) {
      return {
        isSuppressed: true,
        status: "not_available",
        code: "NaN",
        numericValue: null,
      };
    }
    return {
      isSuppressed: false,
      status: "disclosable",
      code: null,
      numericValue: rawVal,
    };
  }

  const str = String(rawVal).trim();

  // BEA and QCEW suppression codes:
  // "(D)" or "D" or "N" or "C": Not shown to avoid disclosure of confidential information
  // "(L)" or "L": Less than $50,000 / 10 jobs
  // "(N)" or "N/A" or "NA": Not available / not applicable
  // "(NA)": Not available
  if (
    str === "(D)" ||
    str === "D" ||
    str === "N" ||
    str === "C" ||
    str === "(C)"
  ) {
    return {
      isSuppressed: true,
      status: "suppressed_confidential",
      code: str,
      numericValue: null,
    };
  }

  if (str === "(L)" || str === "L") {
    return {
      isSuppressed: true,
      status: "suppressed_subthreshold",
      code: str,
      numericValue: null,
    };
  }

  if (
    str === "(N)" ||
    str === "NA" ||
    str === "N/A" ||
    str === "(NA)" ||
    str === "." ||
    str === ""
  ) {
    return {
      isSuppressed: true,
      status: "not_available",
      code: str || "NA",
      numericValue: null,
    };
  }

  // Attempt numeric parsing (remove commas, currency symbols)
  const cleaned = str.replace(/[$,]/g, "").trim();
  const parsed = Number(cleaned);

  if (!isNaN(parsed) && cleaned.length > 0) {
    return {
      isSuppressed: false,
      status: "disclosable",
      code: null,
      numericValue: parsed,
    };
  }

  return {
    isSuppressed: true,
    status: "not_available",
    code: str,
    numericValue: null,
  };
}

/**
 * Computes deterministic SHA-256 hash for raw payload.
 */
export function computePayloadHash(rawPayload: unknown): string {
  const content =
    typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload);
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Builds a deterministic, stable synthetic Observation ID.
 */
export function buildObservationId(params: {
  geoFips: string;
  provider: EconomyProvider;
  measureCode: string;
  naicsCode: string | null;
  ownershipCode: string | null;
  periodLabel: string;
  vintageId: string;
}): string {
  const naicsPart = params.naicsCode
    ? params.naicsCode.replace(/[^a-zA-Z0-9]/g, "-")
    : "all";
  const ownPart = params.ownershipCode || "0";
  const sanitizedMeasure = params.measureCode
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  const sanitizedPeriod = params.periodLabel
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  const sanitizedVintage = params.vintageId
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();

  return `${params.geoFips}_${params.provider}_${sanitizedMeasure}_${naicsPart}_own${ownPart}_${sanitizedPeriod}_${sanitizedVintage}`;
}

/**
 * Builds standard provenance record.
 */
export function buildEconomyProvenance(params: {
  provider: EconomyProvider;
  providerSeriesId: string;
  vintageId: string;
  tableOrDataset: string;
  lineCodeOrField?: string;
  officialSourceUrl?: string | null;
  retrievalTimestamp?: string;
  rawPayload: unknown;
}): EconomyProvenance {
  return {
    provider: params.provider,
    providerSeriesId: params.providerSeriesId,
    vintageId: params.vintageId,
    tableOrDataset: params.tableOrDataset,
    lineCodeOrField: params.lineCodeOrField,
    officialSourceUrl: params.officialSourceUrl ?? null,
    retrievalTimestamp: params.retrievalTimestamp || "2026-08-28T00:00:00.000Z",
    compilerVersion: COMPILER_VERSION,
    sha256: computePayloadHash(params.rawPayload),
  };
}
