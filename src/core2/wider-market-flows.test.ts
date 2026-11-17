import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  findPullMonth,
  layoffPullMonth,
  workConditions,
} from "./jobs-elsewhere";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { stateJobFlows } from "./modules/people";
import { coreAPI } from "./state";

// The wider labor market's pace is the country tier's own month: the share of
// its jobs firms ended and the share of its seekers who found work, never a
// published rate (jobs-elsewhere.ts layoffPullMonth, findPullMonth).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`the wider market's pull is the state's own month and moves with it, seed ${seed}`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "wider-market-flows");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  const month = 1 / 3;
  const ended: number[] = [];
  const found: number[] = [];
  for (let step = 0; step < 6; step += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 31));
    const flows = stateJobFlows(api);
    expect(flows.size, where).toBeGreaterThan(0);
    const usps = [...flows.keys()][step % flows.size]!;
    const at = workConditions(api).of(usps);
    expect(at.ended, where).toBe(flows.get(usps)!.ended);
    if (at.ended === undefined || at.found === undefined) continue;
    ended.push(at.ended);
    found.push(at.found);
    // With average traits and age the pull is the state's own share.
    expect(layoffPullMonth(api, at, 0, 1, month)).toBeCloseTo(at.ended, 10);
    expect(findPullMonth(api, at, 0, undefined, month)).toBeCloseTo(
      at.found,
      10,
    );
    // Doubling the tier's flows doubles the pull: no fixed pace stands under it.
    expect(
      layoffPullMonth(api, { ...at, ended: at.ended * 2 }, 0, 1, month),
    ).toBeCloseTo(at.ended * 2, 10);
    expect(
      findPullMonth(api, { ...at, found: at.found * 2 }, 0, undefined, month),
    ).toBeCloseTo(at.found * 2, 10);
  }
  expect(ended.length, where).toBeGreaterThan(0);
  // The tier's months differ from each other: the pace moves with the world.
  expect(new Set(ended.map((n) => n.toFixed(6))).size, where).toBeGreaterThan(
    1,
  );
}, 600000);
