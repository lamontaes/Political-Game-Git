/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** National unemployment beside the town's, by month sample, in a played world: npx tsx scripts/money/reactions.ts <seed> <years> [placeKey] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { townMetrics } from "../../src/core2/modules/world-metrics";
import { coreAPI } from "../../src/core2/state";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "money-1";
const years = Number(process.argv[3] ?? 4);
const drawn = drawPlace(seed, "speed-year");
const key = process.argv[4] ?? drawn.key;
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
console.log(`${drawn.name} ${key} seed ${seed}`);
for (let q = 1; q <= years * 4; q++) {
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 91));
  const api = coreAPI(world.core);
  const months = [...api.moduleState("macro").table("months").rows()].sort(
    (a: any, b: any) => String(a.month).localeCompare(String(b.month)),
  ) as any[];
  const m = months.at(-1);
  const changes = api.moduleState("jobs").table("changes").rows() as any[];
  const since = addDays(makeIsoDate(world.core.date), -91);
  let layoffs = 0,
    hires = 0;
  for (const c of changes)
    if (c.date > since) {
      if (c.kind === "layoff") layoffs += c.heads ?? 1;
      if (c.kind === "hire") hires += c.heads ?? 1;
    }
  const t = townMetrics(api) as any[];
  const town = t.find((r) => r.businessesOpen > 0) ?? t[0];
  console.log(
    world.core.date,
    `nat U ${m.unemploymentPct.toFixed(1)} gap ${m.outputGapPct.toFixed(2)}`,
    `town U ${(town.unemploymentRate * 100).toFixed(1)} unemployed ${town.unemployed} employed ${town.employed} open ${town.businessesOpen} closed ${town.businessesClosedThisMonth} layoffs/qtr ${layoffs} hires/qtr ${hires} medHourly ${(town.medianHourlyMinor / 100).toFixed(2)}`,
  );
}
