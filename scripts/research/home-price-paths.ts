/**
 * A drawn place's home price level, for the pull request's tables: its path
 * before day one against FHFA's state index for the same spans (1, 5 and 15
 * years before the start; a sanity check, never a target), then the played
 * world unattended for `--years`, month by month, with each year's change, the
 * month's buyers and homes offered, and the smallest and largest yearly
 * change (the level must stay bounded and not swing ever wider).
 *
 *   node --max-old-space-size=8192 --import tsx scripts/research/home-price-paths.ts \
 *     --seed <s> [--place <key>] [--years 30]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { pastPriceRatio } from "../../src/core2/housing-price-path";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { housingMacroParameter } from "../../src/core2/modules/housing";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { coreAPI } from "../../src/core2/state";
import { drawPlace } from "../core2-year/place";
import { publishedHomePriceRatio } from "./home-price-fit";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", randomBytes(8).toString("hex"));
const years = Number(option("years", "30"));
const drawn = drawPlace(seed, "home-price-paths");
const placeKey = option("place", drawn.key);
const place = corePlaceByKey(placeKey);

setBookkeeping(false);
const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const api = coreAPI(core);
const usps = core.placeMetadata?.housingState ?? "";
const start = core.date;
const shift = (date: string, by: number) =>
  `${Number(date.slice(0, 4)) + by}${date.slice(4)}`;
console.log(
  `${place?.name ?? placeKey} (${placeKey}), seed ${seed}, world seed ${core.seed}, start ${start}, people ${core.people.size}`,
);
console.log("\nBefore day one: this world's path against FHFA's state index");
console.log("| Span | This world | FHFA (state) |");
console.log("| --- | --- | --- |");
for (const back of [1, 5, 15]) {
  const from = shift(start, -back);
  const mine = pastPriceRatio(
    { startedAt: start, seed: core.seed },
    from,
    start,
    housingMacroParameter,
  );
  const fhfa = publishedHomePriceRatio(usps, from, start);
  console.log(
    `| ${back} year${back > 1 ? "s" : ""} (${from.slice(0, 7)} to ${start.slice(0, 7)}) | ${((mine - 1) * 100).toFixed(1)}% | ${((fhfa - 1) * 100).toFixed(1)}% |`,
  );
}

const stock = api.moduleState("housing").table("stock");
const levels = () =>
  (
    stock.rows() as unknown as {
      placeId: string;
      priceLevelMinor?: number;
      priceRead?: { buyers: number; offered: number; owned: number };
    }[]
  ).filter((row) => row.priceLevelMinor);
const first = levels();
console.log(
  `\nPlayed, unattended: ${first.length} place(s) keep a level; day one ${first.map((row) => `${row.placeId} $${Math.round(row.priceLevelMinor! / 100)}`).join(", ")}`,
);
console.log(
  "| Year | Typical value | Change | Buyers | Offered | Owned | Seconds |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- |");
const watched = first[0]?.placeId;
let last = first[0]?.priceLevelMinor ?? 0;
const changes: number[] = [];
for (let year = 1; year <= years; year++) {
  let buyers = 0,
    offered = 0,
    owned = 0;
  const began = performance.now();
  for (let month = 0; month < 12; month++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    const row = levels().find((r) => r.placeId === watched);
    buyers += row?.priceRead?.buyers ?? 0;
    offered += row?.priceRead?.offered ?? 0;
    owned = row?.priceRead?.owned ?? owned;
  }
  const seconds = (performance.now() - began) / 1000;
  const now = levels().find((r) => r.placeId === watched)?.priceLevelMinor ?? 0;
  const change = last ? now / last - 1 : 0;
  changes.push(change);
  console.log(
    `| ${year} (${core.date.slice(0, 7)}) | $${Math.round(now / 100)} | ${(change * 100).toFixed(1)}% | ${buyers.toFixed(0)} | ${offered.toFixed(0)} | ${owned.toFixed(0)} | ${seconds.toFixed(0)} |`,
  );
  last = now;
}
if (changes.length)
  console.log(
    `\nYearly change: smallest ${(Math.min(...changes) * 100).toFixed(1)}%, largest ${(Math.max(...changes) * 100).toFixed(1)}%`,
  );
