import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  residentsRuntime,
  startRegionalWork,
  stopRegionalWork,
} from "./modules/residents";

// A counted person's regional work adds their record's workers to their
// household and the place's pay to the unplaced workers' flow; ending it
// takes exactly that back.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "regional-work");

it(`regional work starts and stops symmetrically in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const rt = residentsRuntime(core)!;
  const flowTotal = () =>
    [...rt.flows.values()]
      .filter((f) => f.financeKind === "work.unplaced-residents" && !f.endedAt)
      .reduce((sum, f) => sum + f.amountMinor, 0);
  const workers = () =>
    [...rt.store.liveHouseholds()].reduce((n, h) => n + h.unplacedWorkers, 0);
  const person = rt.store
    .liveHouseholds()
    .find((h) => !h.quarters && h.unplacedWorkers >= 0);
  const member = person && rt.store.countedMembers(person)[0];
  expect(member, "a counted member").toBeDefined();
  const id = rt.store.ids[member!]!;
  const before = { flow: flowTotal(), workers: workers() };
  expect(startRegionalWork(core, id, 2000)).toBe("counted");
  expect(workers()).toBeGreaterThan(before.workers);
  expect(flowTotal()).toBeGreaterThan(before.flow);
  expect(stopRegionalWork(core, id)).toBe(true);
  expect(workers()).toBeCloseTo(before.workers, 6);
  expect(Math.abs(flowTotal() - before.flow)).toBeLessThanOrEqual(1);
}, 300_000);
