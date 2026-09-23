import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
  projectObserverRecord,
} from "../../src/presentation/observer-world";

/**
 * Runs a watched world forward with nobody played and prints what the world
 * did on its own: bills, laws, amendments, elections, deaths.
 *
 *   npx tsx scripts/playtest/observer-probe.ts [seed] [weeks]
 */
const [seed = "observer-probe-1", weeks = "52"] = process.argv.slice(2);
const setup = observerSetup(seed);
let { world } = openObserverWorld(setup);
const started = Date.now();
for (let week = 0; week < Number(weeks); week += 1) {
  world = advanceObservedWorld(world, 7);
}
const record = projectObserverRecord(world);
process.stdout.write(
  `${JSON.stringify(
    {
      place: setup.placeKey,
      from: record.startedOn,
      to: record.date,
      seconds: Math.round((Date.now() - started) / 100) / 10,
      living: record.livingCount,
      deaths: record.deathCount,
      bills: record.laws.length,
      laws: record.enactedCount,
      amendments: record.amendments.length,
      elections: record.elections.length,
    },
    null,
    2,
  )}\n`,
);
