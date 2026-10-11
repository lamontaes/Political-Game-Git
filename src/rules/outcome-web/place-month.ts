import {
  placeOutcomeValue,
  type PlaceOutcomeMeasureBase,
  type PlaceOutcomeDrift,
} from "./place-values";
import type { OutcomeFactorReading } from "./outcome-factor";
import type { RangeViolation as OutcomeRangeViolation } from "./outcome-readers";
type EntityId = string;
type IsoDate = string;
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
   * the base in the first month, then carried on unchanged (it no longer
   * moves by chance). Absent on records written before the level was kept,
   * which read as the base.
   */
  readonly structural?: number;
  readonly multiplier: number;
  readonly value: number;
  /** Each outcome-web link that moved it this month, and by how much. */
  readonly causes: readonly { readonly key: string; readonly factor: number }[];
  /** Table range violations from the completed calculation; no clipping. */
  readonly rangeViolations?: readonly OutcomeRangeViolation[];
}

export interface PlaceOutcomeShare {
  readonly placeKey: string;
  readonly weight: number;
  readonly multiplier: number;
}

export interface PlaceMonthFacts {
  readonly bases: Readonly<Record<string, PlaceOutcomeMeasureBase>>;
  readonly defaultDrift: PlaceOutcomeDrift;
  /** Exactly the latest whole month before this month, not per-measure backfill. */ readonly previousRecords: readonly PlaceOutcomeRecord[];
  readonly locals: ReadonlyMap<
    string,
    readonly {
      readonly jurisdictionId: string;
      readonly localKey: string;
      readonly weight: number | null;
    }[]
  >;
  readonly jurisdictionId: (placeKey: string) => string | null;
  readonly outcomeFactor: (
    jurisdictionId: string,
    measure: string,
    month: string,
  ) => OutcomeFactorReading;
  readonly rangeViolations: (
    reading: OutcomeFactorReading,
  ) => readonly OutcomeRangeViolation[];
}
export function placeOutcomesForMonthFromFacts(
  facts: PlaceMonthFacts,
  month: IsoDate,
  measures: readonly string[] = Object.keys(facts.bases),
): readonly PlaceOutcomeRecord[] {
  const records: PlaceOutcomeRecord[] = [];
  const previous = new Map(
    facts.previousRecords.map((record) => [
      record.measure + "|" + record.placeKey,
      record,
    ]),
  );
  const locals = facts.locals;
  for (const measure of measures) {
    const definition = facts.bases[measure]!;
    const bounds = definition.drift ?? facts.defaultDrift;
    for (const [placeKey, base] of Object.entries(definition.places)) {
      const jurisdictionId = facts.jurisdictionId(placeKey);
      if (!jurisdictionId) continue;
      const last = previous.get(`${measure}|${placeKey}`);
      // A save from before this measure replaced an index carries on from
      // that index's level, as a ratio to where the place began.
      const replaced =
        last || !definition.replaces
          ? undefined
          : previous.get(`${definition.replaces}|${placeKey}`);
      const before = last
        ? (last.structural ?? last.base)
        : replaced
          ? (base * (replaced.structural ?? replaced.base)) / replaced.base
          : base;
      // The level carries over unchanged; only a carried-over index ratio can
      // land outside the measure's plausible range, so it is held inside it.
      const structural =
        last || replaced
          ? Math.min(bounds.maxPct, Math.max(bounds.minPct, before))
          : base;
      const reading = facts.outcomeFactor(jurisdictionId, measure, month);
      // A level measure adds each cause's excess over 1; the others multiply.
      const valueOf = (read: OutcomeFactorReading) =>
        placeOutcomeValue(
          definition,
          structural,
          read.multiplier,
          read.causes.map((cause) => cause.factor),
        );
      const shares: PlaceOutcomeShare[] = [];
      const localValues: number[] = [];
      const localRecords: PlaceOutcomeRecord[] = [];
      for (const local of locals.get(placeKey) ?? []) {
        const own = facts.outcomeFactor(local.jurisdictionId, measure, month);
        localRecords.push({
          measure,
          placeKey: local.localKey,
          jurisdictionId: local.jurisdictionId,
          stateKey: placeKey,
          weight: local.weight,
          month,
          base,
          structural: Math.round(structural * 10000) / 10000,
          multiplier: own.multiplier,
          value: Math.round(valueOf(own) * 100) / 100,
          causes: movedBy(own.causes),
          rangeViolations: facts.rangeViolations(own),
        });
        if (local.weight !== null) {
          shares.push({
            placeKey: local.localKey,
            weight: local.weight,
            multiplier: own.multiplier,
          });
          localValues.push(local.weight * valueOf(own));
        }
      }
      // The state is the average of its places: those keeping their own at
      // their share of residents, the rest of the state at its own.
      const rest = 1 - shares.reduce((sum, share) => sum + share.weight, 0);
      const multiplier = shares.reduce(
        (sum, share) => sum + share.weight * share.multiplier,
        rest * reading.multiplier,
      );
      const value = localValues.reduce(
        (sum, part) => sum + part,
        rest * valueOf(reading),
      );
      records.push({
        measure,
        placeKey,
        jurisdictionId,
        month,
        base,
        structural: Math.round(structural * 10000) / 10000,
        multiplier,
        value: Math.round(value * 100) / 100,
        causes: movedBy(reading.causes),
        rangeViolations: facts.rangeViolations(reading),
        ...(shares.length
          ? {
              places: shares,
              restMultiplier: reading.multiplier,
              restValue: Math.round(valueOf(reading) * 100) / 100,
            }
          : {}),
      });
      records.push(...localRecords);
    }
  }
  return records;
}

function movedBy(
  causes: OutcomeFactorReading["causes"],
): PlaceOutcomeRecord["causes"] {
  return causes
    .filter((cause) => cause.factor !== 1)
    .map((cause) => ({ key: cause.key, factor: cause.factor }));
}
