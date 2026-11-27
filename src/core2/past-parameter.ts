import rows from "./data/past/parameters.json" with { type: "json" };
import type { Parameter } from "./parameters";
import type { CoreAPI } from "./types";

/**
 * The past's own parameters (data/past/parameters.json), read by the century
 * and the past module alike. A file of its own so the century can read one
 * without importing the past module, which imports the state, which imports
 * the engines the century is part of (an import cycle).
 */
const PARAMETERS = rows as Readonly<Record<string, Parameter>>;

/** A past parameter's value, registering its stopgap when it carries one. */
export function pastParameter(api: CoreAPI | null, key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown past parameter: ${key}`);
  if (row.stopgapId) api?.stopgap(row.stopgapId);
  return row.value;
}
