/** One model, two tiers: an employer's counted workers stand for as many jobs as their households' weights say. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { residentsRuntime } from "./modules/residents";
import { countedHeadcountOf, countedJobsOf } from "./residents-economy";
import type { CoreState } from "./types";

const SCALE = 3;

function openTown(seed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  return buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale ? { countScale } : {}),
  }).core as CoreState;
}

it("reads an employer's counted headcount times the worker households' weight, and is unchanged at scale one", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "census-headcount");
  const where = `seed ${draw.seed}, ${draw.name} (${draw.key})`;
  const base = openTown(draw.seed, draw.key);
  const scaled = openTown(draw.seed, draw.key, SCALE);
  const store = residentsRuntime(scaled)!.store;
  let employers = 0;
  let counted = 0;
  let scaledHeads = 0;
  for (const id of base.finance.businesses.keys()) {
    const jobs = countedJobsOf(base, id).length;
    // At scale one a counted job is one head.
    expect(countedHeadcountOf(base, id), `${where}: ${id}`).toBe(jobs);
    // The same employer with each counted household standing for about
    // three (the weights are fitted to the census, so not exactly three).
    const workers = countedJobsOf(scaled, id);
    expect(workers.length, `${where}: ${id}`).toBe(jobs);
    const heads = workers.reduce((sum, job) => {
      const m = store.countedMember(job.personId)!;
      return sum + store.weightOf(store.households[store.household[m]!]!);
    }, 0);
    expect(countedHeadcountOf(scaled, id), `${where}: ${id}`).toBeCloseTo(
      heads,
      6,
    );
    scaledHeads += heads;
    if (jobs) employers += 1;
    counted += jobs;
  }
  // The weights are fitted to the census place by place, so a small town's
  // few workers can sit several percent off the scale; a town with a hundred
  // counted jobs or more is held to three percent, a smaller one to a
  // quarter (the exact headcount is checked job by job above).
  const slack = counted >= 100 ? 0.03 : 0.25;
  expect(
    scaledHeads / counted,
    `${where}: ${counted} counted jobs`,
  ).toBeGreaterThan(SCALE * (1 - slack));
  expect(
    scaledHeads / counted,
    `${where}: ${counted} counted jobs`,
  ).toBeLessThan(SCALE * (1 + slack));
  expect(
    employers,
    `${where}: no employer has counted workers`,
  ).toBeGreaterThan(0);
  expect(counted, where).toBeGreaterThan(0);
}, 600_000);
