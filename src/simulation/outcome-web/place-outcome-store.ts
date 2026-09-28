import bases from "../../../data/research/outcome-web/place-outcome-bases-2024.json";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { STATES } from "../state-reference";
import type { EntityId, IsoDate, World } from "../types";

/**
 * PLACE OUTCOMES: the outcomes the world keeps for each state, D.C. and
 * Puerto Rico, month by month (04 SYSTEM SPECS part 4). Each starts at its
 * real 2024 level (`data/research/outcome-web/place-outcome-bases-2024.json`)
 * and moves only through the outcome web. A town reads its state's value.
 * A place with no base records nothing: unknown, never zero.
 */

export interface PlaceOutcomeRecord {
  readonly measure: string;
  /** `US-XX`. */
  readonly placeKey: string;
  readonly jurisdictionId: EntityId;
  /** The first day of the month the value holds for. */
  readonly month: IsoDate;
  readonly base: number;
  readonly multiplier: number;
  readonly value: number;
  /** Each outcome-web link that moved it this month, and by how much. */
  readonly causes: readonly { readonly key: string; readonly factor: number }[];
}

export interface PlaceOutcomeStore {
  readonly records: readonly PlaceOutcomeRecord[];
}

export interface PlaceOutcomeMeasureBase {
  readonly name: string;
  readonly unit: string;
  readonly source: string;
  readonly places: Readonly<Record<string, number>>;
}

export const PLACE_OUTCOME_BASES = bases.measures as Readonly<
  Record<string, PlaceOutcomeMeasureBase>
>;

/** The place outcomes the world computes. */
export const PLACE_OUTCOME_MEASURES: readonly string[] =
  Object.keys(PLACE_OUTCOME_BASES);

let keysByJurisdiction: ReadonlyMap<EntityId, string> | null = null;

/** The `US-XX` key of a state, or of the state a town lies in. */
export function placeOutcomeKey(jurisdictionId: EntityId): string | null {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  if (place?.stateJurisdictionKey) return place.stateJurisdictionKey;
  // Built on first use: the places it reads are not ready while modules load.
  keysByJurisdiction ??= new Map(
    Object.keys(STATES).flatMap((usps): [EntityId, string][] => {
      const id = stateJurisdictionForKey(`US-${usps}`)?.id;
      return id ? [[id, `US-${usps}`]] : [];
    }),
  );
  return keysByJurisdiction.get(jurisdictionId) ?? null;
}

/** The latest recorded value of a place outcome as of a date, or null. */
export function placeOutcomeAt(
  world: World,
  measure: string,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): PlaceOutcomeRecord | null {
  const key = placeOutcomeKey(jurisdictionId);
  if (!key) return null;
  const records = world.placeOutcomes?.records ?? [];
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index]!;
    if (
      record.measure === measure &&
      record.placeKey === key &&
      record.month <= asOf
    )
      return record;
  }
  return null;
}
