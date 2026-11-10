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

// A counted person's regional work adds one worker to their household (and
// the pay of as many workers as the record stands for to the unplaced
// workers' flow); ending it takes exactly that back.
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
  // A place with an unplaced-workers pool takes a counted worker into it; one
  // without (a town whose counted workers are all placed) takes none.
  const members = [...rt.store.liveHouseholds()]
    .filter((h) => !h.quarters)
    .flatMap((h) => rt.store.countedMembers(h));
  expect(members.length, "counted members").toBeGreaterThan(0);
  const before = { flow: flowTotal(), workers: workers() };
  let started: string | undefined;
  for (const member of members) {
    const id = rt.store.ids[member]!;
    if (startRegionalWork(core, id, 2000) === "counted") {
      started = id;
      break;
    }
  }
  if (!started) {
    expect(workers()).toBe(before.workers);
    return;
  }
  expect(workers()).toBeGreaterThan(before.workers);
  expect(flowTotal()).toBeGreaterThan(before.flow);
  expect(stopRegionalWork(core, started)).toBe(true);
  expect(workers()).toBeCloseTo(before.workers, 6);
  expect(Math.abs(flowTotal() - before.flow)).toBeLessThanOrEqual(1);
}, 300_000);
