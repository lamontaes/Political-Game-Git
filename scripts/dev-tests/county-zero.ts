// Why a county race drew nobody: tsx county-zero.ts <seed> <years>
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
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
const contests = api.moduleState("elections").table("contests").rows() as any[];
const results = api.moduleState("core2-voting-v1").table("results");
const town = (api.moduleState("elections").table("town").get("town") as any).townPlaceId;
for (const c of contests.filter((c) => c.family === "countyOffice")) {
  const r = results.get(`result:${c.id}`) as any;
  if (!r || Object.keys(r.totals).length) continue;
  const terms = (api.moduleState("core2-offices-v1").table("terms").rows() as any[]).filter((t) => t.seatId === c.seatId);
  const wc = api.moduleState("candidacy").table("weighed").get(c.id) as any;
  console.log(c.id, c.title, "inc", c.incumbentTermId);
  for (const t of terms) { const p = api.state.people.get(t.personId); console.log("  term", t.status, t.startDate, t.endDate, t.personId, "alive", p?.alive, "inTown", p?.placeId === town); }
  console.log("  weighed", wc && { asked: wc.askedIds.length, run: wc.runIds, counted: wc.countedWeighed, date: wc.date });
  const d = (api.moduleState("candidacy").table("decisions").rows() as any[]).filter((x) => x.contestId === c.id && terms.some((t) => t.personId === x.personId));
  console.log("  incumbent decisions", JSON.stringify(d.map((x) => [x.personId, x.run, x.reasons])));
}
