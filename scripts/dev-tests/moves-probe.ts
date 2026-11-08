// Net counted moves in a drawn place over a year: tsx moves-probe.ts <seed> <purpose> [years]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { vitals } from "./vitals";
setBookkeeping(false);
const [seed = "mv1", purpose = "moves", yearsArg = "1"] = process.argv.slice(2);
const place = drawPlace(seed, purpose);
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const api = coreAPI(w.core);
const v0 = vitals(w.core);
for (let y = 0; y < Number(yearsArg); y++) advanceCore(w.core, addDays(makeIsoDate(w.core.date), 365));
const v1 = vitals(w.core);
const rows = api.moduleState("core2-counted-moves-v1").table("moves").rows() as any[];
const sum = new Map<string, number>();
for (const r of rows) {
  const k = `${r.direction}|${r.direction === "out" ? "to" : "from"} ${String(r.direction === "out" ? r.toPlace : r.fromPlace).slice(0, 30)}`;
  sum.set(k, (sum.get(k) ?? 0) + Number(r.people));
}
const reasons = new Map<string, number>();
for (const r of rows) for (const [k, v] of Object.entries(r.reasons ?? {})) reasons.set(`${r.direction}:${k}`, (reasons.get(`${r.direction}:${k}`) ?? 0) + Number(v) * Number(r.people));
console.log(JSON.stringify({ place: place.name, pop0: Math.round(v0.population), pop1: Math.round(v1.population), flows: Object.fromEntries([...sum].map(([k, v]) => [k, Math.round(v)])), reasonWeight: Object.fromEntries([...reasons].map(([k, v]) => [k, Math.round(v)])) }));
