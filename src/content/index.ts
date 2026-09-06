export * from "./content-bank";
export * from "./content-registry";
export * from "./content-export";
export * from "./adapters";

import { DEFAULT_CONTENT_BANK_ADAPTERS } from "./adapters";
import { ContentBankRegistry, type ContentIndex } from "./content-registry";

let cached: ContentIndex | null = null;

/** The registry every surface reads, built from the default adapters. */
export function createContentRegistry(): ContentBankRegistry {
  return new ContentBankRegistry().registerAll(DEFAULT_CONTENT_BANK_ADAPTERS);
}

/**
 * The index, built once.
 *
 * Adapters read module constants and pure factories, so the index cannot
 * change while a process is alive; building it again would produce the same
 * answer at the cost of rebuilding six catalogs. `rebuild` exists for tests
 * that want a fresh read.
 */
export function contentIndex(options?: {
  readonly rebuild?: boolean;
}): ContentIndex {
  if (cached === null || options?.rebuild === true) {
    cached = createContentRegistry().build();
  }
  return cached;
}
