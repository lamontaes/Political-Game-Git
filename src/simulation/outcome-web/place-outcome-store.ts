import bases from "../../../data/research/outcome-web/place-outcome-bases-2024.json" with { type: "json" };
import { countyGeoidsForPlace } from "../government-units";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { placePopulation } from "../nationwide-world/place-population";
import { STATES } from "../state-reference";
import type { EntityId, IsoDate, World } from "../types";
import { AREA_RESIDENTS_ROWS } from "./area-residents.generated";

/**
 * PLACE OUTCOMES: the outcomes the world keeps for each state, D.C. and
 * Puerto Rico, month by month (04 SYSTEM SPECS part 4). Each starts at its
 * real 2024 level (`data/research/outcome-web/place-outcome-bases-2024.json`)
 * and moves only through the outcome web. A place with no base records
 * nothing: unknown, never zero.
 *
 * A city or county keeps its own outcomes once its own government has
 * enacted a law (one rule for every place): the same underlying level as its
 * state, moved by the outcome web as read in that place, so its ordinances
 * count there. Until then it reads its state's. The state's value is the
 * average of its places, weighted by residents: each city or county with its
 * own record at its share, the rest of the state at the state's own.
 */

export interface PlaceOutcomeRecord {
  readonly measure: string;
  /**
   * `US-XX` for a state; for a city or county with its own record, its place
   * key (a 7-digit Census place GEOID, or `county:` and a county GEOID).
   */
  readonly placeKey: string;
  readonly jurisdictionId: EntityId;
  /**
   * On a city's or county's own record: the `US-XX` of its state, whose
   * underlying level it shares. Absent on a state's record.
   */
  readonly stateKey?: string;
  /**
   * On a city's or county's own record: its share of its state's residents,
   * or null where either count is unknown (then the state's value leaves it
   * out rather than guess). Absent on a state's record.
   */
  readonly weight?: number | null;
  /**
   * On a state's record: each city or county with its own record that month,
   * at its share of the state's residents and its own multiplier. The state's
   * `multiplier` is the weighted average of these and its own. Absent when no
   * place in the state keeps its own.
   */
  readonly places?: readonly PlaceOutcomeShare[];
  /**
   * On a state's record with `places`: its own multiplier and value, for the
   * rest of the state. A town keeping no record of its own reads these, so one
   * city's ordinance never reaches its neighbors through the state's average.
   */
  readonly restMultiplier?: number;
  readonly restValue?: number;
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

/** A city's or county's part in its state's value. */
export interface PlaceOutcomeShare {
  readonly placeKey: string;
  readonly weight: number;
  readonly multiplier: number;
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
   * then a standard deviation in logs. "rate": a level in the measure's own
   * unit (crimes per 100,000 people, micrograms per cubic meter), drifting in
   * logs like an index; `minPct` and `maxPct` are then bounds in that unit.
   * "level": a number in the measure's own unit that can sit at or below
   * zero (a state's borrowing cost over the best-rated states, where a AAA
   * state starts at 0). It drifts by adding each month's step
   * (`monthlySdLogit` is then a standard deviation in that unit), and a link
   * adds to it rather than multiplying it: a factor of 1.4 adds 0.4 of the
   * unit, since no multiplier moves a zero and a negative one would reverse.
   */
  readonly scale?: "share" | "index" | "rate" | "level";
  /** How a value reads in a report: "per 10,000 people". Shares read as %. */
  readonly shortUnit?: string;
  /**
   * An older index measure (100 at the start) this one replaces. A save made
   * before the change carries its level forward from that index, so the
   * place does not snap back to its base.
   */
  readonly replaces?: string;
}

/** Whether a measure drifts in logs (an index or a rate), not log-odds. */
export function driftsInLogs(definition: PlaceOutcomeMeasureBase): boolean {
  return definition.scale === "index" || definition.scale === "rate";
}

/**
 * A place's value this month from its underlying level and the outcome web's
 * causes: the level times their product, or for a level measure, the level
 * plus each cause's own excess over 1 (see `scale`).
 */
export function placeOutcomeValue(
  definition: PlaceOutcomeMeasureBase,
  structural: number,
  multiplier: number,
  factors: readonly number[],
): number {
  return definition.scale === "level"
    ? factors.reduce((total, factor) => total + (factor - 1), structural)
    : structural * multiplier;
}

/** A value as a report writes it: "16.7%", "412.3 per 100,000 people". */
export function placeOutcomeValueText(
  definition: PlaceOutcomeMeasureBase,
  value: number,
): string {
  if (definition.scale === "index") return `${value}`;
  if (definition.scale === "rate" || definition.scale === "level")
    return definition.shortUnit
      ? `${value} ${definition.shortUnit}`
      : `${value}`;
  return `${value}%`;
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

/**
 * A city's or county's own key in the store: its 7-digit Census place GEOID
 * or `county:` and its county GEOID, or its life-place key where it has no
 * Census identity. Null for a state, D.C. (governed as one place), the
 * United States, and a jurisdiction the game does not place.
 */
export function localOutcomeKey(jurisdictionId: EntityId): string | null {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  if (!place || place.scope === "state" || !place.stateJurisdictionKey)
    return null;
  if (place.stateJurisdictionKey === "US-DC") return null;
  if (place.scope === "county") return place.key;
  return place.sourceGeoid ?? place.key;
}

let residentsByArea: ReadonlyMap<string, number> | null = null;

/** Residents of a state (`US-XX`) or county (5-digit GEOID), or null. */
export function areaResidents(key: string): number | null {
  residentsByArea ??= new Map(
    AREA_RESIDENTS_ROWS.split(";").map((pair): [string, number] => {
      const colon = pair.indexOf(":");
      return [pair.slice(0, colon), Number(pair.slice(colon + 1))];
    }),
  );
  return residentsByArea.get(key) ?? null;
}

/** A city's or county's residents, or null where the game does not hold it. */
export function localResidents(localKey: string): number | null {
  if (localKey.startsWith("county:"))
    return areaResidents(localKey.slice("county:".length));
  return /^\d{7}$/.test(localKey) ? placePopulation(localKey) : null;
}

/**
 * Each place's share of its state's residents, for the places keeping their
 * own records in one state. A county's share leaves out the residents of any
 * city keeping its own record whose largest part lies in it, so no one is
 * counted twice. PLACEHOLDER: a city across several counties is placed whole
 * in its largest. Null where a count is unknown.
 */
export function localWeights(
  stateKey: string,
  localKeys: readonly string[],
): ReadonlyMap<string, number | null> {
  const state = areaResidents(stateKey);
  const weights = new Map<string, number | null>();
  const counties = new Set(
    localKeys.filter((key) => key.startsWith("county:")),
  );
  const inCounty = new Map<string, number>();
  if (counties.size > 0) {
    for (const key of localKeys) {
      if (key.startsWith("county:")) continue;
      const county = /^\d{7}$/.test(key) ? countyGeoidsForPlace(key)[0] : null;
      const people = localResidents(key);
      if (!county || people === null || !counties.has(`county:${county}`))
        continue;
      inCounty.set(county, (inCounty.get(county) ?? 0) + people);
    }
  }
  for (const key of localKeys) {
    const people = localResidents(key);
    if (state === null || state <= 0 || people === null) {
      weights.set(key, null);
      continue;
    }
    const own = key.startsWith("county:")
      ? Math.max(0, people - (inCounty.get(key.slice("county:".length)) ?? 0))
      : people;
    weights.set(key, own / state);
  }
  // Counts from different years can overshoot; the places never outweigh
  // their state.
  const total = [...weights.values()].reduce<number>(
    (sum, weight) => sum + (weight ?? 0),
    0,
  );
  if (total > 1)
    for (const [key, weight] of weights)
      if (weight !== null) weights.set(key, weight / total);
  return weights;
}

/**
 * The latest recorded value of a place outcome as of a date, or null. A city
 * or county reads its own record where it keeps one that month, and otherwise
 * the rest of its state: the state's own value, without the places averaged
 * into it.
 */
export function placeOutcomeAt(
  world: World,
  measure: string,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): PlaceOutcomeRecord | null {
  const key = placeOutcomeKey(jurisdictionId);
  if (!key) return null;
  const local = localOutcomeKey(jurisdictionId);
  const months = world.placeOutcomes?.months ?? [];
  for (let index = months.length - 1; index >= 0; index -= 1) {
    const entry = months[index]!;
    if (entry.month > asOf) continue;
    const own =
      local === null
        ? undefined
        : entry.records.find(
            (row) => row.measure === measure && row.placeKey === local,
          );
    if (own) return own;
    const record = entry.records.find(
      (row) => row.measure === measure && row.placeKey === key,
    );
    if (record && local !== null && record.places) {
      const rest: PlaceOutcomeRecord = {
        ...record,
        multiplier: record.restMultiplier ?? record.multiplier,
        value: record.restValue ?? record.value,
      };
      delete (rest as { places?: unknown }).places;
      return rest;
    }
    if (record) return record;
  }
  return null;
}
