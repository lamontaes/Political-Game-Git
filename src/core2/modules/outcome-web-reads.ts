import type { CoreAPI } from "../types";
import { OUTCOME_WEB_MODULE_ID } from "../outcome-web-model";
import type { WebMonth } from "./outcome-web";
import type { CoreState } from "../types";
import { scaleOf } from "../outcome-web-model";

/**
 * The outcome web's read doors: the months the web kept for a place. Callers
 * outside the laws engine ask these and never open `core2-outcome-web-v1`.
 * Each door returns the stored rows unchanged and registers nothing.
 */

/** Every web month kept for one place. */
export function webMonthsOfPlace(
  api: CoreAPI,
  placeId: string,
): readonly WebMonth[] {
  return api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly WebMonth[];
}

/** Every web month the world kept, for every place. */
export function allWebMonths(api: CoreAPI): readonly WebMonth[] {
  return api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as readonly WebMonth[];
}

export const store = (api: CoreAPI) => api.moduleState(OUTCOME_WEB_MODULE_ID);

/** A place's record of a measure in the latest month the web ran. */
export function placeOutcome(
  api: CoreAPI,
  placeId: string,
  measure: string,
):
  | {
      value: number;
      base?: number;
      /** The links' push on it this month (a product of factors, or units added for a level). */
      push?: number;
      month: string;
      recordId: string;
      engineRecordId: string | null;
    }
  | undefined {
  // A world without the web (a small test world) has no conditions to read.
  if (!(api.state as CoreState).modules.has(OUTCOME_WEB_MODULE_ID))
    return undefined;
  const rows = store(api)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly WebMonth[];
  const latest = [...rows].sort((a, b) => b.month.localeCompare(a.month))[0];
  const value = latest?.values[measure];
  return latest && value !== undefined
    ? {
        value,
        base: latest.bases[measure],
        ...(latest.pushes?.[measure] !== undefined
          ? { push: latest.pushes[measure] }
          : {}),
        month: latest.month,
        recordId: latest.id,
        engineRecordId: latest.engineSources?.[measure] ?? null,
      }
    : undefined;
}

/**
 * The web's factor on a measure in a place: the multiplier its running links
 * put on the measure's base this month (1 where nothing moves it). An engine
 * that sets the measure itself (births, crime, rents) multiplies by this.
 */
export function outcomeWebFactor(
  api: CoreAPI,
  placeId: string,
  measure: string,
): number {
  const record = placeOutcome(api, placeId, measure);
  if (!record || !record.base) return 1;
  if (scaleOf(measure) === "level") return 1;
  // The links' own push: a level the town's records set is not the web's factor.
  return record.push ?? record.value / record.base;
}
