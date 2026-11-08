/* eslint-disable @typescript-eslint/no-explicit-any */
// Why a contest filed for ended with nobody on the ballot: tsx zero-general.ts <seed> <years>
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
const [seed = "s4", years = "2"] = process.argv.slice(2);
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
for (const c of contests) {
  const r = results.get(`result:${c.id}`) as any;
  if (!r || Object.keys(r.totals).length) continue;
  const fs = filings.filter((f) => f.contestId === c.id);
  const by: Record<string, number> = {};
  for (const f of fs) by[f.status] = (by[f.status] ?? 0) + 1;
  console.log(
    c.id,
    c.family,
    c.stage ?? "",
    "date",
    c.electionDate,
    "filed",
    fs.length,
    JSON.stringify(by),
    "result keys",
    Object.keys(r).join(","),
    "outcome",
    r.outcome ?? r.kind ?? "",
  );
}
