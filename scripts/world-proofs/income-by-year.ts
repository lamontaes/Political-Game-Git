/**
 * Median household earnings by year in a played place (townMetrics): the
 * check that wages move, for the frozen-income defect (Dev Tester, Nov 8,
 * 2026: Washington, D.C. read 54,208 for four years; Futiga, American Samoa
 * stayed at 24,180).
 *
 * node --import tsx scripts/world-proofs/income-by-year.ts <seed> <placeKey> [years]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { townMetrics } from "../../src/core2/modules/world-metrics";

const seed = process.argv[2] ?? "r7";
const placeKey = process.argv[3]!;
const years = Number(process.argv[4] ?? 3);
const start = gameStartDate();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const api = coreAPI(world.core);
const read = (label: string) => {
  const row = townMetrics(api).find((m) => m.placeId === world.placeId);
  console.log(
    `${label} median household earnings ${Math.round((row?.medianHouseholdEarningsMinor ?? 0) / 100)} median hourly ${((row?.medianHourlyMinor ?? 0) / 100).toFixed(2)}`,
  );
};
advanceCore(world.core, addDays(makeIsoDate(start), 31));
read("month 1");
for (let y = 1; y <= years; y++) {
  advanceCore(world.core, addDays(makeIsoDate(start), y * 365 + 31));
  read(`year ${y}`);
}
