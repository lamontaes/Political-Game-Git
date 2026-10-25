/**
 * The played world the M1-03, M1-04 and M1-06 checks share: the runner's
 * drawn place and seed (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY), the world
 * built exactly as the player gets it (`buildBenchWorld`, two-level, every
 * module installed), and a game year advanced month by month so a check can
 * read what only shows on the day. Bookkeeping is off, as in play.
 */
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import type { CoreAPI, CoreState } from "../types";

export interface PlayedYear {
  seed: string;
  placeKey: string;
  placeName: string;
  placeId: string;
  /** The place's state, as the corpus keys it (for example the part after "US-"). */
  stateKey: string;
  core: CoreState;
  api: CoreAPI;
  start: string;
}

/** The runner's seed and place; the command line is the fallback for a hand run. */
export function runnerEnv(): { seed: string; placeKey: string } {
  const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2],
    placeKey = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3];
  if (!seed || !placeKey)
    throw new Error("GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are required.");
  return { seed, placeKey };
}

/** Builds the drawn place's played world at the game's start day. */
export function buildPlayedWorld(): PlayedYear {
  const { seed, placeKey } = runnerEnv();
  setBookkeeping(false);
  const world = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  return {
    seed,
    placeKey,
    placeName: world.place.displayName,
    placeId: world.placeId,
    stateKey: world.place.stateJurisdictionKey ?? "",
    core: world.core,
    api: coreAPI(world.core),
    start: world.core.date,
  };
}

/** The same day-of-month, `months` calendar months on (the day clamps to the month's last). */
export function monthsAfter(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** The day after `date`. */
export function nextDay(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

/** Plays a year, one month at a time; `afterMonth` reads the world at each month's end (month 1 to 12). */
export function playYear(
  world: PlayedYear,
  afterMonth?: (month: number) => void,
): void {
  for (let month = 1; month <= 12; month += 1) {
    advanceCore(world.core, monthsAfter(world.start, month));
    afterMonth?.(month);
  }
}
