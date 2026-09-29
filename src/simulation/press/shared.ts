import type { EntityId } from "../types";

/** Tag carried by every event that belongs to a PRESS46 matter. */
export const PRESS_MATTER_TAG = "press46.matter:";
export const DISBURSEMENT_RECORD_KEY_PREFIX = "press46:disbursement-record:";

export function sortedUnique(ids: readonly EntityId[]): EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

/** A law that changed something for a town's people (law-effect-news.ts). */
export const LAW_EFFECT_EVENT_TYPE = "law.effect-reached-town";
