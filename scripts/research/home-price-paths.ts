/**
 * A drawn place's home price level, for the pull request's tables:
 *
 * 1. Before day one: this world's path against FHFA's state index for the same
 *    spans (1, 5 and 15 years before the start; a sanity check, never a target).
 * 2. A 2020 buyer: what a first-time buyer of the town's typical home paid in
 *    July 2020 and their equity on day one, under the rule (day one is the
 *    census median, the past is this world's path back from it) against the
 *    old index (the census median at its value date, moved by FHFA's state
 *    index, with the published rate).
 * 3. The played world unattended for `--years`: each year's change, buyers and
 *    homes offered; then the same months replayed with no buyers-against-offered
 *    pressure, so the lean from pressure is the gap (cumulative at years 1, 5,
 *    15 and 30, and the last year the pressure leaned the level by more than
 *    half a percent).
 *
 *   node --max-old-space-size=8192 --import tsx scripts/research/home-price-paths.ts \
 *     --seed <s> [--place <key>] [--years 30]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import {
  economyMonthBefore,
  pastPriceRatio,
} from "../../src/core2/housing-price-path";
import { ACS_VALUE_DATE, stepLogLevel } from "../../src/core2/housing-prices";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { historicalMortgageRate } from "../../src/core2/macro-model";
import { housingMacroParameter as p } from "../../src/core2/modules/housing";
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
const world = { startedAt: start, seed: core.seed };
const shift = (date: string, by: number) =>
  `${Number(date.slice(0, 4)) + by}${date.slice(4)}`;
const pct = (ratio: number) => `${((ratio - 1) * 100).toFixed(1)}%`;
const dollars = (minor: number) =>
  `$${Math.round(minor / 100).toLocaleString("en-US")}`;
console.log(
  `${place?.name ?? placeKey} (${placeKey}), seed ${seed}, world seed ${core.seed}, start ${start}, people ${core.people.size}`,
);
console.log("\nBefore day one: this world's path against FHFA's state index");
console.log("| Span | This world | FHFA (state) |");
console.log("| --- | --- | --- |");
for (const back of [1, 5, 15]) {
  const from = shift(start, -back);
  console.log(
    `| ${back} year${back > 1 ? "s" : ""} (${from.slice(0, 7)} to ${start.slice(0, 7)}) | ${pct(pastPriceRatio(world, from, start, p))} | ${pct(publishedHomePriceRatio(usps, from, start))} |`,
  );
}

interface StockPrice {
  placeId: string;
  priceLevelMinor?: number;
  openingPriceLevelMinor?: number;
  priceLogLevel?: number;
  priceRecent?: number[];
  priceRead?: {
    month: string;
    payIndex: number;
    ratePct: number;
    pressure: number;
    buyers: number;
    offered: number;
    owned: number;
  };
}
const stock = api.moduleState("housing").table("stock");
// The played town, as housing names it.
const town = core.placeMetadata?.housingTown;
if (!town) throw new Error("The town keeps no price level.");
const row = () => stock.get(`stock:${town}`) as unknown as StockPrice;
const first = row();
const typical = first.openingPriceLevelMinor ?? first.priceLevelMinor!;

// A first-time buyer in July 2020, ten percent down, 30 years fixed.
const months = p("macroMonthsPerYear"),
  term = p("housingMortgageTermYears") * months;
const paidMonths =
  (Number(start.slice(0, 4)) - 2020) * months + (Number(start.slice(5, 7)) - 7);
const owed = (price: number, ratePct: number) => {
  const r = ratePct / 100 / months,
    original = price * 0.9;
  const payment = (original * r) / (1 - (1 + r) ** -term);
  return (
    original * (1 + r) ** paidMonths -
    (payment * ((1 + r) ** paidMonths - 1)) / r
  );
};
const ruleBought = typical * pastPriceRatio(world, start, "2020-07-01", p);
const ruleRate = economyMonthBefore("2020-06", world, p).ratePct;
const oldToday = typical * publishedHomePriceRatio(usps, ACS_VALUE_DATE, start);
const oldBought =
  typical * publishedHomePriceRatio(usps, ACS_VALUE_DATE, "2020-07-01");
const oldRate = historicalMortgageRate("2020-06", p);
console.log(
  `\nA first-time buyer of ${town}'s typical home in July 2020 (10% down, 30 years), on day one`,
);
console.log("| | Paid in 2020 | Rate | Value on day one | Equity on day one |");
console.log("| --- | --- | --- | --- | --- |");
console.log(
  `| The rule | ${dollars(ruleBought)} | ${ruleRate.toFixed(2)}% | ${dollars(typical)} | ${dollars(typical - owed(ruleBought, ruleRate))} |`,
);
console.log(
  `| Old index | ${dollars(oldBought)} | ${oldRate.toFixed(2)}% | ${dollars(oldToday)} | ${dollars(oldToday - owed(oldBought, oldRate))} |`,
);
if (years <= 0) process.exit(0);

console.log(
  `\nPlayed, unattended: ${town}, day one ${dollars(first.priceLevelMinor!)}`,
);
console.log(
  "| Year | Typical value | Change | Buyers | Offered | Owned | Pay index | Rate | Seconds |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
const startLog = first.priceLogLevel!,
  startRecent = [...first.priceRecent!];
const reads: NonNullable<StockPrice["priceRead"]>[] = [];
const ruled: number[] = [];
let last = first.priceLevelMinor!;
for (let year = 1; year <= years; year++) {
  const began = performance.now();
  let buyers = 0,
    offered = 0;
  while (reads.length < year * months) {
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const read = row().priceRead;
    if (read && read.month !== reads.at(-1)?.month) {
      reads.push(read);
      buyers += read.buyers;
      offered += read.offered;
    }
  }
  const now = row().priceLevelMinor!;
  ruled.push(row().priceLogLevel!);
  const read = reads.at(-1)!;
  console.log(
    `| ${year} (${read.month}) | ${dollars(now)} | ${pct(now / last)} | ${buyers.toFixed(0)} | ${offered.toFixed(0)} | ${read.owned.toFixed(0)} | ${read.payIndex.toFixed(3)} | ${read.ratePct.toFixed(2)}% | ${((performance.now() - began) / 1000).toFixed(0)} |`,
  );
  last = now;
}

// The same months with no pressure: what pay and the rate alone would have done.
let log = startLog;
const recent = [...startRecent];
const alone: number[] = [];
reads.forEach((read, i) => {
  log = stepLogLevel(log, recent, { ...read, pressure: 0 }, p);
  recent.push(log);
  if (recent.length > months + 1) recent.shift();
  if ((i + 1) % months === 0) alone.push(log);
});
console.log(
  "\n| Years | With the rule | Pay and rate alone | Lean from pressure |",
);
console.log("| --- | --- | --- | --- |");
for (const at of [1, 5, 15, 30])
  if (at <= ruled.length)
    console.log(
      `| ${at} | ${pct(Math.exp(ruled[at - 1]! - startLog))} | ${pct(Math.exp(alone[at - 1]! - startLog))} | ${pct(Math.exp(ruled[at - 1]! - alone[at - 1]!))} |`,
    );
const lean = ruled.map((v, i) => v - alone[i]!);
const added = lean.map((v, i) => v - (i ? lean[i - 1]! : 0));
const lastLeaning = added.findLastIndex((v) => Math.abs(v) > 0.005);
console.log(
  `\nThe pressure last moved the lean by more than half a percent in year ${lastLeaning + 1}${lastLeaning + 1 === ruled.length ? " (still leaning at the end)" : ""}.`,
);
const yearly = ruled.map((v, i) => v - (i ? ruled[i - 1]! : startLog));
console.log(
  `Yearly change: smallest ${pct(Math.exp(Math.min(...yearly)))}, largest ${pct(Math.exp(Math.max(...yearly)))}`,
);
