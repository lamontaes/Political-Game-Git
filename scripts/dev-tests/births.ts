// Counted births and deaths in a drawn town over N years: the engine's own monthly rows, and the population's change.
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { vitals } from "./vitals";
setBookkeeping(true);
const [seed = "bi1", yearsArg = "1", purpose = "births"] = process.argv.slice(2);
const place = drawPlace(seed, purpose);
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const api = coreAPI(w.core);
const v0 = vitals(w.core);
for (let y = 0; y < Number(yearsArg); y++) advanceCore(w.core, addDays(makeIsoDate(w.core.date), 365));
const v1 = vitals(w.core);
const rows = api.moduleState("core2-renewal-v1" as never).table("counts").rows() as any[];
const mine = rows.filter((r) => String(r.placeId ?? r.id).includes(String(w.placeId ?? "")));
const tot = (k: string) => Math.round(rows.reduce((n, r) => n + Number(r[k] ?? 0), 0));
const byPlace = new Map<string, { startPeople: number; births: number; deaths: number; expBirths: number; expDeaths: number }>();
for (const r of rows) {
  const e = byPlace.get(r.placeId) ?? { startPeople: Number(r.startPeople), births: 0, deaths: 0, expBirths: 0, expDeaths: 0 };
  e.births += (r.births ?? []).length; e.deaths += (r.deaths ?? []).length;
  e.expBirths += r.expected?.births ?? 0; e.expDeaths += r.expected?.deaths ?? 0;
  byPlace.set(r.placeId, e);
}
console.log(JSON.stringify({ place: place.name, seed: place.seed, pop0: Math.round(v0.population), pop1: Math.round(v1.population), changePct: Math.round(1000 * (v1.population / v0.population - 1)) / 10, byPlace: [...byPlace].map(([k, v]) => ({ k, ...v })) }));
