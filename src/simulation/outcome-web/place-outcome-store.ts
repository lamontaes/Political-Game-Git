import bases from "../../../data/research/outcome-web/place-outcome-bases-2024.json" with { type: "json" };
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
  /**
   * The place's underlying level this month, before laws and conditions:
   * the base in the first month, then drifting (part national, part the
   * state's own) with now and then a society-wide wave. Absent on records
   * written before drift existed, which read as the base.
   */
  readonly structural?: number;
  readonly multiplier: number;
  readonly value: number;
  /** Each outcome-web link that moved it this month, and by how much. */
  readonly causes: readonly { readonly key: string; readonly factor: number }[];
}

/** One month's records for every place, kept together. */
export interface PlaceOutcomeMonth {
  readonly month: IsoDate;
  readonly records: readonly PlaceOutcomeRecord[];
}

/**
 * Month by month, oldest first. Kept as one entry per month so a century of
 * play appends a short list, not every record ever written.
 */
export interface PlaceOutcomeStore {
  readonly months: readonly PlaceOutcomeMonth[];
}

/** Every record in the store, oldest month first. */
export function placeOutcomeRecords(
  world: World,
): readonly PlaceOutcomeRecord[] {
  return (world.placeOutcomes?.months ?? []).flatMap((entry) => entry.records);
}

export interface PlaceOutcomeDrift {
  /** Monthly standard deviation of the level, in log-odds. */
  readonly monthlySdLogit: number;
  /** Share of the drift every place shares in a month (the nation's). */
  readonly nationalShare: number;
  readonly waveMonthlyChance: number;
  readonly waveSdLogit: number;
  readonly minPct: number;
  readonly maxPct: number;
}

export interface PlaceOutcomeMeasureBase {
  readonly name: string;
  readonly unit: string;
  readonly source: string;
  readonly places: Readonly<Record<string, number>>;
  readonly drift?: PlaceOutcomeDrift;
  /**
   * "share" (the default): a percent, drifting in log-odds. "index": a level
   * where 100 is the place's start, drifting in logs; `monthlySdLogit` is
   * then a standard deviation in logs.
   */
  readonly scale?: "share" | "index";
}

export const PLACE_OUTCOME_BASES = bases.measures as Readonly<
  Record<string, PlaceOutcomeMeasureBase>
>;

/** Drift for a measure that names none. */
export const DEFAULT_PLACE_OUTCOME_DRIFT =
  bases.defaultDrift as PlaceOutcomeDrift;

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
  const months = world.placeOutcomes?.months ?? [];
  for (let index = months.length - 1; index >= 0; index -= 1) {
    const entry = months[index]!;
    if (entry.month > asOf) continue;
    const record = entry.records.find(
      (row) => row.measure === measure && row.placeKey === key,
    );
    if (record) return record;
  }
  return null;
}
