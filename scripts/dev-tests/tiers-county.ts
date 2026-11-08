/* eslint-disable @typescript-eslint/no-explicit-any */
// Candidates in county contests: tsx tiers-county.ts <seed> <years>
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { CANDIDACY_MODULE_ID } from "../../src/core2/modules/candidacy";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const [seed = "a1", years = "2"] = process.argv.slice(2);
const place = drawPlace(seed, "elections");
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const t = Date.now();
advanceCore(w.core, addDays(makeIsoDate(w.core.date), Math.round(Number(years) * 365)));
console.log(place.name, seed, "ms", Date.now() - t);
const api = coreAPI(w.core);
const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings").rows() as any[];
const weighed = api.moduleState(CANDIDACY_MODULE_ID).table("weighed");
let one = 0, total = 0, outside = 0;
for (const c of api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as any[]) {
  if (c.family !== "countyOffice") continue;
  const f = filings.filter((x) => x.contestId === c.id && x.status !== "withdrawn");
  const wr = weighed.get(c.id) as any;
  total++; if (f.length <= 1) one++;
  const away = f.filter((x) => api.state.people.get(x.personId)?.placeId !== (api.moduleState(ELECTIONS_MODULE_ID).table("town").get("town") as any).townPlaceId).length;
  outside += away;
  if (/assessor/i.test(c.title ?? "")) console.log("filings", f.map((x) => [x.personId, api.state.people.get(x.personId)?.placeId, x.status]), "asked", wr?.askedIds?.length, "run", wr?.runIds?.length, "filled", wr?.filledInIds?.length);
  console.log(c.title ?? c.id, "filers", f.length, "weighed", wr?.countedWeighed, "filledIn", wr?.filledInIds?.length, "outsideTown", away);
}
console.log({ total, oneOrNone: one, outside });

const c0 = (api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as any[]).find((c) => /assessor/i.test(c.title ?? "") && weighed.get(c.id));
const wr0: any = weighed.get(c0.id);
const town0 = (api.moduleState(ELECTIONS_MODULE_ID).table("town").get("town") as any).townPlaceId;
const dec = api.moduleState(CANDIDACY_MODULE_ID).table("decisions");
let shown = 0;
for (const id of wr0.askedIds) {
  const p: any = api.state.people.get(id);
  if (p.placeId === town0 || shown >= 3) continue;
  shown++;
  console.log("county asker", id, "known", p.knownIds.size, "family", p.familyIds.size, JSON.stringify(dec.get(`${c0.id}:${id}`)).slice(0, 700));
}
console.log("askers by place", wr0.askedIds.map((id: string) => (api.state.people.get(id) as any).placeId === town0 ? "town" : "county").reduce((a: any, k: string) => ({ ...a, [k]: (a[k] ?? 0) + 1 }), {}));
