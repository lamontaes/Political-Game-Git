/**
 * Adapter Interface for Economic Source Providers (BEA, BLS QCEW, etc.)
 */

import type {
  EconomyObservationRecord,
  EconomyProvider,
  SourceVintageMetadata,
} from "../types.js";

export interface AdapterNormalizationOptions {
  vintageOverride?: Partial<SourceVintageMetadata>;
  officialSourceUrl?: string;
  retrievalTimestamp?: string;
}

export interface EconomySourceAdapter {
  readonly provider: EconomyProvider;

  normalizeDataset(
    raw: unknown,
    options?: AdapterNormalizationOptions,
  ): EconomyObservationRecord[];

  getDefaultVintage(): SourceVintageMetadata;
}
