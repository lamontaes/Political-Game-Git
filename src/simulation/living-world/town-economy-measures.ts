/**
 * Lane B's measures, read for one town from what the world has recorded:
 * unemployment, hourly pay, jobs by sector, businesses that opened and
 * closed, and births. The outcome web (04 SYSTEM SPECS part 5) reads a
 * place's measure before and after a law, so a link has something real to
 * move and a test has something real to count.
 *
 * Every reader is pure and writes nothing. A reading with nothing recorded
 * behind it is UNKNOWN (`value: null`), never zero. Point measures are read
 * on the world's current date; count measures cover `since` up to it.
 */

import type { EntityId, IsoDate, World } from "../types";
import { organizationProfileAt } from "../life-queries";
import { describeTownBusinesses } from "./town-businesses";
import { activeWorkers, laborStatus, townResidents } from "./town-employment";
import { isTownBirth } from "./town-families";
import { activeTownJobs } from "./town-labor-market";
import { townHourlyPayCents } from "./town-pay";

export interface TownMeasureReading {
  /** The measure, or null when nothing recorded supports one (UNKNOWN). */
  readonly value: number | null;
  /** How many people, jobs or records the value is read from. */
  readonly basis: number;
}

const unknown: TownMeasureReading = { value: null, basis: 0 };

/**
 * The town's unemployment rate today, in percent: residents in the labor
 * force with no job held today, over the labor force. A resident is in the
 * labor force when their place in it is working or looking for work, so
 * students, retirees and parents at home are left out, as the Census counts
 * them.
 */
export function townUnemploymentRate(
  world: World,
  town: EntityId,
): TownMeasureReading {
  const working = activeWorkers(world);
  let force = 0;
  let unemployed = 0;
  for (const resident of townResidents(world, town)) {
    const status = laborStatus(world, resident);
    if (status !== "employed" && status !== "looking-for-work") continue;
    force += 1;
    if (!working.has(resident.personId)) unemployed += 1;
  }
  if (force === 0) return unknown;
  return { value: (100 * unemployed) / force, basis: force };
}

/** The median hourly pay of the town's jobs held today, in cents. */
export function townMedianHourlyPay(
  world: World,
  town: EntityId,
): TownMeasureReading {
  const rates = [...townHourlyPayCents(world, town)].sort((a, b) => a - b);
  if (rates.length === 0) return unknown;
  const middle = Math.floor(rates.length / 2);
  const value =
    rates.length % 2 === 1
      ? rates[middle]!
      : Math.round((rates[middle - 1]! + rates[middle]!) / 2);
  return { value, basis: rates.length };
}

/**
 * The town's jobs held today, by the employer's classification. A job whose
 * employer has no profile is counted under "unknown", not dropped.
 */
export function townJobsBySector(
  world: World,
  town: EntityId,
): ReadonlyMap<string, number> {
  const organizationOf = new Map(
    world.history.workRelationships.map((work) => [
      work.id,
      work.organizationId,
    ]),
  );
  const sectors = new Map<string, number>();
  for (const job of activeTownJobs(world, town)) {
    const organizationId = organizationOf.get(job.relationshipId);
    const sector =
      (organizationId &&
        organizationProfileAt(world, organizationId)?.classification) ||
      "unknown";
    sectors.set(sector, (sectors.get(sector) ?? 0) + 1);
  }
  return sectors;
}

/** The town's jobs held today, all sectors together. */
export function townJobCount(world: World, town: EntityId): TownMeasureReading {
  const count = activeTownJobs(world, town).length;
  return { value: count, basis: count };
}

/** Town businesses that opened from `since` up to today. */
export function townBusinessOpenings(
  world: World,
  town: EntityId,
  since: IsoDate,
): TownMeasureReading {
  const summary = describeTownBusinesses(world, town, since);
  return { value: summary.opened, basis: summary.open };
}

/** Town businesses that closed from `since` up to today. */
export function townBusinessClosings(
  world: World,
  town: EntityId,
  since: IsoDate,
): TownMeasureReading {
  const summary = describeTownBusinesses(world, town, since);
  return { value: summary.closed, basis: summary.open };
}

/** Children born to the town's families from `since` up to today. */
export function townBirths(
  world: World,
  town: EntityId,
  since: IsoDate,
): TownMeasureReading {
  const births = world.history.events.filter(
    (event) =>
      isTownBirth(event, town) &&
      event.occurredAt >= since &&
      event.occurredAt <= world.currentDate,
  ).length;
  return { value: births, basis: births };
}

/**
 * B's measures by the key the outcome links name, for the engine's reader
 * registry. `since` bounds the count measures and is ignored by the rest.
 */
export const TOWN_ECONOMY_MEASURES: Readonly<
  Record<
    string,
    (world: World, town: EntityId, since: IsoDate) => TownMeasureReading
  >
> = {
  "economy.unemployment": (world, town) => townUnemploymentRate(world, town),
  "economy.wages": (world, town) => townMedianHourlyPay(world, town),
  "economy.jobs": (world, town) => townJobCount(world, town),
  "economy.business-openings": townBusinessOpenings,
  "economy.business-closings": townBusinessClosings,
  "families.births": townBirths,
};
