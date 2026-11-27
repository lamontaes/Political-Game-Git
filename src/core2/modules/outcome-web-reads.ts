import type { CoreAPI } from "../types";
import type { WebMonth } from "./outcome-web";

/** The outcome web's module id; outcome-web-model.ts re-exports it. */
export const OUTCOME_WEB_MODULE_ID = "core2-outcome-web-v1";

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
