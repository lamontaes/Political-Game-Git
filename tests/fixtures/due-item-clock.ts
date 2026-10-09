import { composeWorldTimeHandlers } from "../../src/simulation/campaigns";
import { makeIsoDate } from "../../src/simulation/dates";
import { resolveFutureDueItemsThrough } from "../../src/simulation/future-transitions";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../../src/simulation/types";

/**
 * Test fixture: move a World to a date by resolving only the due items that
 * fall on the way, through the canonical due-item resolver and the same
 * handler registry a passed day composes (`composeWorldTimeHandlers`).
 *
 * The engine still decides everything that happens on the way: a filing
 * closes, an election is counted, a seat changes hands, a petition closes, by
 * the handlers that own them. What this skips is the per-day life pass a
 * player's clock adds on top (`passOrdinaryDays`), which costs about a minute
 * per thirty days and decides nothing these tests read. The World's date is
 * the last resolved item's, as the resolver leaves it.
 */
export function resolveDueThrough(
  world: World,
  date: string,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  if (world.currentDate >= date) return world;
  return resolveFutureDueItemsThrough(
    world,
    makeIsoDate(date),
    composeWorldTimeHandlers(handlers),
  );
}

/**
 * Resolve due items through the day of this person's latest contest, so the
 * engine counts it and seats the winner.
 */
export function resolveThroughOwnElection(
  world: World,
  personId: EntityId,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  const contest = [...(world.history.electionContests ?? [])]
    .reverse()
    .find((row) => row.candidatePersonIds.includes(personId));
  if (!contest) throw new Error(`${personId} is in no contest.`);
  return resolveDueThrough(world, contest.electionDate, handlers);
}

/**
 * Test fixture: set the date a legislative-day fixture needs, after resolving
 * whatever fell due on the way. A scenario world starts with its crisis
 * mortality window due on its first day, and a bare date change leaves that
 * item behind, which world integrity then refuses ("skipped by authoritative
 * time"). This resolves due items through the registry a passed day composes
 * and then states the date asked for.
 */
export function jumpToDate(world: World, date: string): World {
  const target = makeIsoDate(date);
  const resolved = resolveDueThrough(world, target);
  return resolved.currentDate === target
    ? resolved
    : {
        ...resolved,
        currentDate: target,
        currentMoment: { ...resolved.currentMoment, date: target },
      };
}
