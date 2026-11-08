/* eslint-disable @typescript-eslint/no-explicit-any */
// How close the stayers came: top pulls per contest vs the stay-out bar: tsx pull-spread.ts <seed> <years>
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { CANDIDACY_MODULE_ID } from "../../src/core2/modules/candidacy";
setBookkeeping(false);
const [seed = "a1", years = "2"] = process.argv.slice(2);
const place = drawPlace(seed, "elections");
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
advanceCore(w.core, addDays(makeIsoDate(w.core.date), Math.round(Number(years) * 365)));
const api = coreAPI(w.core);
const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as any[];
const decisions = api.moduleState(CANDIDACY_MODULE_ID).table("decisions").rows() as any[];
const byContest = new Map<string, any[]>();
for (const d of decisions) (byContest.get(d.contestId) ?? byContest.set(d.contestId, []).get(d.contestId)!).push(d);
for (const c of contests) {
  const ds = (byContest.get(c.id) ?? []).filter((d) => d.scores?.length);
  if (!ds.length) continue;
  const pulls = ds.map((d) => Object.values(d.reasons as Record<string, number>).reduce((a, b) => a + b, 0)).sort((a, b) => b - a);
  console.log(`${c.level}/${c.family} ${c.title.slice(0, 28).padEnd(28)} weighed ${ds.length} ran ${ds.filter((d) => d.run).length} top ${pulls.slice(0, 6).map((x) => x.toFixed(2)).join(" ")} median ${pulls[Math.floor(pulls.length / 2)]!.toFixed(2)}`);
}
