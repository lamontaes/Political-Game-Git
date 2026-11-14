/**
 * The shares the town and the council rules read, from their parameter rows in
 * data/shares.json (each tagged SOURCED, ESTIMATED or TUNABLE with its source
 * and spread). The one reader; no share is typed in code.
 */
import data from "./data/shares.json" with { type: "json" };

export interface ShareRow {
  readonly value: number;
  /** Percent of responding municipalities. */
  readonly percent: number;
}

/** A single share by its key. */
export function shareValue(key: keyof typeof data.scalars): number {
  return data.scalars[key].value;
}

/** A table of values and the percent of municipalities reporting each. */
export function shareTable(key: keyof typeof data.tables): readonly ShareRow[] {
  return data.tables[key].rows;
}

/** The part-time share of a workplace kind, or the default where it has no row. */
export function partTimeShare(workplaceKey: string): number {
  return (
    (data.townPartTime.shares as Readonly<Record<string, number>>)[
      workplaceKey
    ] ?? data.scalars.townPartTimeDefault.value
  );
}
