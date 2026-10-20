/**
 * What the school engine records each year, read back by other engines. Kept
 * free of the outcome web's imports so the web can read it without a cycle.
 */
import type { CoreAPI, CoreState } from "./types";

export const SCHOOL_MODULE_ID = "core2-school-days-v1";

/** One place's measure for one school year (percent for a share, dollars for spending). */
export interface SchoolMeasureRow {
  readonly id: string;
  readonly placeId: string;
  readonly startYear: number;
  readonly date: string;
  readonly measure: string;
  readonly value: number;
  /** Real students the measure stands on (full people plus counted weights). */
  readonly students: number;
  readonly passed: number;
  /** The place's expected count: its base times the web's factors, by income fifth. */
  readonly expected: number;
  /** The web month row the factors stood on. */
  readonly webRecordId: string | null;
  /** The budgets a spending measure stands on. */
  readonly budgetIds?: readonly string[];
}

/** The latest yearly measure the school engine kept for a place, or null where it has none yet. */
export function schoolMeasure(
  api: CoreAPI,
  placeId: string,
  measure: string,
): { value: number; recordId: string } | null {
  if (!(api.state as CoreState).modules.has(SCHOOL_MODULE_ID)) return null;
  let latest: SchoolMeasureRow | null = null;
  for (const row of api
    .moduleState(SCHOOL_MODULE_ID)
    .table("measures")
    .query("byPlace", [placeId]) as unknown as readonly SchoolMeasureRow[])
    if (
      row.measure === measure &&
      (!latest || row.startYear > latest.startYear)
    )
      latest = row;
  return latest ? { value: latest.value, recordId: latest.id } : null;
}
