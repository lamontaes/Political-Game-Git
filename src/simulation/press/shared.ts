import type { EntityId } from "../types";

/** Tag carried by every event that belongs to a PRESS46 matter. */
export const PRESS_MATTER_TAG = "press46.matter:";

export function sortedUnique(ids: readonly EntityId[]): EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}
