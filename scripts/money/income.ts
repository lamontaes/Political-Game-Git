/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** Counted households' yearly income by year in a drawn place: npx tsx scripts/money/income.ts <seed> <years> [placeKey] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  householdIncome,
  residentsRuntime,
} from "../../src/core2/modules/residents";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "money-1";
const years = Number(process.argv[3] ?? 3);
const drawn = drawPlace(seed, "speed-year");
const key = process.argv[4] ?? drawn.key;
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
console.log(`${drawn.name} ${key} seed ${seed}`);
const report = (label: string) => {
  const rt: any = residentsRuntime(world.core);
  const incomes = [...rt.store.liveHouseholds()]
    .map((h: any) => householdIncome(rt, h))
    .sort((a: number, b: number) => a - b);
  const pay = [...rt.store.liveHouseholds()]
    .map((h: any) => h.wagesMinorYear)
    .sort((a: number, b: number) => a - b);
  const mid = (a: number[]) => (a[Math.floor(a.length / 2)] ?? 0) / 100;
  console.log(
    label,
    world.core.date,
    "households",
    incomes.length,
    "median income",
    mid(incomes).toFixed(0),
    "median recorded wages",
    mid(pay).toFixed(0),
  );
};
report("open");
for (let y = 1; y <= years; y++) {
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
  report(`year ${y}`);
}
