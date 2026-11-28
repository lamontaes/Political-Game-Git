/**
 * The past's reads: its parameters, the seeded draw between two bounds, a date
 * shifted by days, and the past module's id. They import only the past's
 * parameter table and the seeded draw, both outside every ring, so a writer of
 * the past takes them without loading the past engine's ring; past-module.ts
 * re-exports each one.
 */
import rows from "./data/past/parameters.json" with { type: "json" };
import type { Parameter } from "./parameters";
import { seededUnit } from "./seeded";
import type { CoreAPI } from "./types";

export const PAST_MODULE_ID = "core2-past-v1";

const PARAMETERS = rows as Readonly<Record<string, Parameter>>;

/** A past parameter's value, registering its stopgap when it carries one. */
export function pastParameter(api: CoreAPI | null, key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown past parameter: ${key}`);
  if (row.stopgapId) api?.stopgap(row.stopgapId);
  return row.value;
}

/** A value inside [low, high], fixed by the seed and key. */
export function seededBetween(
  seed: string,
  key: string,
  low: number,
  high: number,
): number {
  return low + (high - low) * seededUnit(seed, key);
}

export function shiftDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}
