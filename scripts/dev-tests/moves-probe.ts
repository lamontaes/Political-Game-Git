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
console.log(JSON.stringify({ place: place.name, pop0: Math.round(v0.population), pop1: Math.round(v1.population), moveRows: rows.length, keys: Object.keys(rows[0] ?? {}), sample: rows.slice(0, 2) }).slice(0, 2500));
