/**
 * Dev mode's "Skip years": one year of the played world in results mode, then day-by-day play
 * for a week with no error. A random place and seed each run, named in every message
 * (DEV_MODE_SEED replays one).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";

const seed = process.env.DEV_MODE_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const where = `${world.place.displayName} (seed ${seed})`;

describe(`skip a year: ${where}`, () => {
  it("moves the date a year, reports the verdict, and day-by-day play resumes", () => {
    dev.advance(addDays(makeIsoDate(core.date), 3));
    const before = core.date;
    const year = dev.runYear();
    if (!year.ran) throw new Error(`${where}: the skip was held`);
    process.stderr.write(
      `${where}: skipped ${year.from} to ${year.to} in ${year.seconds.toFixed(1)} s, ${year.problems} problems\n`,
    );
    expect(year.from, where).toBe(before);
    expect(year.to, where).toBe(addDays(makeIsoDate(before), 365));
    expect(core.date, where).toBe(year.to);
    expect(year.opened, where).toBe(true);
    expect(year.problems, where).toBe(0);
    // The notice is the stopgap's own text, which changes as parts of the fast
    // clock land; it always says what a skipped year still leaves out.
    expect(dev.skipNotice(), where).toMatch(/not done in a skipped year/);
  }, 300_000);

  // Done when: "plays one week day by day with no error". Fails today in the work module's
  // payroll (see the report); kept as it is, not weakened.
  it("plays one week day by day after the skip with no error", () => {
    const week = addDays(makeIsoDate(core.date), 7);
    dev.advance(week);
    expect(core.date, where).toBe(week);
  }, 300_000);
});
