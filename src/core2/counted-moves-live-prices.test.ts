// @vitest-environment node
/**
 * A household weighing a move between states compares after-tax pay against each
 * state's prices as the country tier keeps them this month (family 22, pin 6),
 * not a published parity table. A drawn place from all 56; set GOLDEN_PATH_SEED
 * to reproduce the draw. Two worlds from one seed: in one, a state's own prices
 * have risen a fifth; from another state, the income pull toward it is weaker
 * there, and equal in the control. On the published table nothing differs.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  pullBetween,
  runtimeOf,
  stateUnemployment,
} from "./modules/counted-moves";
import { countryStates } from "./modules/macro";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const WAGES = 60_000;
const RISE = 1.2;

it("a state whose own prices rose draws fewer movers on income", () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "counted-moves-live-prices");
  const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
  const build = () =>
    buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
  const control = build();
  const dearer = build();
  // The tier opens with the first month's step.
  for (const core of [control, dearer])
    advanceCore(core, addDays(makeIsoDate(core.date), 32));
  const states = countryStates(coreAPI(control))
    .map((s) => s.usps)
    .sort();
  const to = states[0]!;
  const from = states[1]!;
  // The tier's own record of the state's prices since the opening rises a fifth.
  const table = coreAPI(dearer).moduleState("macro").table("countryStates");
  const row = table.query("byFips", [
    countryStates(coreAPI(dearer)).find((s) => s.usps === to)!.fips,
  ])[0] as unknown as { id: string; prices: number };
  table.put({ ...row, prices: row.prices * RISE } as never);
  for (const core of [control, dearer])
    advanceCore(core, addDays(makeIsoDate(core.date), 33));
  const pull = (core: CoreState) => {
    const api = coreAPI(core);
    const rt = runtimeOf(api)!;
    rt.netCache.clear();
    return pullBetween(api, rt, from, to, WAGES, stateUnemployment(api)).income;
  };
  const [without, withRise] = [pull(control), pull(dearer)];
  process.stdout.write(
    `live prices: ${where}; income pull from ${from} toward ${to}: ${without.toFixed(4)} with its prices as kept, ${withRise.toFixed(4)} after they rose a fifth\n`,
  );
  expect(withRise, where).toBeLessThan(without);
}, 900_000);
