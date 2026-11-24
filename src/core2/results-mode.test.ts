/**
 * The fast clock, part 1: results mode for time nobody watches. The same
 * drawn world runs one year day by day and, built again, one year in results
 * mode (each engine's dated work and its monthly catch-up, no module's day and
 * no person due); then seven days of day-by-day play follow the skipped year
 * and must finish with no error. The printed line names the place, the seed,
 * the seconds each year took and the days played after the skip.
 *
 * Not held here: what a skipped year does not yet do (deaths, prices,
 * hiring, campaigns), which parts 2 to 4 add as monthly steps.
 */
import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { snapshotExplicitControlV1 } from "./player-control-state-v1";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "results-mode");
const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
const YEAR_DAYS = 365;
const PLAYED_DAYS = 7;

const build = () => {
  setBookkeeping(false);
  return buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core;
};

it(`a year in results mode is followed by a played week with no error, in ${where}`, () => {
  const daily = build();
  const start = makeIsoDate(daily.date);
  const yearEnd = addDays(start, YEAR_DAYS);
  expect(
    snapshotExplicitControlV1(daily).personId,
    `no person is controlled before the run, in ${where}`,
  ).toBeUndefined();
  let began = performance.now();
  advanceCore(daily, yearEnd);
  const dailySeconds = (performance.now() - began) / 1000;
  expect(daily.date, `the day-by-day year ended on time, in ${where}`).toBe(
    yearEnd,
  );

  const skipped = build();
  expect(
    makeIsoDate(skipped.date),
    `both worlds open on one day, in ${where}`,
  ).toBe(start);
  began = performance.now();
  const skip = advanceCore(skipped, yearEnd, { results: true });
  const resultsSeconds = (performance.now() - began) / 1000;
  expect(skip.simulatedDays, `the skip covered the year, in ${where}`).toBe(
    YEAR_DAYS,
  );
  expect(
    skip.decisions + skip.acts,
    `results mode ran no person's day, in ${where}`,
  ).toBe(0);
  expect(skipped.date, `the skipped year ended on time, in ${where}`).toBe(
    yearEnd,
  );

  const playedEnd = addDays(yearEnd, PLAYED_DAYS);
  let played = 0,
    failure: unknown;
  try {
    while (skipped.date < playedEnd) {
      advanceCore(skipped, addDays(makeIsoDate(skipped.date), 1));
      played += 1;
    }
  } catch (error) {
    failure = error;
  }
  process.stdout.write(
    `results mode in ${where}: one year day by day ${dailySeconds.toFixed(1)} s, in results mode ${resultsSeconds.toFixed(1)} s; ${played} of ${PLAYED_DAYS} days played after the skip${failure ? `, then: ${String(failure)}` : " with no error"}\n`,
  );
  expect(
    failure,
    `the played week after the skip threw on day ${played + 1}, in ${where}`,
  ).toBeUndefined();
  expect(played, `every day of the week was played, in ${where}`).toBe(
    PLAYED_DAYS,
  );
}, 3_000_000);
