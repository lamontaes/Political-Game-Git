/**
 * The public surface of the source core.
 *
 * Domains import this module and nothing else from the core. There is
 * deliberately no export whose name begins `valueOr`, `getOr` or `unwrapOr`: a
 * caller who needs a display fallback writes it at the presentation boundary,
 * where a reader can see it, rather than inside the source layer where it would
 * silently become data.
 */

export * from "./errors";
export * from "./hashing";
export * from "./canonical-json";
export * from "./value";
export * from "./aggregate";
export * from "./artifact";
export * from "./corpus";
export * from "./capability";
export * from "./domain";
export * from "./write";
export * from "./parse/errors";
export * from "./parse/delimited";
export * from "./parse/fixed-width";
export * from "./parse/bls-timeseries";
export * from "./archive/zip";
export * from "./archive/xlsx";
