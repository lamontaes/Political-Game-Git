import { compareSimulationMoments, daysBetween } from "../simulation/dates";
import type { IsoDate, World } from "../simulation/types";
import { passOrdinaryDays } from "./ordinary-life";

export const PRE_START_WORLD_YEAR_VERSION = "pre-start-world-year-v1";

/**
 * Advance the actual dated World from Team C's prior-date constructor to the
 * target start. The chosen player does not exist in this World yet. The
 * ordinary clock owns its events, people, money, and office transitions;
 * this wrapper only bounds the advance. A completed World is unchanged.
 */
export function completePreStartWorldYear(
  world: World,
  targetStartDate: IsoDate,
): World {
  if (world.control.kind !== "observer")
    throw new Error("The pre-start world must have observer control.");
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
    if (next.control.kind !== "observer")
      throw new Error("The pre-start world gained a player before Begin.");
    if (next.currentDate > targetStartDate)
      throw new Error("The pre-start world passed the requested start date.");
  }
  if (next.currentDate !== targetStartDate)
    throw new Error("The pre-start world year did not reach the start date.");
  return next;
}
