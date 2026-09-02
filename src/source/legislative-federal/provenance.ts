/**
 * Federal Legislative Source Corpus - Provenance and Deterministic Hashing
 */

import { canonicalJsonStringify, sha256Hex } from "../hashing.js";
import type { FederalProvenanceMetadata } from "./types.js";

export const FEDERAL_SCHEMA_VERSION = "1.0.0";

export { canonicalJsonStringify, sha256Hex };

/**
 * Computes deterministic SHA-256 hash of any JSON-serializable structure.
 */
export function hashDataStructure(data: unknown): string {
  return sha256Hex(canonicalJsonStringify(data));
}

/**
 * Generates standardized federal provenance metadata.
 */
export function createFederalProvenanceMetadata(
  recordPayload: unknown,
  retrievedAt = "2026-08-28T00:00:00.000Z",
): FederalProvenanceMetadata {
  return {
    primarySource: "Congress.gov API",
    secondaryDocumentSource: "GovInfo API",
    retrievedAt,
    schemaVersion: FEDERAL_SCHEMA_VERSION,
    recordSha256: hashDataStructure(recordPayload),
  };
}

/**
 * Normalizes stable measure IDs: `us_fed_{congress}_{type}_{number}`
 */
export function formatFederalMeasureId(
  congress: number,
  measureType: string,
  measureNumber: number,
): string {
  return `us_fed_${congress}_${measureType.toLowerCase()}_${measureNumber}`;
}

/**
 * Normalizes stable amendment IDs: `us_fed_{congress}_{type}_{number}`
 */
export function formatFederalAmendmentId(
  congress: number,
  amendmentType: string,
  amendmentNumber: number,
): string {
  return `us_fed_${congress}_${amendmentType.toLowerCase()}_${amendmentNumber}`;
}

/**
 * Normalizes stable House roll call vote IDs: `us_fed_{congress}_house_roll_{rollNumber}`
 */
export function formatFederalHouseVoteId(
  congress: number,
  rollNumber: number,
): string {
  return `us_fed_${congress}_house_roll_${rollNumber}`;
}
