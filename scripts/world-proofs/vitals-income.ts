/**
 * The median household income of a played place by year, read as the Dev
 * Tester's vitals read it (scripts/dev-tests/vitals.ts: counted households'
 * recorded pay, awards and unplaced workers' pay), for the frozen-income
 * defect.
 *
 * node --import tsx scripts/world-proofs/vitals-income.ts <seed> <placeKey> [years]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { vitals } from "../dev-tests/vitals";

const seed = process.argv[2] ?? "r7";
const placeKey = process.argv[3]!;
const years = Number(process.argv[4] ?? 2);
const start = gameStartDate();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const read = (label: string) =>
  console.log(
    `${label} median household income ${vitals(world.core).medianHouseholdIncomeUsd}`,
  );
advanceCore(world.core, addDays(makeIsoDate(start), 2));
read("year 0");
for (let y = 1; y <= years; y++) {
  advanceCore(world.core, addDays(makeIsoDate(start), y * 365 + 2));
  read(`year ${y}`);
}
