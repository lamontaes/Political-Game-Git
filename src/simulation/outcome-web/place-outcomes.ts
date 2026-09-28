import { addDays, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { stateJurisdictionForKey } from "../life-places";
import type {
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { worldOpeningVersionOf } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { outcomeFactor } from ".";
import {
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
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

/**
 * Each place outcome for every place with a base, for the month starting
 * `month`: its 2024 base times the outcome web's multiplier for that place
 * and month, with the links that moved it.
 */
export function placeOutcomesForMonth(
  world: World,
  month: IsoDate,
): readonly PlaceOutcomeRecord[] {
  const records: PlaceOutcomeRecord[] = [];
  for (const measure of PLACE_OUTCOME_MEASURES) {
    const places = PLACE_OUTCOME_BASES[measure]!.places;
    for (const [placeKey, base] of Object.entries(places)) {
      const jurisdictionId = stateJurisdictionForKey(placeKey)?.id;
      if (!jurisdictionId) continue;
      const reading = outcomeFactor(world, jurisdictionId, measure, month);
      records.push({
        measure,
        placeKey,
        jurisdictionId,
        month,
        base,
        multiplier: reading.multiplier,
        value: Math.round(base * reading.multiplier * 100) / 100,
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
      records: placeOutcomesForMonth(
        world,
        firstOfMonth(makeIsoDate(world.currentDate)),
      ),
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
  const already = (world.placeOutcomes?.records ?? []).some(
    (record) => record.month === month,
  );
  let next: World = already
    ? world
    : {
        ...world,
        placeOutcomes: {
          records: [
            ...(world.placeOutcomes?.records ?? []),
            ...placeOutcomesForMonth(world, month),
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
