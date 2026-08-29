/**
 * Provenance and Cryptographic Verification for Housing Corpus
 *
 * Deterministic JSON serialization and SHA-256 hash generation
 * ensuring auditability, reproducibility, and source integrity.
 */

import { createHash } from "node:crypto";
import type { HousingDataSource, HousingSourceProvenance } from "./types.js";

/**
 * Deterministically serializes any JavaScript value with sorted keys.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const serializedItems = value.map((item) => canonicalJsonStringify(item));
    return `[${serializedItems.join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs = keys.map((key) => {
    const valStr = canonicalJsonStringify(record[key]);
    return `${JSON.stringify(key)}:${valStr}`;
  });

  return `{${pairs.join(",")}}`;
}

/**
 * Generates a SHA-256 hash of a string, buffer, or canonicalized JSON object.
 */
export function computeSha256(data: unknown): string {
  const content =
    typeof data === "string"
      ? data
      : Buffer.isBuffer(data)
        ? data
        : canonicalJsonStringify(data);

  return createHash("sha256").update(content).digest("hex");
}

/**
 * Constructs a standardized provenance envelope.
 */
export function createProvenanceEnvelope(
  source: HousingDataSource,
  vintage: string,
  sourceUrl: string | null,
  rawPayload: unknown,
  retrievalMethod: "api" | "download" | "fixture" = "download",
  notes?: string,
): HousingSourceProvenance {
  const payloadHash = computeSha256(rawPayload);
  return {
    source,
    vintage,
    sourceUrl,
    downloadTimestamp: "2026-08-28T18:00:00.000Z", // Stable baseline timestamp for deterministic compilation
    sha256: payloadHash,
    retrievalMethod,
    ...(notes ? { notes } : {}),
  };
}

/**
 * Verifies that a data payload matches an expected SHA-256 hash.
 */
export function verifyProvenance(data: unknown, expectedHash: string): boolean {
  const computed = computeSha256(data);
  return computed === expectedHash;
}
