/**
 * A counted worker hired from a job with no occupation code (a press outlet's
 * staff job) keeps a job record a module row can hold. A business closure
 * copies the counted job whole into its seeker row (jobs.ts), and module data
 * refuses an undefined field, so one such job stopped the world build. Played
 * in Traskwood, Arkansas, where a radio station hires a counted worker on
 * January 1, 2027.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { moduleData } from "./module-data";
import { residentsRuntime } from "./modules/residents";

const seed = process.env.GOLDEN_PATH_SEED ?? "c2-b";
const place = drawPlace(seed, "committee-markup");
// Written straight to stdout, so a world that fails to build still names its place.
process.stdout.write(
  `closure-counted-seeker-finite: ${place.name} (${place.key}), seed ${seed}\n`,
);

it(`a counted job hired from a job with no occupation code is module data in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  });
  const rt = residentsRuntime(world.core)!;
  const uncoded = () =>
    [...rt.jobs.values()].filter((job) => !job.occupationClassification);
  // Two years at most, a month at a time, until such a hire is on the books.
  for (let month = 0; month < 24 && !uncoded().length; month += 1)
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 30));
  const jobs = uncoded();
  expect(
    jobs.length,
    `no counted job without an occupation code by ${world.core.date}`,
  ).toBeGreaterThan(0);
  setBookkeeping(true);
  try {
    for (const job of jobs)
      // What the closure handler writes for this worker's seeker row.
      expect(
        () => moduleData({ id: job.personId, lastJob: { ...job } }),
        job.id,
      ).not.toThrow();
  } finally {
    setBookkeeping(false);
  }
  console.log(
    `closure-counted-seeker-finite: ${jobs.length} counted jobs without an occupation code by ${world.core.date}, first ${jobs[0]!.id}`,
  );
}, 900_000);
