import airing from "../core2/data/opening/address-airing.json" with { type: "json" };
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import {
  makeIsoDate,
  simulationMomentAtLocalTime,
  simulationMomentEpochMinute,
  simulationMomentFromEpochMinute,
} from "../core2/kernel/dates";
import type { CoreState } from "../core2/types";

const AIRS = airing.airsAtMinute;

/**
 * The clock minute the President's address airs at the player's own place on
 * the opening day: the one Eastern airing time (ESTIMATED, see
 * src/core2/data/opening/address-airing.json) read on the place's own clock, daylight
 * time included where the zone has it (one zone per state, so a state split
 * across two zones reads the zone its place table gives). `shiftsDay` is true
 * where the same moment falls on the next local date (Guam, the Northern
 * Marianas): the game keeps the opening day and the true local clock hour.
 */
export function addressAiring(
  core: CoreState,
  placeId: string,
): { readonly minuteOfDay: number; readonly shiftsDay: boolean } {
  const zone = corePlaceByJurisdictionId(placeId as never)?.context
    .initialMoment.timeZone;
  const eastern = simulationMomentAtLocalTime({
    date: makeIsoDate(core.date),
    minuteOfDay: AIRS.value,
    timeZone: AIRS.timeZone,
  });
  if (!zone) return { minuteOfDay: AIRS.value, shiftsDay: false };
  const local = simulationMomentFromEpochMinute(
    simulationMomentEpochMinute(eastern),
    zone,
  );
  return {
    minuteOfDay: local.minuteOfDay,
    shiftsDay: local.date !== core.date,
  };
}
