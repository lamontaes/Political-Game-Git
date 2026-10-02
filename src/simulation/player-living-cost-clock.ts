import { initializeLivingCostsFlow, settleLivingCosts } from "./cost-of-living";
import {
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "./future-transitions";
import { monthKeyOf, monthStart, nextMonthKey } from "./macro-economy/store";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
} from "./types";

export const PLAYER_LIVING_COST_MONTH_KEY = "life:player-living-cost-month";
const PREFIX = "player-living-cost-month:";

/** Open the existing household contracts before putting their first month on the clock. */
export function ensurePlayerLivingCostSchedule(
  world: World,
  personId: EntityId,
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    !world.people[personId]
  )
    return world;
  const next = initializeLivingCostsFlow(world, personId);
  if (
    next.history.futureDueItems.some(
      (item) =>
        item.transitionKey === PLAYER_LIVING_COST_MONTH_KEY &&
        item.entityIds[0] === personId &&
        item.dueAt > next.currentDate &&
        futureDueItemStateAt(next, item.id, {
          asOfDate: next.currentDate,
          historySequenceExclusive: next.history.nextSequence,
        })?.status === "scheduled",
    )
  )
    return next;
  const dueAt = monthStart(nextMonthKey(monthKeyOf(next.currentDate)));
  const base = `${PREFIX}${personId}:${dueAt}`;
  const prior = next.history.futureDueItems
    .filter(
      (item) =>
        item.stableKey === base ||
        item.stableKey.startsWith(`${base}:recovery:`),
    )
    .at(-1);
  return scheduleFutureDueItem(next, {
    stableKey: prior ? `${base}:recovery:${prior.id}` : base,
    dueAt,
    transitionKey: PLAYER_LIVING_COST_MONTH_KEY,
    entityIds: [personId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [personId] },
  });
}

export function playerLivingCostMonthHandler(
  world: World,
  item: FutureDueItem,
): FutureTransitionHandlerResult {
  if (item.transitionKey !== PLAYER_LIVING_COST_MONTH_KEY)
    throw new Error("Living costs received another transition.");
  const personId = item.entityIds[0];
  let next = world;
  if (
    personId &&
    world.control.kind === "person" &&
    world.control.personId === personId &&
    world.people[personId]
  ) {
    next = settleLivingCosts(next, personId);
    next = ensurePlayerLivingCostSchedule(next, personId);
  }
  return {
    world: next,
    status: "resolved",
    reasonKey: "player-living-cost-month:settled",
    context: null,
    outcomeEventId: null,
  };
}

/** Construct entries at use time, matching the shared lazy registry contract. */
export function playerLivingCostHandlers() {
  return [
    [PLAYER_LIVING_COST_MONTH_KEY, playerLivingCostMonthHandler],
  ] as const;
}
