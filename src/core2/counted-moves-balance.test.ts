/**
 * People move between a place and the rest of the country in both directions
 * from the same rates, so a place does not empty or fill by arithmetic alone
 * (Dev Tester, Nov 8: Washington, D.C. lost 7.1 percent of its people in one
 * simulated year, 54,452 leaving for a "rest of state" and 14,566 arriving).
 * A jurisdiction that is wholly counted places has no remainder to send
 * people to or take them from, and a destination's weight counts its counted
 * people too. Named regression world, then two drawn places.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime, townPlaceOf } from "./modules/residents";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Everyone in the town: the counted households times their weight, and the full people. */
function townPeople(core: CoreState): number {
  const store = residentsRuntime(core)!.store;
  let n = 0;
  for (const h of store.liveHouseholds()) n += store.weightedCount(h);
  const town = townPlaceOf(core);
  for (const p of core.people.values())
    if (p.alive && p.placeId === town) n += 1;
  return n;
}

function yearChange(worldSeed: string, key: string): { pct: number; where: string } {
  setBookkeeping(false);
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  const before = townPeople(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const after = townPeople(core);
  return {
    pct: (100 * (after - before)) / before,
    where: `${key}, world seed ${worldSeed}: ${Math.round(before)} to ${Math.round(after)}`,
  };
}

it("a wholly counted jurisdiction keeps its people within 1.5 percent a year (Washington, D.C., world seed 03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e)", () => {
  const { pct, where } = yearChange(
    "03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e",
    "1150000",
  );
  expect(Math.abs(pct), where).toBeLessThanOrEqual(1.5);
}, 3_600_000);

it(`two drawn places keep their people within 1.5 percent a year, from seed ${seed}`, () => {
  for (const n of [0, 1]) {
    const place = drawPlace(`${seed}:${n}`, "counted-moves-balance");
    const { pct, where } = yearChange(place.seed, place.key);
    expect(Math.abs(pct), `${place.name}: ${where}`).toBeLessThanOrEqual(1.5);
  }
}, 3_600_000);
