/**
 * A disaster takes jobs from the struck state for its recovery (Nation,
 * Nov 8): the national events engine sizes the toll from FEMA's record when
 * a disaster is opened, and the regional economy reads it as a fading offset
 * on the state's jobs. Two worlds of the same place and seed play the same
 * days; in one the shocks are removed as they are made, so the difference
 * between their state jobs is the disasters' toll. Played in a place drawn
 * from all 56 on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { REGIONS, type RegionMonth } from "./regional-model";
import { coreAPI } from "./state";

const USPS = new Map(REGIONS.map((r) => [r.id, r.stateUsps]));
const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

function play(keepShocks: boolean) {
  const place = drawPlace(seed, "disaster-jobs");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const shocks = api.moduleState("regional").table("shocks");
  const made = new Map<string, { stateUsps: string; jobsLossShare: number }>();
  let day = makeIsoDate(world.core.date);
  const end = addDays(day, 150);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(world.core, day);
    for (const row of shocks.rows() as unknown as {
      id: string;
      stateUsps: string;
      jobsLossShare: number;
    }[]) {
      made.set(row.id, row);
      if (!keepShocks) shocks.remove(row.id);
    }
  }
  const macro = api
    .moduleState("macro")
    .table("state")
    .get("macro:state") as unknown as {
    latestMonth: string;
  };
  const jobs = new Map<string, number>();
  for (const row of api
    .moduleState("regional")
    .table("months")
    .query("byMonth", [macro.latestMonth]) as unknown as (RegionMonth & {
    regionId: string;
  })[]) {
    const usps = USPS.get(row.regionId)!;
    jobs.set(usps, (jobs.get(usps) ?? 0) + row.jobsThousands);
  }
  return { place, made, jobs, month: macro.latestMonth };
}

it("a disaster lowers the struck state's jobs, and the twin without it does not", () => {
  const withShocks = play(true);
  const without = play(false);
  const where = `${withShocks.place.name}, seed ${seed}`;
  expect(
    withShocks.made.size,
    `${where}: disasters that took jobs`,
  ).toBeGreaterThan(0);
  let checked = 0;
  let best = { id: "", usps: "", ratio: 1 };
  for (const [id, shock] of withShocks.made) {
    const a = withShocks.jobs.get(shock.stateUsps);
    const b = without.jobs.get(shock.stateUsps);
    if (!a || !b) continue;
    checked += 1;
    // The state's jobs are lower with the disasters than without.
    if (a / b < best.ratio) best = { id, usps: shock.stateUsps, ratio: a / b };
  }
  expect(checked, where).toBeGreaterThan(0);
  expect(best.ratio, `${where}: ${best.id}`).toBeLessThan(1);
  process.stdout.write(
    `nation proof: disaster jobs: ${where}; ${best.id} took ${((1 - best.ratio) * 100).toFixed(3)} percent off ${best.usps}'s jobs by ${withShocks.month} (${withShocks.made.size} disasters took jobs)\n`,
  );
}, 3600000);
