/** One model, two tiers: an employer's counted workers stand for as many jobs as their households' weights say. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
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
  let employers = 0;
  let counted = 0;
  for (const id of base.finance.businesses.keys()) {
    const jobs = countedJobsOf(base, id).length;
    // At scale one a counted job is one head.
    expect(countedHeadcountOf(base, id), `${where}: ${id}`).toBe(jobs);
    // The same employer with each counted household standing for three.
    expect(countedJobsOf(scaled, id).length, `${where}: ${id}`).toBe(jobs);
    expect(countedHeadcountOf(scaled, id), `${where}: ${id}`).toBe(
      jobs * SCALE,
    );
    if (jobs) employers += 1;
    counted += jobs;
  }
  expect(
    employers,
    `${where}: no employer has counted workers`,
  ).toBeGreaterThan(0);
  expect(counted, where).toBeGreaterThan(0);
}, 600_000);
