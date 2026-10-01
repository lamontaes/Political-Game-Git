import { makeIsoDate } from "./dates";
import {
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "./future-transitions";
import { settleLivingCosts } from "./cost-of-living";
import { settleMortgages } from "./home-purchase";
import { settleOfficeSalaries } from "./office-salary";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "./types";

export const PLAYER_MONTHLY_MONEY_KEY = "life:player-monthly-money";
const PREFIX = "player-monthly-money:";

function nextFirst(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

function schedule(world: World, personId: EntityId, dueAt: IsoDate): World {
  const baseKey = `${PREFIX}${personId}:${dueAt}`;
  const previous = world.history.futureDueItems.filter(
    (item) =>
      item.stableKey === baseKey ||
      item.stableKey.startsWith(`${baseKey}:recovery:`),
  );
  if (previous.some((item) => isPendingFuture(world, item))) return world;
  const last = previous.at(-1);
  const stableKey = last ? `${baseKey}:recovery:${last.id}` : baseKey;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt,
    transitionKey: PLAYER_MONTHLY_MONEY_KEY,
    entityIds: [personId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [personId] },
  });
}

function isPendingFuture(world: World, item: FutureDueItem): boolean {
  return (
    item.dueAt > world.currentDate &&
    futureDueItemStateAt(world, item.id, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    })?.status === "scheduled"
  );
}

/** Schedule only. Missing initial money flows require their owning producer. */
export function ensurePlayerMonthlyMoneySchedule(
  world: World,
  personId: EntityId,
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    !world.people[personId]
  )
    return world;
  const prefix = `${PREFIX}${personId}:`;
  if (
    world.history.futureDueItems.some(
      (item) =>
        item.transitionKey === PLAYER_MONTHLY_MONEY_KEY &&
        item.stableKey.startsWith(prefix) &&
        isPendingFuture(world, item),
    )
  )
    return world;
  return schedule(world, personId, nextFirst(world.currentDate));
}

export function playerMonthlyMoneyHandler(
  world: World,
  item: FutureDueItem,
): FutureTransitionHandlerResult {
  if (item.transitionKey !== PLAYER_MONTHLY_MONEY_KEY)
    throw new Error("Player monthly money received another transition.");
  const personId = item.entityIds[0];
  let next = world;
  if (
    personId &&
    world.control.kind === "person" &&
    world.control.personId === personId &&
    world.people[personId]
  ) {
    next = settleOfficeSalaries(next, personId);
    next = settleMortgages(next, personId);
    next = settleLivingCosts(next, personId);
    next = schedule(next, personId, nextFirst(next.currentDate));
  }
  return {
    world: next,
    status: "resolved",
    reasonKey: "player-monthly-money:reviewed",
    context: null,
    outcomeEventId: null,
  };
}

export const PLAYER_MONTHLY_MONEY_HANDLERS = [
  [PLAYER_MONTHLY_MONEY_KEY, playerMonthlyMoneyHandler],
] as const;
