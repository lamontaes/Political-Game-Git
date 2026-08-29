/**
 * Provenance and Checksum Helpers for Campaign Finance Corpus
 */

import { createHash } from "node:crypto";
import type {
  FecConfidenceLevel,
  FecProvenance,
  FecRecordClass,
} from "./types";

export function computeSha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function createFecProvenance(
  sourceUrl: string,
  recordChecksum: string,
  source:
    | "openfec_api"
    | "fec_bulk_data"
    | "curated_fec_fixture"
    | "synthetic_test_fixture" = "openfec_api",
  recordClass: FecRecordClass = "actual_openfec",
  confidenceLevel: FecConfidenceLevel = "official_reported",
  apiVersion = "v1.0",
): FecProvenance {
  return {
    source,
    recordClass,
    confidenceLevel,
    sourceUrl,
    retrievalTimestamp: "2026-08-28T18:00:00.000Z", // Deterministic baseline timestamp
    apiVersion,
    recordChecksum,
    amendmentPolicy: "exclude_superseded_in_aggregates",
    license:
      recordClass === "synthetic_fixture"
        ? "synthetic_test_fixture"
        : "public_domain_us_gov",
  };
}
