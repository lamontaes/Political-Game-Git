/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/**
 * A played world for N years with the national economy printed by year, so a
 * cycle can be seen reaching a drawn town. Development tooling:
 *   npx tsx scripts/money/played.ts <seed> [years]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "money-1";
const years = Number(process.argv[3] ?? 10);
const drawn = drawPlace(seed, "money-played");
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: drawn.key,
});
console.log(`${drawn.name} (${drawn.key}) seed ${seed}`);
for (let y = 1; y <= years; y++) {
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
  const api = coreAPI(world.core);
  const months = [...api.moduleState("macro").table("months").rows()].sort(
    (a: any, b: any) => String(a.month).localeCompare(String(b.month)),
  ) as any[];
  const last = months.at(-1);
  console.log(
    `year ${y} ${world.core.date}: U ${last.unemploymentPct.toFixed(1)} gap ${last.outputGapPct.toFixed(2)} infl ${last.inflationPct.toFixed(1)} rate ${last.policyRatePct.toFixed(2)} period ${last.cyclePeriodYears?.toFixed(1)}`,
  );
}
