import { buildBenchWorld } from "../src/bench/world";
import { drawPlace } from "./core2-year/place";
import { setBookkeeping } from "../src/core2/bookkeeping";
import { gameStartDate } from "../src/core2/game-start";
import { addDays, makeIsoDate } from "../src/core2/kernel/dates";
import { advanceCore } from "../src/core2/life";

const seed = "0fc1c044eef41a1c22a597a9d1846533367bca84";
const place = drawPlace(seed, "stories-from-engines");
console.log("place", place.key, place.name, place.seed);
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const { core, director } = world;
let n = 0;
for (const p of core.people.values()) if (p.alive && p.tier !== "husk") { director.watch(core, p.id); n++; }
console.log("watched", n);
const t0 = Date.now();
advanceCore(core, addDays(makeIsoDate(core.date), 5));
console.log("FIVE DAYS ms", Date.now() - t0, "imp", (globalThis as any).__imp, "rescore", (globalThis as any).__resc, "broadScan", (globalThis as any).__broad);
