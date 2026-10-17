/**
 * Do a played town's businesses open and close at the rate its state's do? For
 * each drawn place, the played world for a year: businesses opened (the
 * business engine's foundings) and closed (its closures) over the businesses
 * open at the start, set beside the Census Business Dynamics Statistics entry
 * and exit rates for the place's state (median year, 2010 to 2019 and 2022 to
 * 2023). One town is a handful of businesses, so the totals across all the
 * drawn places are what to compare.
 *
 * Reads: data/research/business/bds-2023.json.
 * Run: node --import tsx scripts/core2-year/business-entry-exit-check.ts [seed ...]
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { drawPlace } from "./place";

const BDS = JSON.parse(
  readFileSync("data/research/business/bds-2023.json", "utf8"),
) as { states: Record<string, { entry: number[]; exit: number[] }> };

const seeds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [randomBytes(6).toString("hex")];
let open = 0,
  founded = 0,
  closed = 0,
  expectedEntry = 0,
  expectedExit = 0;
for (const seed of seeds) {
  const place = drawPlace(seed, "business-entry-exit");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const start = [...core.finance.businesses.values()].filter(
    (book) => !book.closedAt,
  ).length;
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const rows = (name: string) =>
    api.moduleState("business").table(name).rows().length;
  const rate = BDS.states[place.key.slice(0, 2)];
  const entries = rows("foundings"),
    exits = rows("closures");
  open += start;
  founded += entries;
  closed += exits;
  if (rate) {
    expectedEntry += (start * rate.entry[1]!) / 100;
    expectedExit += (start * rate.exit[1]!) / 100;
  }
  console.log(
    `${place.name} (${place.key}), seed ${seed}: ${start} businesses, ${entries} opened, ${exits} closed` +
      (rate
        ? `; state BDS median entry ${rate.entry[1]}%, exit ${rate.exit[1]}%`
        : "; no BDS row for this place"),
  );
}
console.log(
  `All places: ${open} businesses; opened ${founded} (BDS would give about ${expectedEntry.toFixed(1)}), closed ${closed} (about ${expectedExit.toFixed(1)}).`,
);
