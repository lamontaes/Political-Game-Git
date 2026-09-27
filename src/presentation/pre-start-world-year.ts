import { compareSimulationMoments, daysBetween } from "../simulation/dates";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { isPersonAliveAt } from "../simulation/vitality-integrity";
import { passOrdinaryDays } from "./ordinary-life";

export const PRE_START_WORLD_YEAR_VERSION = "pre-start-world-year-v1";

/**
 * Advance the actual dated World from Team C's prior-date constructor to the
 * target start. The ordinary clock owns its events, people, money, and office
 * transitions; this wrapper only bounds the advance and refuses a dead
 * prospective player. A completed World is returned unchanged on replay.
 */
export function completePreStartWorldYear(
  world: World,
  playerPersonId: EntityId,
  targetStartDate: IsoDate,
): World {
  const prospectivePlayerAlive = (candidate: World) =>
    isPersonAliveAt(candidate, playerPersonId, {
      asOfDate: candidate.currentDate,
      historySequenceExclusive: candidate.history.nextSequence,
    });
  if (!prospectivePlayerAlive(world))
    throw new Error(
      "The prospective player died during the pre-start world year.",
    );
  if (world.currentDate === targetStartDate) return world;
  if (world.currentDate > targetStartDate)
    throw new Error("The pre-start world has passed the requested start date.");
  let next = world;
  for (
    let step = 0;
    step < 400 && next.currentDate < targetStartDate;
    step += 1
  ) {
    const remaining = daysBetween(next.currentDate, targetStartDate);
    const advanced = passOrdinaryDays(next, Math.min(30, remaining));
    if (
      compareSimulationMoments(advanced.currentMoment, next.currentMoment) <= 0
    )
      throw new Error(
        "The pre-start world year stopped before the start date.",
      );
    next = advanced;
    if (!prospectivePlayerAlive(next))
      throw new Error(
        "The prospective player died during the pre-start world year.",
      );
    if (next.currentDate > targetStartDate)
      throw new Error("The pre-start world passed the requested start date.");
  }
  if (next.currentDate !== targetStartDate)
    throw new Error("The pre-start world year did not reach the start date.");
  return next;
}
