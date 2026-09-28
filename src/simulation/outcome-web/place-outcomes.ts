import { addDays, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { stateJurisdictionForKey } from "../life-places";
import type {
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { SeededRng } from "../rng";
import { standardNormal } from "../world-setup/deterministic-math";
import { worldOpeningVersionOf } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { outcomeFactor } from ".";
import {
  DEFAULT_PLACE_OUTCOME_DRIFT,
  driftsInLogs,
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
  type PlaceOutcomeDrift,
  type PlaceOutcomeRecord,
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

function logit(pct: number): number {
  const p = pct / 100;
  return Math.log(p / (1 - p));
}

function fromLogit(value: number): number {
  return 100 / (1 + Math.exp(-value));
}

/**
 * One month's move in a measure's underlying level for every place, in
 * log-odds: a national part every place shares, a part of the place's own,
 * and now and then a society-wide wave (national, so every place feels it).
 * A world with no seed (a fixture) does not drift.
 */
function driftSteps(
  world: World,
  measure: string,
  month: IsoDate,
  drift: PlaceOutcomeDrift,
): (placeKey: string) => number {
  if (!world.seed) return () => 0;
  const rng = new SeededRng(world.seed).fork(
    `${PLACE_OUTCOMES_VERSION}:drift:${measure}:${month}`,
  );
  const sd = drift.monthlySdLogit;
  const national =
    standardNormal(rng.fork("national")) * sd * Math.sqrt(drift.nationalShare);
  const wave =
    rng.fork("wave").next() < drift.waveMonthlyChance
      ? standardNormal(rng.fork("wave-size")) * drift.waveSdLogit
      : 0;
  return (placeKey) =>
    national +
    wave +
    standardNormal(rng.fork(`place:${placeKey}`)) *
      sd *
      Math.sqrt(1 - drift.nationalShare);
}

/**
 * Each place outcome for every place with a base, for the month starting
 * `month`. The place's underlying level carries on from its last record
 * (the 2024 base in its first month) and drifts; nothing pulls it back to
 * the base. Laws and conditions then act on it through the outcome web's
 * multiplier, and the links that moved it are kept. `measures` narrows the
 * pass to some outcomes (a test of one measure over a century); play records
 * them all.
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
  for (const measure of measures) {
    const definition = PLACE_OUTCOME_BASES[measure]!;
    const drift = definition.drift ?? DEFAULT_PLACE_OUTCOME_DRIFT;
    const step = driftSteps(world, measure, month, drift);
    for (const [placeKey, base] of Object.entries(definition.places)) {
      const jurisdictionId = stateJurisdictionForKey(placeKey)?.id;
      if (!jurisdictionId) continue;
      const last = previous.get(`${measure}|${placeKey}`);
      const before = last ? (last.structural ?? last.base) : base;
      const moved = driftsInLogs(definition)
        ? before * Math.exp(step(placeKey))
        : fromLogit(logit(before) + step(placeKey));
      const structural = last
        ? Math.min(drift.maxPct, Math.max(drift.minPct, moved))
        : base;
      const reading = outcomeFactor(world, jurisdictionId, measure, month);
      records.push({
        measure,
        placeKey,
        jurisdictionId,
        month,
        base,
        structural: Math.round(structural * 10000) / 10000,
        multiplier: reading.multiplier,
        value: Math.round(structural * reading.multiplier * 100) / 100,
        causes: reading.causes
          .filter((cause) => cause.factor !== 1)
          .map((cause) => ({ key: cause.key, factor: cause.factor })),
      });
    }
  }
  return records;
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
