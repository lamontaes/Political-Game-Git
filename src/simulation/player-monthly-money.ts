import { makeIsoDate } from "./dates";
import {
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "./future-transitions";
import { LIVING_COSTS_BASIS, settleLivingCosts } from "./cost-of-living";
import { MORTGAGE_BASIS, settleMortgages } from "./home-purchase";
import { settleOfficeSalaries } from "./office-salary";
import { outstandingDebtAt, resourceFlowTermsAt } from "./resource-queries";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  MoneyAmount,
  World,
} from "./types";

export const PLAYER_MONTHLY_MONEY_KEY = "life:player-monthly-money";
const PREFIX = "player-monthly-money:";

/** The existing writers settle these charges on the first of the month.
 * Read their pending review dates; never create a payment or a new bill.
 */
export function playerMoneySchedule(world: World, personId: EntityId) {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return [];
  return world.history.futureDueItems
    .filter(
      (item) =>
        item.transitionKey === PLAYER_MONTHLY_MONEY_KEY &&
        item.entityIds[0] === personId &&
        isPendingFuture(world, item),
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.sequence - b.sequence)
    .map((item) => {
      const bills: { flowId: EntityId; label: string; amount: MoneyAmount }[] =
        [];
      for (const flow of world.history.resourceFlows) {
        if (
          flow.source.kind !== "person" ||
          flow.source.personId !== personId ||
          flow.startsAt >= item.dueAt ||
          (flow.basisKind !== MORTGAGE_BASIS &&
            flow.basisKind !== LIVING_COSTS_BASIS)
        )
          continue;
        const scope = {
          asOfDate: item.dueAt,
          historySequenceExclusive: world.history.nextSequence,
        };
        const terms = resourceFlowTermsAt(world, flow.id, scope);
        if (!terms || terms.status !== "active") continue;
        let amount = terms.amount;
        if (flow.basisKind === MORTGAGE_BASIS) {
          const obligation = world.history.resourceObligations.find(
            (row) => row.resourceFlowId === flow.id,
          );
          if (!obligation) continue;
          const debt = outstandingDebtAt(world, obligation.id, scope);
          if (!debt || debt.minorUnits <= 0) continue;
          amount = {
            ...amount,
            minorUnits: Math.min(amount.minorUnits, debt.minorUnits),
          };
        }
        bills.push({
          flowId: flow.id,
          label:
            flow.basisKind === MORTGAGE_BASIS ? "Mortgage" : "Living costs",
          amount,
        });
      }
      return { dueItemId: item.id, dueAt: item.dueAt, bills };
    });
}

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
