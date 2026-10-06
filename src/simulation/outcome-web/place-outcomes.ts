import { addDays, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { stateJurisdictionForKey } from "../life-places";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { worldOpeningVersionOf } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { outcomeFactor, outcomeRangeViolations } from ".";
import {
  DEFAULT_PLACE_OUTCOME_DRIFT,
  localOutcomeKey,
  localWeights,
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
  placeOutcomeKey,
  placeOutcomeValue,
  type PlaceOutcomeRecord,
  type PlaceOutcomeShare,
} from "./place-outcome-store";

export * from "./place-outcome-store";

export const PLACE_OUTCOMES_VERSION = "place-outcomes-v1" as const;
export const PLACE_OUTCOMES_TRANSITION_KEY = "crisis:place-outcomes" as const;

function firstOfMonth(date: IsoDate): IsoDate {
  return makeIsoDate(`${date.slice(0, 7)}-01`);
}

function firstOfNextMonth(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

interface LocalPlace {
  readonly localKey: string;
  readonly jurisdictionId: EntityId;
  readonly weight: number | null;
}

/**
 * The cities and counties keeping their own outcomes in `month`, by state:
 * every one whose own government enacted a law before the month began. One
 * rule for every place; a place the game cannot put in a state is left out.
 */
export function localOutcomePlaces(
  world: World,
  month: IsoDate,
): ReadonlyMap<string, readonly LocalPlace[]> {
  const jurisdictionOf = new Map<EntityId, EntityId>(
    (world.history?.legislativeMeasures ?? []).map((measure) => [
      measure.id,
      measure.jurisdictionId,
    ]),
  );
  const found = new Map<string, Map<string, EntityId>>();
  for (const enactment of world.history?.legislativeEnactments ?? []) {
    if (enactment.outcome !== "enacted" || enactment.resolvedAt > month)
      continue;
    const jurisdictionId = jurisdictionOf.get(enactment.measureId);
    if (!jurisdictionId) continue;
    const localKey = localOutcomeKey(jurisdictionId);
    const stateKey = localKey ? placeOutcomeKey(jurisdictionId) : null;
    if (!localKey || !stateKey) continue;
    const inState = found.get(stateKey) ?? new Map<string, EntityId>();
    inState.set(localKey, jurisdictionId);
    found.set(stateKey, inState);
  }
  const places = new Map<string, readonly LocalPlace[]>();
  for (const [stateKey, inState] of found) {
    const keys = [...inState.keys()].sort();
    const weights = localWeights(stateKey, keys);
    places.set(
      stateKey,
      keys.map((localKey) => ({
        localKey,
        jurisdictionId: inState.get(localKey)!,
        weight: weights.get(localKey) ?? null,
      })),
    );
  }
  return places;
}

/**
 * Each place outcome for every place with a base, for the month starting
 * `month`. The place's underlying level carries on from its last record
 * (the 2024 base in its first month) and does not move on its own: no dice,
 * no monthly noise, no society-wide wave. A place's value changes only when
 * the outcome web's multiplier does, that is when a law, a condition or a
 * dated, recorded crisis that a built link names changes, and the links that
 * moved it are kept. Nothing pulls a place back to its base either, so a
 * cause that has ended leaves the place wherever the web last put it.
 * `measures` narrows the pass to some outcomes (a test of one measure over a
 * century); play records them all.
 *
 * A city or county keeping its own outcomes (`localOutcomePlaces`) gets its
 * own record: its state's level, moved by the web as read in that place, so
 * its own ordinances act there. RECORDED INHERITANCE RULE: a city starts at
 * its state's sourced level until a city-level base is recorded. The state's
 * record then weighs those places in by residents.
 */
export function placeOutcomesForMonth(
  world: World,
  month: IsoDate,
  measures: readonly string[] = PLACE_OUTCOME_MEASURES,
): readonly PlaceOutcomeRecord[] {
  const records: PlaceOutcomeRecord[] = [];
  const previous = new Map<string, PlaceOutcomeRecord>();
  const months = world.placeOutcomes?.months ?? [];
  // The latest month before this one carries each place's level forward.
  for (let index = months.length - 1; index >= 0; index -= 1) {
    const entry = months[index]!;
    if (entry.month >= month) continue;
    for (const record of entry.records)
      previous.set(`${record.measure}|${record.placeKey}`, record);
    break;
  }
  const locals = localOutcomePlaces(world, month);
  for (const measure of measures) {
    const definition = PLACE_OUTCOME_BASES[measure]!;
    const bounds = definition.drift ?? DEFAULT_PLACE_OUTCOME_DRIFT;
    for (const [placeKey, base] of Object.entries(definition.places)) {
      const jurisdictionId = stateJurisdictionForKey(placeKey)?.id;
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
      const reading = outcomeFactor(world, jurisdictionId, measure, month);
      // A level measure adds each cause's excess over 1; the others multiply.
      const valueOf = (read: ReturnType<typeof outcomeFactor>) =>
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
        const own = outcomeFactor(world, local.jurisdictionId, measure, month);
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
          rangeViolations: outcomeRangeViolations(own),
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
        rangeViolations: outcomeRangeViolations(reading),
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
  causes: ReturnType<typeof outcomeFactor>["causes"],
): PlaceOutcomeRecord["causes"] {
  return causes
    .filter((cause) => cause.factor !== 1)
    .map((cause) => ({ key: cause.key, factor: cause.factor }));
}

/** Schedules the first monthly pass for a current opening. Idempotent. */
export function ensurePlaceOutcomes(world: World): World {
  if (worldOpeningVersionOf(world) !== CRUNCH46_WORLD_OPENING_VERSION)
    return world;
  if (
    world.history.futureDueItems.some(
      (item) => item.transitionKey === PLACE_OUTCOMES_TRANSITION_KEY,
    )
  )
    return world;
  // The opening month is recorded now, so a new game already knows where
  // every place stands.
  const opened: World = {
    ...world,
    placeOutcomes: {
      months: [
        {
          month: firstOfMonth(makeIsoDate(world.currentDate)),
          records: placeOutcomesForMonth(
            world,
            firstOfMonth(makeIsoDate(world.currentDate)),
          ),
        },
      ],
    },
  };
  const dueAt = firstOfNextMonth(makeIsoDate(world.currentDate));
  return scheduleFutureDueItem(opened, {
    stableKey: `${PLACE_OUTCOMES_VERSION}:pass:${dueAt.slice(0, 7)}`,
    dueAt,
    transitionKey: PLACE_OUTCOMES_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: PLACE_OUTCOMES_VERSION },
  });
}

export function placeOutcomesHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PLACE_OUTCOMES_TRANSITION_KEY) {
    throw new Error("The place-outcomes pass received another transition.");
  }
  const month = firstOfMonth(makeIsoDate(dueItem.dueAt));
  const already = (world.placeOutcomes?.months ?? []).some(
    (entry) => entry.month === month,
  );
  let next: World = already
    ? world
    : {
        ...world,
        placeOutcomes: {
          months: [
            ...(world.placeOutcomes?.months ?? []),
            { month, records: placeOutcomesForMonth(world, month) },
          ],
        },
      };
  const following = firstOfNextMonth(addDays(month, 1));
  next = scheduleFutureDueItem(next, {
    stableKey: `${PLACE_OUTCOMES_VERSION}:pass:${following.slice(0, 7)}`,
    dueAt: following,
    transitionKey: PLACE_OUTCOMES_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: already ? "place-outcomes:already" : "place-outcomes:recorded",
    context: null,
    outcomeEventId: null,
  };
}
