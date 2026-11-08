// Why a county race drew nobody: tsx county-zero.ts <seed> <years>
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import { CANDIDACY_MODULE_ID } from "../../src/core2/modules/candidacy";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const [seed = "a1", years = "2"] = process.argv.slice(2);
const place = drawPlace(seed, "elections");
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
advanceCore(w.core, addDays(makeIsoDate(w.core.date), Math.round(Number(years) * 365)));
const api = coreAPI(w.core);
const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as any[];
const results = api.moduleState(VOTING_MODULE_ID).table("results");
const town = (api.moduleState(ELECTIONS_MODULE_ID).table("town").get("town") as any).townPlaceId;
for (const c of contests.filter((c) => c.family === "countyOffice")) {
  const r = results.get(`result:${c.id}`) as any;
  if (!r || Object.keys(r.totals).length) continue;
  const terms = (api.moduleState(OFFICES_MODULE_ID).table("terms").rows() as any[]).filter((t) => t.seatId === c.seatId);
  const wc = api.moduleState(CANDIDACY_MODULE_ID).table("weighed").get(c.id) as any;
  console.log(c.id, c.title, "inc", c.incumbentTermId);
  for (const t of terms) { const p = api.state.people.get(t.personId); console.log("  term", t.status, t.startDate, t.endDate, t.personId, "alive", p?.alive, "inTown", p?.placeId === town); }
  console.log("  weighed", wc && { asked: wc.askedIds.length, run: wc.runIds, counted: wc.countedWeighed, date: wc.date });
  const d = (api.moduleState(CANDIDACY_MODULE_ID).table("decisions").rows() as any[]).filter((x) => x.contestId === c.id && terms.some((t) => t.personId === x.personId));
  console.log("  incumbent decisions", JSON.stringify(d.map((x) => [x.personId, x.run, x.reasons])));
}
