/* eslint-disable @typescript-eslint/no-explicit-any */
// Full people made, and who filed, after 1, 30 and 365 days: tsx full-people.ts <seed> [placeKey]
import { createHash } from "node:crypto";
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
setBookkeeping(false);
const [seed = "k7"] = process.argv.slice(2);
const place = drawPlace(seed, "elections");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core: any = w.core;
const start = core.date;
console.log(
  "place",
  place.name,
  "seed",
  seed,
  "people at start",
  core.people.size,
);
let last = 0;
for (const days of [1, 30, 365]) {
  advanceCore(core, addDays(makeIsoDate(start), days));
  last = days;
  console.log(`day ${days}: full people ${core.people.size}`);
}
const api = coreAPI(core);
const filings = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("filings")
  .rows() as any[];
const results = api
  .moduleState(VOTING_MODULE_ID)
  .table("results")
  .rows() as any[];
const byContest = new Map<string, string[]>();
for (const f of filings)
  (
    byContest.get(f.contestId) ??
    byContest.set(f.contestId, []).get(f.contestId)!
  ).push(`${f.personId}:${f.status}`);
const ids = [...byContest.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const hash = createHash("sha256")
  .update(JSON.stringify(ids))
  .digest("hex")
  .slice(0, 12);
const contested = results.filter(
  (r) => Object.keys(r.totals).length > 1,
).length;
console.log(
  `after ${last} days: filings ${filings.length} in ${byContest.size} contests (hash ${hash}); decided ${results.length}, contested ${contested}`,
);
