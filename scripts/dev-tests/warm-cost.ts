// New-game build time with and without the warm-up, and the unattended year after it.
// tsx scripts/dev-tests/warm-cost.ts <placeKey|draw:<seed>> <seed> <warmUpDays> [yearDays]
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { recordProof } from "../../src/bench/dev-proof";
import { drawPlace } from "../core2-year/place";
setBookkeeping(false);
const [where, seedArg, k, days = "0"] = process.argv.slice(2);
let placeKey = where!,
  seed = seedArg!;
if (where!.startsWith("draw:")) {
  const p = drawPlace(where!.slice(5), "day-zero");
  placeKey = p.key;
  seed = p.seed;
}
const t0 = Date.now();
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
  warmUpDays: Number(k),
});
const buildMs = Date.now() - t0;
let yearMs = 0;
if (Number(days) > 0) {
  const t1 = Date.now();
  advanceCore(w.core, addDays(makeIsoDate(w.core.date), Number(days)));
  yearMs = Date.now() - t1;
}
const rows = Object.values(recordProof(w.core).tables).reduce(
  (n, t) => n + t.rows,
  0,
);
console.log(
  JSON.stringify({
    placeKey,
    rows,
    msPerThousandRows: rows ? Math.round(yearMs / (rows / 1000)) : 0,
    warmUpDays: Number(k),
    buildSeconds: Math.round(buildMs / 1000),
    yearSeconds: Math.round(yearMs / 1000),
  }),
);
