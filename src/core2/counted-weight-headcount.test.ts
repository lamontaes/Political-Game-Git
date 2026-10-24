/** One model, two tiers: an employer's counted workers stand for as many jobs as their households' weights say. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { countedHeadcountOf, countedJobsOf } from "./residents-economy";
import { coreAPI } from "./state";
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

/** Opens a place at scale one and at SCALE and checks its counted workers. */
function checkHeadcount(draw: { seed: string; key: string; name: string }) {
  const where = `seed ${draw.seed}, ${draw.name} (${draw.key})`;
  const base = openTown(draw.seed, draw.key);
  const scaled = openTown(draw.seed, draw.key, SCALE);
  const store = residentsRuntime(scaled)!.store;
  let employers = 0;
  let counted = 0;
  let scaledHeads = 0;
  let minWeight = Infinity;
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
      const weight = store.weightOf(store.households[store.household[m]!]!);
      minWeight = Math.min(minWeight, weight);
      return sum + weight;
    }, 0);
    expect(countedHeadcountOf(scaled, id), `${where}: ${id}`).toBeCloseTo(
      heads,
      6,
    );
    scaledHeads += heads;
    if (jobs) employers += 1;
    counted += jobs;
  }
  // Every counted household opens standing for SCALE. One filled in at the
  // opening gives the rest of its weight to the others of its group
  // (CountedStore.releaseWeight), so a worker's household weighs at least
  // SCALE, and in a small town a few fill-ins lift the mean well above it.
  expect(minWeight, where).toBeGreaterThanOrEqual(SCALE - 1e-9);
  // What the weights add up to stays what SCALE says: the town's counted
  // people now, plus the members of households filled in, are SCALE times
  // the members it opened with.
  const town = lawChain(coreAPI(scaled)).townPlaceId;
  const inTown = store.households.filter((h) => h.placeId === town);
  const opened = inTown.reduce((n, h) => n + h.members.length, 0);
  const still = inTown
    .filter((h) => !h.gone)
    .reduce((n, h) => n + store.weightedCount(h), 0);
  const filled = inTown
    .filter((h) => h.gone)
    .reduce((n, h) => n + h.members.length, 0);
  expect(opened, where).toBeGreaterThan(0);
  expect(still + filled, where).toBeCloseTo(SCALE * opened, 6);
  // With no household filled in, every worker stands for exactly SCALE.
  if (!filled) expect(scaledHeads / counted, where).toBeCloseTo(SCALE, 9);
  process.stdout.write(
    `HEADCOUNT ${where}: ${counted} counted workers, mean household weight ${(scaledHeads / counted).toFixed(4)}; ${filled} of ${opened} counted people filled in\n`,
  );
  expect(
    employers,
    `${where}: no employer has counted workers`,
  ).toBeGreaterThan(0);
  expect(counted, where).toBeGreaterThan(0);
}

it("reads an employer's counted headcount times the worker households' weight, and is unchanged at scale one", () => {
  checkHeadcount(
    drawPlace(
      process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex"),
      "census-headcount",
    ),
  );
}, 600_000);

// The town where a band of 3 percent around SCALE failed: 36 of its 762
// counted people filled in at the opening lift its workers' mean weight to 3.115.
it("in Maricopa Colony, Arizona the workers' weights add up to what the scale says", () => {
  checkHeadcount({
    seed: "7711218484ef671e9cff54d840d18ec70aa0caa29cb1bcc74aa732d3a8b2f5ff",
    key: "0444450",
    name: "Maricopa Colony, Arizona",
  });
}, 600_000);
