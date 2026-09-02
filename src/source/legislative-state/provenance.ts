import { canonicalJsonStringify, computeSha256 } from "../hashing.js";
import type {
  ConfidenceLevel,
  LegislativeProvider,
  SourceProvenance,
} from "./types.js";

export const COMPILER_SCHEMA_VERSION = "1.0.0";

export { canonicalJsonStringify, computeSha256 };

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
