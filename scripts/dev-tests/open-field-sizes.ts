/* eslint-disable @typescript-eslint/no-explicit-any */
// Open seats against held seats: filers per contest, and names left on the general ballot: tsx open-field-sizes.ts <seed> <years>
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const [seed = "a1", years = "3"] = process.argv.slice(2);
const place = drawPlace(seed, "elections");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
advanceCore(
  w.core,
  addDays(makeIsoDate(w.core.date), Math.round(Number(years) * 365)),
);
const api = coreAPI(w.core);
const contests = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("contests")
  .rows() as any[];
const filings = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("filings")
  .rows() as any[];
const results = api.moduleState(VOTING_MODULE_ID).table("results");
console.log("place", place.name ?? place.key, "seed", seed, "years", years);
const rows: Record<string, number[][]> = {};
for (const c of contests) {
  const r = results.get(`result:${c.id}`) as any;
  if (!r) continue;
  const filed = filings.filter(
    (f) => f.contestId === c.id && f.status !== "short",
  ).length;
  const left = Object.keys(r.totals).length;
  const kind = `${c.level}/${c.family} ${c.incumbentTermId ? "held" : "open"}`;
  (rows[kind] ??= []).push([filed, left]);
}
for (const [kind, v] of Object.entries(rows).sort()) {
  const mean = (i: number) => v.reduce((n, x) => n + x[i]!, 0) / v.length;
  console.log(
    `${kind.padEnd(36)} n=${String(v.length).padStart(3)} filedMean=${mean(0).toFixed(2)} filedMax=${Math.max(...v.map((x) => x[0]!))} ballotMean=${mean(1).toFixed(2)} ballotMax=${Math.max(...v.map((x) => x[1]!))}`,
  );
}
