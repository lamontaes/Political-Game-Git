import { createHash } from "node:crypto";
import type { ElectionAdminProvenance } from "./types";

export const ELECTION_ADMIN_SCHEMA_VERSION = "1.0.0";

/**
 * Deterministic JSON stringifier with sorted object keys.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const val = (value as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${canonicalJsonStringify(val)}`;
  });

  return `{${pairs.join(",")}}`;
}

/**
 * Computes SHA-256 hash of arbitrary content.
 */
export function sha256Hash(content: unknown): string {
  const normalized =
    typeof content === "string" ? content : canonicalJsonStringify(content);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Constructs an ElectionAdminProvenance record with cryptographic SHA-256 hash.
 */
export function createElectionAdminProvenance(params: {
  readonly source: string;
  readonly publisher: string;
  readonly dataset: string;
  readonly vintageYear: number;
  readonly retrievalDate: string;
  readonly sourceUrl: string;
  readonly payloadToHash: unknown;
  readonly notes?: string;
  readonly schemaVersion?: string;
}): ElectionAdminProvenance {
  return {
    source: params.source,
    publisher: params.publisher,
    dataset: params.dataset,
    vintageYear: params.vintageYear,
    retrievalDate: params.retrievalDate,
    sourceUrl: params.sourceUrl,
    contentHash: sha256Hash(params.payloadToHash),
    schemaVersion: params.schemaVersion ?? ELECTION_ADMIN_SCHEMA_VERSION,
    ...(params.notes ? { notes: params.notes } : {}),
  };
}
