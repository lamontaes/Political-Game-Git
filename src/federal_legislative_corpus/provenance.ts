/**
 * Federal Legislative Source Corpus - Provenance and Deterministic Hashing
 */

import { createHash } from "node:crypto";
import type { FederalProvenanceMetadata } from "./types.js";

export const FEDERAL_SCHEMA_VERSION = "1.0.0";

/**
 * Deterministically stringifies an object by sorting all object keys recursively.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys
    .filter((key) => record[key] !== undefined)
    .map(
      (key) => `${JSON.stringify(key)}:${canonicalJsonStringify(record[key])}`,
    );

  return `{${entries.join(",")}}`;
}

/**
 * Computes a hex-encoded SHA-256 hash of a string or buffer.
 */
export function sha256Hex(content: string | Uint8Array): string {
  const hash = createHash("sha256");
  hash.update(content);
  return hash.digest("hex");
}

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
