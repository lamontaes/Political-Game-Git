import crypto from "crypto";
import type {
  ConfidenceLevel,
  LegislativeProvider,
  SourceProvenance,
} from "./types.js";

export const COMPILER_SCHEMA_VERSION = "1.0.0";

/**
 * Deterministic JSON serialization with sorted object keys.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJsonStringify(record[key])}`,
  );
  return `{${entries.join(",")}}`;
}

export function computeSha256(data: string | Buffer | object): string {
  const hash = crypto.createHash("sha256");
  if (typeof data === "string") {
    hash.update(data, "utf8");
  } else if (Buffer.isBuffer(data)) {
    hash.update(data);
  } else {
    hash.update(canonicalJsonStringify(data), "utf8");
  }
  return hash.digest("hex");
}

export interface BuildProvenanceOptions {
  provider: LegislativeProvider;
  providerId: string;
  officialUrl?: string | null;
  providerUrl?: string | null;
  retrievalTimestamp?: string;
  confidence?: ConfidenceLevel;
  contentForHash?: unknown;
}

export function buildSourceProvenance(
  opts: BuildProvenanceOptions,
): SourceProvenance {
  const retrievalTimestamp = opts.retrievalTimestamp || "2026-08-28T00:00:00Z";
  const confidence = opts.confidence || "provider_standardized";
  const officialUrl = opts.officialUrl ?? null;
  const providerUrl = opts.providerUrl ?? null;

  const contentToHash = opts.contentForHash ?? {
    provider: opts.provider,
    providerId: opts.providerId,
    officialUrl,
    providerUrl,
    retrievalTimestamp,
  };

  return {
    provider: opts.provider,
    providerId: opts.providerId,
    officialUrl,
    providerUrl,
    retrievalTimestamp,
    compilerVersion: COMPILER_SCHEMA_VERSION,
    sha256: computeSha256(contentToHash),
    confidence,
  };
}
